"use client";

import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from "react";
import { useWebSocket } from "@/context/WebSocketContext";
import { useWeb3 } from "@/context/Web3ContextV4";
import { CallType } from "@/hooks/useCallController";
import { useCallController } from "@/hooks/useCallController";
import { useWebRTCEnhanced, CallState, CallInfo } from "@/hooks/useWebRTCEnhanced";
import IncomingCallBanner from "@/components/IncomingCallBanner";
import InChatCallPopup from "@/components/InChatCallPopup";
import CallScreenV2 from "@/components/CallScreenV2";

interface GlobalCallManagerProps {
  currentRoute?: string; // 'chat' | 'home' | 'settings' | etc
  currentChatAddress?: string | null; // Which chat is open (if any)
  children?: React.ReactNode;
}

interface CallManagerContextValue {
  startCall: (peer: string, callType: CallType, peerName?: string) => Promise<void>;
  callState: CallState;
  callInfo: CallInfo | null;
}

const CallManagerContext = createContext<CallManagerContextValue | null>(null);

export function useCallManager() {
  const context = useContext(CallManagerContext);
  if (!context) {
    throw new Error("useCallManager must be used within a GlobalCallManager provider");
  }
  return context;
}

/**
 * GlobalCallManager - Handles all incoming/outgoing calls globally
 *
 * This component is mounted at the app root level and:
 * - Listens for incoming calls via WebSocket
 * - Shows appropriate popup based on user's current location
 * - Manages call state independently of chat window
 * - Ensures calls are ALWAYS visible regardless of screen
 */
export default function GlobalCallManager({
  currentRoute = "home",
  currentChatAddress = null,
  children,
}: GlobalCallManagerProps) {
  const webSocket = useWebSocket();
  const { account } = useWeb3();

  // Track focus states
  const [isAppFocused, setIsAppFocused] = useState(true);
  const [isChatFocused, setIsChatFocused] = useState(false);

  // Focus tracking
  useEffect(() => {
    const handleFocus = () => setIsAppFocused(true);
    const handleBlur = () => setIsAppFocused(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Update chat focus based on route
  useEffect(() => {
    setIsChatFocused(currentRoute === "chat" && !!currentChatAddress);
  }, [currentRoute, currentChatAddress]);

  // Call controller - manages UI state and popup logic
  const callController = useCallController({
    socket: webSocket?.socket || null,
    userAddress: account,
    currentChatAddress: currentChatAddress || "",
    isChatFocused,
    isAppFocused,
  });

  // WebRTC - manages actual call connection
  const {
    callState: webrtcCallState,
    callInfo: webrtcCallInfo,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    callDuration,
    isReconnecting,
    localStream,
    remoteStream,
    answerCall: webrtcAnswerCall,
    rejectCall: webrtcRejectCall,
    endCall: webrtcEndCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
    startCall: webrtcStartCall,
  } = useWebRTCEnhanced({
    socket: webSocket?.socket || null,
    userAddress: account,
  });

  // Unified startCall function that updates both controller and WebRTC
  const startCall = useCallback(
    async (peer: string, callType: CallType, peerName?: string) => {
      console.log("📞 [GlobalCallManager] Starting call:", { peer, callType, peerName });
      
      // Start call controller (UI state)
      callController.startCall(peer, callType, peerName);
      
      // Start WebRTC connection
      try {
        await webrtcStartCall(peer, callType);
      } catch (error) {
        console.error("❌ [GlobalCallManager] Failed to start call:", error);
        callController.endCall();
      }
    },
    [callController, webrtcStartCall]
  );

  const contextValue = useMemo(
    () => ({
      startCall,
      callState: webrtcCallState,
      callInfo: webrtcCallInfo,
    }),
    [startCall, webrtcCallState, webrtcCallInfo]
  );

  // Determine which popup to show based on location and call state
  const shouldShowInChatPopup =
    callController.popupVariant === "in-chat" &&
    callController.callState === "ringing";

  const shouldShowGlobalBanner =
    callController.popupVariant === "global-banner" &&
    callController.callState === "ringing";

  const shouldShowCallScreen =
    webrtcCallState === "incoming" ||
    webrtcCallState === "calling" ||
    webrtcCallState === "connecting" ||
    webrtcCallState === "connected" ||
    webrtcCallState === "ended";

  // Handle accept call
  const handleAccept = async () => {
    console.log("📞 [GlobalCallManager] Accepting call...");
    console.log("  - Controller state:", callController.callState);
    console.log("  - WebRTC state:", webrtcCallState);
    console.log("  - Call info:", callController.callInfo);

    // Call controller handles UI cleanup
    callController.acceptCall();

    // WebRTC handles connection (it already received incoming-call event)
    await webrtcAnswerCall();

    console.log("✅ [GlobalCallManager] Call accepted");
  };

  // Handle reject call
  const handleReject = () => {
    console.log("❌ Rejecting call...");
    callController.rejectCall();
    webrtcRejectCall();
  };

  // Handle end call
  const handleEndCall = () => {
    console.log("📴 Ending call...");
    webrtcEndCall();
    callController.endCall();
  };

  return (
    <CallManagerContext.Provider value={contextValue}>
      <>
        {/* In-Chat Popup - Shows when in any chat during incoming call */}
        <InChatCallPopup
        isOpen={shouldShowInChatPopup}
        callerName={
          callController.callInfo?.peerName ||
          callController.callInfo?.peer ||
          "Unknown"
        }
        callerAddress={callController.callInfo?.peer || ""}
        callType={callController.callInfo?.type || "voice"}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Global Banner - Shows when NOT in any chat or app not focused */}
      <IncomingCallBanner
        isOpen={shouldShowGlobalBanner}
        callerName={
          callController.callInfo?.peerName ||
          callController.callInfo?.peer ||
          "Unknown"
        }
        callerAddress={callController.callInfo?.peer || ""}
        callType={callController.callInfo?.type || "voice"}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Active Call Screen - Shows during active call */}
      <CallScreenV2
        isOpen={shouldShowCallScreen}
        callState={webrtcCallState}
        callType={
          webrtcCallInfo?.type || callController.callInfo?.type || "video"
        }
        peerAddress={
          webrtcCallInfo?.peer || callController.callInfo?.peer || ""
        }
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isSpeakerOn={isSpeakerOn}
        callDuration={callDuration}
        isReconnecting={isReconnecting}
        localStream={localStream}
        remoteStream={remoteStream}
        onEndCall={handleEndCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
        onSwitchCamera={switchCamera}
      />

        {children}
      </>
    </CallManagerContext.Provider>
  );
}
