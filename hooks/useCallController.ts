"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";

export type CallState =
  | "idle"
  | "ringing"
  | "calling"
  | "connecting"
  | "connected"
  | "ended";

export type CallType = "voice" | "video";

export interface CallInfo {
  callId: string;
  peer: string;
  peerName?: string;
  type: CallType;
  direction: "incoming" | "outgoing";
  timestamp: number;
  offer?: RTCSessionDescriptionInit; // Store offer for WebRTC
}

export type PopupVariant = "none" | "in-chat" | "global-banner";

export interface CallControllerState {
  callState: CallState;
  callInfo: CallInfo | null;
  popupVariant: PopupVariant;
  isRingtoneActive: boolean;
  isBusy: boolean;
}

interface UseCallControllerProps {
  socket: Socket | null;
  userAddress: string | null;
  currentChatAddress: string | null;
  isChatFocused: boolean;
  isAppFocused: boolean;
  onNavigateToChat?: (address: string) => void;
}

export function useCallController({
  socket,
  userAddress,
  currentChatAddress,
  isChatFocused,
  isAppFocused,
  onNavigateToChat,
}: UseCallControllerProps) {
  const [state, setState] = useState<CallControllerState>({
    callState: "idle",
    callInfo: null,
    popupVariant: "none",
    isRingtoneActive: false,
    isBusy: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallIdRef = useRef<string | null>(null);
  const callIdDebounceRef = useRef<Map<string, number>>(new Map());

  // Initialize ringtone audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.src = createRingtoneDataURI();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Start ringtone
  const startRingtone = useCallback(() => {
    if (audioRef.current && !state.isRingtoneActive) {
      console.log("🔔 Starting ringtone");
      audioRef.current.play().catch((err) => {
        console.warn("⚠️ Ringtone play failed:", err);
      });
      setState((prev) => ({ ...prev, isRingtoneActive: true }));
    }
  }, [state.isRingtoneActive]);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (audioRef.current) {
      console.log("🔕 Stopping ringtone");
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState((prev) => ({ ...prev, isRingtoneActive: false }));
    }
  }, []);

  // Clear call timeout
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // Determine popup variant based on context
  const determinePopupVariant = useCallback(
    (callerAddress: string): PopupVariant => {
      // If not in app or app not focused → global banner
      if (!isAppFocused) {
        console.log("📱 App not focused → global banner");
        return "global-banner";
      }

      // If in caller's chat and focused → in-chat popup
      if (
        currentChatAddress?.toLowerCase() === callerAddress.toLowerCase() &&
        isChatFocused
      ) {
        console.log("💬 In caller's chat → in-chat popup");
        return "in-chat";
      }

      // If in another chat → in-chat popup (will show in current chat header)
      if (currentChatAddress && isChatFocused) {
        console.log("💬 In another chat → in-chat popup");
        return "in-chat";
      }

      // Default to global banner
      console.log("🌍 Default → global banner");
      return "global-banner";
    },
    [isAppFocused, currentChatAddress, isChatFocused]
  );

  // Handle call timeout
  const handleCallTimeout = useCallback(
    (callId: string) => {
      if (lastCallIdRef.current === callId && state.callState === "ringing") {
        console.log("📵 Call timed out");
        stopRingtone();
        clearCallTimeout();

        // Send timeout to server
        socket?.emit("call-timeout", { callId });

        // Log missed call
        if (state.callInfo) {
          console.log("📝 Logging missed call from:", state.callInfo.peer);
          // TODO: Add to missed calls list in storage
        }

        // Reset state
        setState({
          callState: "idle",
          callInfo: null,
          popupVariant: "none",
          isRingtoneActive: false,
          isBusy: false,
        });
      }
    },
    [state.callState, state.callInfo, socket, stopRingtone, clearCallTimeout]
  );

  // Handle incoming call
  const handleIncomingCall = useCallback(
    (data: {
      caller: string;
      offer: RTCSessionDescriptionInit;
      callType: CallType;
      callerName?: string;
    }) => {
      console.log("📞 [CallController] Incoming call from:", data.caller);

      // Generate unique call ID
      const callId = `call-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = Date.now();

      // Check if already in a call
      if (state.callState !== "idle") {
        console.log("📵 Already in a call, sending busy signal");
        socket?.emit("call-busy", { to: data.caller });
        return;
      }

      // Debounce duplicate calls from same caller within 1 second
      const lastTime = callIdDebounceRef.current.get(data.caller);
      if (lastTime && now - lastTime < 1000) {
        console.log("⚠️ Duplicate call ignored (debounced)");
        return;
      }
      callIdDebounceRef.current.set(data.caller, now);

      // Determine popup variant based on current context
      const variant = determinePopupVariant(data.caller);
      console.log("🎯 Popup variant:", variant);

      // Create call info (store offer for WebRTC)
      const callInfo: CallInfo = {
        callId,
        peer: data.caller,
        peerName: data.callerName,
        type: data.callType,
        direction: "incoming",
        timestamp: now,
        offer: data.offer, // Store offer data
      };

      // Update state - this triggers UI rendering
      setState({
        callState: "ringing",
        callInfo,
        popupVariant: variant,
        isRingtoneActive: false,
        isBusy: false,
      });

      lastCallIdRef.current = callId;

      // Start ringtone
      console.log("🔔 Starting ringtone...");
      startRingtone();

      // Set timeout for missed call (30 seconds)
      clearCallTimeout();
      callTimeoutRef.current = setTimeout(() => {
        console.log("⏱️ Call timeout - marking as missed");
        handleCallTimeout(callId);
      }, 30000);

      // Show OS notification if app not focused
      if (
        !isAppFocused &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Incoming Call", {
          body: `${data.callerName || data.caller.slice(0, 10)} is calling...`,
          icon: "/icon.png",
          tag: callId,
        });
      }
    },
    [
      state.callState,
      socket,
      determinePopupVariant,
      isAppFocused,
      startRingtone,
      clearCallTimeout,
      handleCallTimeout,
    ]
  );

  // Handle call cancel
  const handleCallCancel = useCallback(
    (data: { callId: string; caller: string }) => {
      console.log("❌ Call cancelled by caller:", data.callId);

      if (lastCallIdRef.current === data.callId) {
        stopRingtone();
        clearCallTimeout();

        setState({
          callState: "idle",
          callInfo: null,
          popupVariant: "none",
          isRingtoneActive: false,
          isBusy: false,
        });

        // Show toast
        console.log("🔔 Call cancelled");
      }
    },
    [stopRingtone, clearCallTimeout]
  );

  // Accept call
  const acceptCall = useCallback(() => {
    console.log("✅ Accepting call");

    if (!state.callInfo) {
      console.error("❌ No call info to accept");
      return;
    }

    stopRingtone();
    clearCallTimeout();

    // If in another chat, navigate to caller's chat
    if (
      state.popupVariant === "in-chat" &&
      currentChatAddress?.toLowerCase() !== state.callInfo.peer.toLowerCase() &&
      onNavigateToChat
    ) {
      console.log("📍 Navigating to caller's chat");
      onNavigateToChat(state.callInfo.peer);
    }

    // Update state to connecting
    setState((prev) => ({
      ...prev,
      callState: "connecting",
      popupVariant: "none",
    }));

    // Emit accept to server (WebRTC hook will handle the rest)
    socket?.emit("call-accept", {
      callId: state.callInfo.callId,
      caller: state.callInfo.peer,
    });
  }, [
    state.callInfo,
    state.popupVariant,
    currentChatAddress,
    socket,
    stopRingtone,
    clearCallTimeout,
    onNavigateToChat,
  ]);

  // Reject call
  const rejectCall = useCallback(() => {
    console.log("❌ Rejecting call");

    if (!state.callInfo) {
      console.error("❌ No call info to reject");
      return;
    }

    stopRingtone();
    clearCallTimeout();

    // Emit reject to server
    socket?.emit("call-reject", {
      callId: state.callInfo.callId,
      caller: state.callInfo.peer,
    });

    // Reset state
    setState({
      callState: "idle",
      callInfo: null,
      popupVariant: "none",
      isRingtoneActive: false,
      isBusy: false,
    });
  }, [state.callInfo, socket, stopRingtone, clearCallTimeout]);

  // Start outgoing call
  const startCall = useCallback(
    (targetAddress: string, callType: CallType, targetName?: string) => {
      console.log("📞 Starting outgoing call to:", targetAddress);

      if (state.callState !== "idle") {
        console.warn("⚠️ Already in a call");
        return;
      }

      const callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const callInfo: CallInfo = {
        callId,
        peer: targetAddress,
        peerName: targetName,
        type: callType,
        direction: "outgoing",
        timestamp: Date.now(),
      };

      setState({
        callState: "calling",
        callInfo,
        popupVariant: "none",
        isRingtoneActive: false,
        isBusy: false,
      });

      lastCallIdRef.current = callId;

      // WebRTC hook will emit call-offer
    },
    [state.callState]
  );

  // End call
  const endCall = useCallback(() => {
    console.log("📴 Ending call");

    stopRingtone();
    clearCallTimeout();

    if (state.callInfo) {
      socket?.emit("call-end", {
        callId: state.callInfo.callId,
        peer: state.callInfo.peer,
      });
    }

    setState({
      callState: "idle",
      callInfo: null,
      popupVariant: "none",
      isRingtoneActive: false,
      isBusy: false,
    });

    lastCallIdRef.current = null;
  }, [state.callInfo, socket, stopRingtone, clearCallTimeout]);

  // Update call state (for WebRTC hook integration)
  const updateCallState = useCallback((newState: CallState) => {
    setState((prev) => ({ ...prev, callState: newState }));
  }, []);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-cancel", handleCallCancel);
    socket.on("call-busy", () => {
      console.log("📵 Peer is busy");
      setState((prev) => ({ ...prev, isBusy: true }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, isBusy: false }));
      }, 3000);
    });

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-cancel", handleCallCancel);
      socket.off("call-busy");
    };
  }, [socket, handleIncomingCall, handleCallCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      clearCallTimeout();
    };
  }, [stopRingtone, clearCallTimeout]);

  return {
    ...state,
    acceptCall,
    rejectCall,
    startCall,
    endCall,
    updateCallState,
  };
}

// Helper: Create ringtone data URI
function createRingtoneDataURI(): string {
  const sampleRate = 44100;
  const duration = 1;
  const frequency = 800;
  const samples = sampleRate * duration;

  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t) * 0.3 * 32767;
    view.setInt16(44 + i * 2, value, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
