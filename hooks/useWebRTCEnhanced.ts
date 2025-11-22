import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected"
  | "ended";
export type CallType = "voice" | "video";

interface CallInfo {
  peer: string;
  type: CallType;
}

interface UseWebRTCEnhancedProps {
  socket: Socket | null;
  userAddress: string | null;
}

export const useWebRTCEnhanced = ({
  socket,
  userAddress,
}: UseWebRTCEnhancedProps) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const callStartTime = useRef<number | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingICECandidates = useRef<RTCIceCandidate[]>([]);

  const iceServersRef = useRef<RTCConfiguration>({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  });

  const startDurationTimer = useCallback(() => {
    callStartTime.current = Date.now();
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(
          Math.floor((Date.now() - callStartTime.current) / 1000)
        );
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    callStartTime.current = null;
    setCallDuration(0);
  }, []);

  const getMediaStream = useCallback(
    async (callType: CallType): Promise<MediaStream | null> => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            callType === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }
              : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream.current = stream;
        console.log(
          "✅ Got media stream:",
          callType,
          "tracks:",
          stream.getTracks().length
        );
        return stream;
      } catch (error) {
        console.error("❌ Failed to get media stream:", error);
        alert(
          callType === "video"
            ? "Please allow camera and microphone access to make video calls"
            : "Please allow microphone access to make voice calls"
        );
        return null;
      }
    },
    []
  );

  const createPeerConnection = useCallback(
    (peer: string) => {
      if (peerConnection.current) {
        console.log("⚠️ PeerConnection already exists, reusing it");
        return peerConnection.current;
      }

      console.log("🔧 Creating new PeerConnection for peer:", peer);
      const pc = new RTCPeerConnection(iceServersRef.current);
      peerConnection.current = pc;

      if (localStream.current) {
        console.log("➕ Adding local tracks to PeerConnection");
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!);
          console.log("  ✅ Added track:", track.kind, track.id);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("🧊 Local ICE candidate:", event.candidate.type);
          if (socket && pc.remoteDescription) {
            socket.emit("ice-candidate", {
              recipient: peer,
              candidate: event.candidate,
            });
            console.log("📤 Sent ICE candidate to peer");
          } else {
            console.log("⏳ Queuing ICE candidate (no remote description yet)");
          }
        } else {
          console.log("🧊 ICE gathering complete");
        }
      };

      pc.ontrack = (event) => {
        console.log(
          "📥 Received remote track:",
          event.track.kind,
          event.track.id
        );
        if (!remoteStream.current) {
          remoteStream.current = new MediaStream();
          console.log("🎥 Created remote stream");
        }
        remoteStream.current.addTrack(event.track);
        console.log("✅ Added remote track to stream");
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          console.log("✅ Call connected!");
          setCallState("connected");
          setIsReconnecting(false);
          startDurationTimer();
        } else if (pc.connectionState === "disconnected") {
          console.log("⚠️ Connection disconnected, attempting reconnect...");
          setIsReconnecting(true);
        } else if (pc.connectionState === "failed") {
          console.log("❌ Connection failed");
        } else if (pc.connectionState === "closed") {
          console.log("🔒 Connection closed");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection state:", pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log("🧊 ICE gathering state:", pc.iceGatheringState);
      };

      return pc;
    },
    [socket, startDurationTimer]
  );

  const startCall = useCallback(
    async (peer: string, type: CallType) => {
      if (!socket || !userAddress || callState !== "idle") {
        console.warn("❌ Cannot start call:", {
          socket: !!socket,
          userAddress,
          callState,
        });
        return;
      }

      console.log("📞 Starting", type, "call to:", peer);

      const stream = await getMediaStream(type);
      if (!stream) {
        console.error("❌ Failed to get media stream");
        return;
      }

      setCallState("calling");
      setCallInfo({ peer, type });

      const pc = createPeerConnection(peer);

      try {
        console.log("📝 Creating offer...");
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
        console.log("✅ Offer created");

        console.log("📝 Setting local description...");
        await pc.setLocalDescription(offer);
        console.log("✅ Local description set:", pc.localDescription?.type);

        console.log("📤 Sending offer to peer...");
        socket.emit("call-offer", {
          recipient: peer,
          offer: pc.localDescription,
          callType: type,
        });
        console.log("✅ Offer sent");
      } catch (error) {
        console.error("❌ Failed to create offer:", error);
        endCall();
      }
    },
    [socket, userAddress, callState, getMediaStream, createPeerConnection]
  );

  const answerCall = useCallback(async () => {
    if (!socket || !callInfo || callState !== "incoming") {
      console.warn("❌ Cannot answer call:", {
        socket: !!socket,
        callInfo,
        callState,
      });
      return;
    }

    console.log("✅ Answering", callInfo.type, "call from:", callInfo.peer);

    const stream = await getMediaStream(callInfo.type);
    if (!stream) {
      console.error("❌ Failed to get media stream");
      return;
    }

    console.log("📝 Current peer connection exists:", !!peerConnection.current);

    const pc = peerConnection.current;
    if (!pc) {
      console.error("❌ No peer connection exists");
      return;
    }

    console.log("➕ Adding our tracks to peer connection...");
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
        console.log("  ✅ Added track:", track.kind, track.id);
      });
    }

    try {
      console.log(
        "🧊 Processing",
        pendingICECandidates.current.length,
        "pending ICE candidates..."
      );
      for (const candidate of pendingICECandidates.current) {
        await pc.addIceCandidate(candidate);
        console.log("  ✅ Added ICE candidate");
      }
      pendingICECandidates.current = [];

      console.log("📝 Creating answer...");
      const answer = await pc.createAnswer();
      console.log("✅ Answer created");

      console.log("📝 Setting local description...");
      await pc.setLocalDescription(answer);
      console.log("✅ Local description set:", pc.localDescription?.type);

      console.log("📤 Sending answer to peer...");
      socket.emit("call-answer", {
        caller: callInfo.peer,
        answer: pc.localDescription,
      });
      console.log("✅ Answer sent");

      setCallState("connecting");
    } catch (error) {
      console.error("❌ Failed to answer call:", error);
      endCall();
    }
  }, [socket, callInfo, callState, getMediaStream]);

  const rejectCall = useCallback(() => {
    if (!socket || !callInfo || callState !== "incoming") return;

    socket.emit("call-reject", {
      caller: callInfo.peer,
    });

    setCallState("idle");
    setCallInfo(null);
  }, [socket, callInfo, callState]);

  const endCall = useCallback(() => {
    console.log("☎️ Ending call...");

    stopDurationTimer();

    if (peerConnection.current) {
      console.log("🔒 Closing peer connection...");
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      console.log("🛑 Stopping local media tracks...");
      localStream.current.getTracks().forEach((track) => {
        track.stop();
        console.log("  Stopped:", track.kind);
      });
      localStream.current = null;
    }

    remoteStream.current = null;

    if (socket && callInfo && callState !== "idle" && callState !== "ended") {
      console.log("📤 Sending call-end signal to peer...");
      socket.emit("call-end", {
        recipient: callInfo.peer,
      });
    }

    setCallState("ended");
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsSpeakerOn(false);
    setIsReconnecting(false);
    pendingICECandidates.current = [];

    console.log("⏳ Transitioning to idle in 2 seconds...");
    setTimeout(() => {
      setCallState("idle");
      setCallInfo(null);
      console.log("✅ Call ended, back to idle");
    }, 2000);
  }, [socket, callInfo, callState, stopDurationTimer]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!localStream.current || callInfo?.type !== "video") return;

    try {
      const videoTrack = localStream.current.getVideoTracks()[0];
      const currentFacingMode = videoTrack.getSettings().facingMode || "user";
      const newFacingMode =
        currentFacingMode === "user" ? "environment" : "user";

      videoTrack.stop();

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnection.current) {
        const sender = peerConnection.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      localStream.current.removeTrack(videoTrack);
      localStream.current.addTrack(newVideoTrack);
    } catch (error) {
      console.error("Failed to switch camera:", error);
    }
  }, [callInfo]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!socket || !userAddress) return;

    const handleIncomingCall = async (data: {
      caller: string;
      offer: RTCSessionDescriptionInit;
      callType: CallType;
    }) => {
      console.log(
        "📞 Incoming call from:",
        data.caller,
        "type:",
        data.callType
      );

      if (callState !== "idle") {
        console.log("📵 Already in a call, sending busy signal");
        socket.emit("call-busy", { caller: data.caller });
        return;
      }

      setCallState("incoming");
      setCallInfo({ peer: data.caller, type: data.callType });

      console.log("🔧 Creating peer connection for incoming call...");
      const pc = createPeerConnection(data.caller);

      try {
        console.log("📝 Setting remote description (offer)...");
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log("✅ Remote description set:", pc.remoteDescription?.type);
      } catch (error) {
        console.error("❌ Failed to set remote description:", error);
      }
    };

    const handleCallAnswered = async (data: {
      answerer: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log("✅ Call answered by:", data.answerer);

      const pc = peerConnection.current;
      if (!pc) {
        console.error("❌ No peer connection exists when answer received");
        return;
      }

      if (callState !== "calling") {
        console.warn("⚠️ Not in calling state, current state:", callState);
        return;
      }

      try {
        console.log("📝 Setting remote description (answer)...");
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log("✅ Remote description set:", pc.remoteDescription?.type);

        setCallState("connecting");
        console.log("🔗 State changed to connecting");
      } catch (error) {
        console.error("❌ Failed to set remote description:", error);
        endCall();
      }
    };

    const handleICECandidate = async (data: {
      sender: string;
      candidate: RTCIceCandidateInit;
    }) => {
      console.log("🧊 Received ICE candidate from:", data.sender);

      const pc = peerConnection.current;
      if (!pc) {
        console.warn("⚠️ No peer connection exists, ignoring ICE candidate");
        return;
      }

      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          console.log("➕ Adding ICE candidate (remote description exists)");
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log("✅ ICE candidate added");
        } else {
          console.log("⏳ Queuing ICE candidate (no remote description yet)");
          pendingICECandidates.current.push(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (error) {
        console.error("❌ Failed to add ICE candidate:", error);
      }
    };

    const handleCallEnded = () => {
      console.log("📵 Call ended by peer");
      endCall();
    };

    const handleCallRejected = () => {
      console.log("❌ Call rejected by peer");
      endCall();
    };

    const handleCallBusy = () => {
      console.log("📵 Peer is busy");
      alert("User is currently on another call");
      endCall();
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleICECandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-busy", handleCallBusy);

    console.log("✅ WebSocket event listeners registered");

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleICECandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-busy", handleCallBusy);
      console.log("🔌 WebSocket event listeners unregistered");
    };
  }, [socket, userAddress, callState, createPeerConnection, endCall]);

  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }
    };
  }, [stopDurationTimer]);

  return {
    callState,
    callInfo,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    callDuration,
    isReconnecting,
    localStream: localStream.current,
    remoteStream: remoteStream.current,

    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
  };
};
