"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  Camera,
  Loader,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CallState } from "@/hooks/useWebRTCEnhanced";

interface CallScreenV2Props {
  isOpen: boolean;
  callState: CallState;
  callType: "voice" | "video";
  peerAddress: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
  isReconnecting: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera: () => void;
}

export default function CallScreenV2({
  isOpen,
  callState,
  callType,
  peerAddress,
  isMuted,
  isVideoEnabled,
  isSpeakerOn,
  callDuration,
  isReconnecting,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
}: CallScreenV2Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [showControls, setShowControls] = useState(true);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Format address
  const formatAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream && callType === "video") {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType]);

  // Set up remote video/audio
  useEffect(() => {
    if (remoteStream) {
      console.log(
        "🎵 [CallScreen] Setting up remote stream, tracks:",
        remoteStream.getTracks().map((t) => `${t.kind}:${t.enabled}`)
      );

      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log("📹 [CallScreen] Remote video element configured");
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = 1.0; // Full volume
        remoteAudioRef.current.muted = false; // Ensure not muted

        // Force play audio
        remoteAudioRef.current
          .play()
          .then(() => {
            console.log("🔊 [CallScreen] Remote audio playing successfully");
          })
          .catch((err) => {
            console.error("❌ [CallScreen] Failed to play remote audio:", err);
          });
      }
    }
  }, [remoteStream, callType]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;
    const timeout = setTimeout(() => {
      if (callState === "connected") {
        setShowControls(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [showControls, callState]);

  if (!isOpen) return null;

  const isConnected = callState === "connected";
  const isConnecting = callState === "calling" || callState === "connecting";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 z-50 flex flex-col"
      onMouseMove={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: showControls ? 0 : -100 }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-xl p-6 border-b border-white/5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {formatAddress(peerAddress)}
            </h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              {isConnecting && (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              )}
              {isReconnecting && (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Reconnecting...</span>
                </>
              )}
              {isConnected && !isReconnecting && (
                <span className="font-mono">
                  {formatDuration(callDuration)}
                </span>
              )}
              {callState === "ended" && <span>Call Ended</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {callType === "video" ? (
              <VideoIcon className="w-5 h-5 text-green-400" />
            ) : (
              <Phone className="w-5 h-5 text-green-400" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Video Display (for video calls) */}
      {callType === "video" ? (
        <div className="flex-1 relative">
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Remote Video Placeholder */}
          {(!remoteStream || !isConnected) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 mx-auto border-2 border-purple-500/50">
                  <span className="text-4xl font-bold text-white">
                    {peerAddress?.slice(2, 4).toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400">
                  {isConnecting ? "Connecting..." : "Waiting for video..."}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (Small Floating) */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute top-20 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
          >
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        /* Voice Call UI */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{
                scale: isConnected ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isConnected ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="relative mb-8"
            >
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border-4 border-purple-500/50 shadow-2xl shadow-purple-500/30">
                <span className="text-6xl font-bold text-white">
                  {peerAddress?.slice(2, 4).toUpperCase()}
                </span>
              </div>

              {/* Pulse rings for connected state */}
              {isConnected && (
                <>
                  <motion.div
                    animate={{
                      scale: [1, 1.3],
                      opacity: [0.5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full border-4 border-purple-500/50"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.3],
                      opacity: [0.5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 1,
                    }}
                    className="absolute inset-0 rounded-full border-4 border-purple-500/50"
                  />
                </>
              )}
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              {formatAddress(peerAddress)}
            </h2>
            <p className="text-gray-400 text-lg">
              {isConnecting && "Calling..."}
              {isReconnecting && "Reconnecting..."}
              {isConnected && !isReconnecting && formatDuration(callDuration)}
              {callState === "ended" && "Call Ended"}
            </p>
          </div>
        </div>
      )}

      {/* Hidden Audio Element for remote audio (both voice and video calls) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* Controls */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: showControls || callState !== "connected" ? 0 : 100 }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-xl p-8 border-t border-white/5"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute/Unmute */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isMuted
                ? "bg-red-500 shadow-lg shadow-red-500/50"
                : "bg-gray-700/80 hover:bg-gray-600/80"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* Video On/Off (Video calls only) */}
          {callType === "video" && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  !isVideoEnabled
                    ? "bg-red-500 shadow-lg shadow-red-500/50"
                    : "bg-gray-700/80 hover:bg-gray-600/80"
                }`}
              >
                {isVideoEnabled ? (
                  <VideoIcon className="w-6 h-6 text-white" />
                ) : (
                  <VideoOff className="w-6 h-6 text-white" />
                )}
              </motion.button>

              {/* Switch Camera */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSwitchCamera}
                className="w-14 h-14 rounded-full bg-gray-700/80 hover:bg-gray-600/80 flex items-center justify-center transition-all duration-300"
              >
                <Camera className="w-6 h-6 text-white" />
              </motion.button>
            </>
          )}

          {/* Speaker Toggle (Voice calls only) */}
          {callType === "voice" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleSpeaker}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isSpeakerOn
                  ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                  : "bg-gray-700/80 hover:bg-gray-600/80"
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : (
                <VolumeX className="w-6 h-6 text-white" />
              )}
            </motion.button>
          )}

          {/* End Call */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50 flex items-center justify-center transition-all duration-300 hover:shadow-red-500/70"
          >
            <Phone className="w-7 h-7 text-white rotate-[135deg]" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
