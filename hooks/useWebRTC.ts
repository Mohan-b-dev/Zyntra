"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallType = "voice" | "video";
export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface UseWebRTCReturn {
  // Call state
  callStatus: CallStatus;
  callType: CallType | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  incomingCall: { caller: string; callType: CallType } | null;

  // Call actions
  startCall: (recipient: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

export const useWebRTC = (
  socket: Socket | null,
  walletAddress: string | null
): UseWebRTCReturn => {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{
    caller: string;
    callType: CallType;
  } | null>(null);
  const [currentRecipient, setCurrentRecipient] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Start call timer
  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Get user media
  const getUserMedia = useCallback(
    async (type: CallType, facing: "user" | "environment" = "user") => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video:
            type === "video"
              ? {
                  facingMode: facing,
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        return stream;
      } catch (error) {
        console.error("❌ [WebRTC] Error getting user media:", error);
        throw error;
      }
    },
    []
  );

  // Create peer connection
  const createPeerConnection = useCallback(
    (recipient: string) => {
      const pc = new RTCPeerConnection(configuration);

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log("🧊 [WebRTC] Sending ICE candidate");
          socket.emit("ice-candidate", {
            recipient,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log("📺 [WebRTC] Received remote track");
        setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 [WebRTC] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          startCallTimer();
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          endCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [socket, startCallTimer]
  );

  // Start call
  const startCall = useCallback(
    async (recipient: string, type: CallType) => {
      if (!socket || !walletAddress) return;

      try {
        console.log(`📞 [WebRTC] Starting ${type} call to:`, recipient);
        setCallStatus("calling");
        setCallType(type);
        setCurrentRecipient(recipient);

        const stream = await getUserMedia(type);
        const pc = createPeerConnection(recipient);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call-offer", {
          recipient,
          offer: pc.localDescription,
          callType: type,
        });
      } catch (error) {
        console.error("❌ [WebRTC] Error starting call:", error);
        endCall();
      }
    },
    [socket, walletAddress, getUserMedia, createPeerConnection]
  );

  // Answer call
  const answerCall = useCallback(async () => {
    if (!incomingCall || !socket || !walletAddress) return;

    try {
      console.log("📞 [WebRTC] Answering call from:", incomingCall.caller);
      setCallStatus("connected");
      setCallType(incomingCall.callType);
      setCurrentRecipient(incomingCall.caller);

      const stream = await getUserMedia(incomingCall.callType);
      const pc = createPeerConnection(incomingCall.caller);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      setIncomingCall(null);
    } catch (error) {
      console.error("❌ [WebRTC] Error answering call:", error);
      endCall();
    }
  }, [incomingCall, socket, walletAddress, getUserMedia, createPeerConnection]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;

    console.log("❌ [WebRTC] Rejecting call from:", incomingCall.caller);
    socket.emit("call-reject", { caller: incomingCall.caller });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  // End call
  const endCall = useCallback(() => {
    console.log("🔚 [WebRTC] Ending call");

    if (socket && currentRecipient) {
      socket.emit("call-end", { recipient: currentRecipient });
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    stopCallTimer();
    setCallStatus("idle");
    setCallType(null);
    setCurrentRecipient(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [socket, currentRecipient, localStream, remoteStream, stopCallTimer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      console.log("🔇 [WebRTC] Mute:", !audioTrack.enabled);
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (!localStream || callType !== "video") return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
      console.log("📹 [WebRTC] Video off:", !videoTrack.enabled);
    }
  }, [localStream, callType]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!localStream || callType !== "video") return;

    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";

      // Stop current video track
      localStream.getVideoTracks().forEach((track) => track.stop());

      // Get new stream with switched camera
      const newStream = await getUserMedia("video", newFacingMode);

      // Replace video track in peer connection
      if (peerConnectionRef.current) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }

      setFacingMode(newFacingMode);
      setLocalStream(newStream);
      console.log("📸 [WebRTC] Camera switched to:", newFacingMode);
    } catch (error) {
      console.error("❌ [WebRTC] Error switching camera:", error);
    }
  }, [localStream, callType, facingMode, getUserMedia]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    socket.on(
      "incoming-call",
      async (data: {
        caller: string;
        offer: RTCSessionDescriptionInit;
        callType: CallType;
      }) => {
        console.log(
          "📞 [WebRTC] Incoming call from:",
          data.caller,
          "Type:",
          data.callType
        );
        setIncomingCall({ caller: data.caller, callType: data.callType });
        setCallStatus("ringing");

        const pc = createPeerConnection(data.caller);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      }
    );

    // Call answered
    socket.on(
      "call-answered",
      async (data: { answerer: string; answer: RTCSessionDescriptionInit }) => {
        console.log("✅ [WebRTC] Call answered by:", data.answerer);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    );

    // ICE candidate
    socket.on(
      "ice-candidate",
      async (data: { sender: string; candidate: RTCIceCandidateInit }) => {
        console.log("🧊 [WebRTC] Received ICE candidate from:", data.sender);
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (error) {
            console.error("❌ [WebRTC] Error adding ICE candidate:", error);
          }
        }
      }
    );

    // Call ended
    socket.on("call-ended", (data: { caller: string }) => {
      console.log("🔚 [WebRTC] Call ended by:", data.caller);
      endCall();
    });

    // Call rejected
    socket.on("call-rejected", (data: { recipient: string }) => {
      console.log("❌ [WebRTC] Call rejected by:", data.recipient);
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
      socket.off("call-rejected");
    };
  }, [socket, createPeerConnection, endCall]);

  // Complete answer flow
  useEffect(() => {
    if (
      callStatus === "connected" &&
      incomingCall &&
      peerConnectionRef.current &&
      socket
    ) {
      (async () => {
        try {
          const answer = await peerConnectionRef.current!.createAnswer();
          await peerConnectionRef.current!.setLocalDescription(answer);

          socket.emit("call-answer", {
            caller: incomingCall.caller,
            answer: peerConnectionRef.current!.localDescription,
          });
        } catch (error) {
          console.error("❌ [WebRTC] Error creating answer:", error);
        }
      })();
    }
  }, [callStatus, incomingCall, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    callStatus,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
};
