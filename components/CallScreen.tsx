"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  PhoneOff,
} from "lucide-react";

interface CallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: "voice" | "video";
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
  remoteName?: string;
  remoteAddress: string;
}

export default function CallScreen({
  localStream,
  remoteStream,
  callType,
  isMuted,
  isVideoEnabled,
  callDuration,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
  remoteName,
  remoteAddress,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Setup local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Format call duration (MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
    >
      {/* Remote video/audio stream */}
      <div className="relative w-full h-full">
        {callType === "video" && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          // Voice call or waiting for video
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              {/* Avatar placeholder */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mx-auto mb-6 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-bold text-white shadow-lg shadow-indigo-500/50"
              >
                {remoteName?.[0]?.toUpperCase() || "?"}
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {remoteName || "Unknown User"}
              </h2>
              <p className="text-gray-400 font-mono text-sm">
                {remoteAddress.slice(0, 6)}...{remoteAddress.slice(-4)}
              </p>
            </div>
          </div>
        )}

        {/* Top bar - Call info */}
        <div className="absolute top-0 left-0 right-0 p-6">
          <div className="glass-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {remoteName || "Unknown User"}
                </h3>
                <p className="text-sm text-gray-400 font-mono">
                  {remoteAddress.slice(0, 6)}...{remoteAddress.slice(-4)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-white font-mono text-lg">
                  {formatDuration(callDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Local video preview (bottom right) */}
        {callType === "video" && localStream && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-24 right-6 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
          >
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror local video
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </motion.div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="glass-card px-6 py-6">
            <div className="flex items-center justify-center gap-4">
              {/* Mute/Unmute */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleMute}
                className={`p-4 rounded-full ${
                  isMuted
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white"
                } backdrop-blur-sm hover:bg-white/20 transition-all`}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </motion.button>

              {/* Video On/Off (video calls only) */}
              {callType === "video" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleVideo}
                  className={`p-4 rounded-full ${
                    !isVideoEnabled
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/10 text-white"
                  } backdrop-blur-sm hover:bg-white/20 transition-all`}
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <VideoOff className="w-6 h-6" />
                  )}
                </motion.button>
              )}

              {/* End Call */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onEndCall}
                className="p-6 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-all"
              >
                <PhoneOff className="w-8 h-8" />
              </motion.button>

              {/* Switch Camera (video calls only, mobile) */}
              {callType === "video" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onSwitchCamera}
                  className="p-4 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-all"
                >
                  <SwitchCamera className="w-6 h-6" />
                </motion.button>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-400">
              {isMuted && (
                <span className="flex items-center gap-1">
                  <MicOff className="w-4 h-4" />
                  Muted
                </span>
              )}
              {callType === "video" && !isVideoEnabled && (
                <span className="flex items-center gap-1">
                  <VideoOff className="w-4 h-4" />
                  Video Off
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient overlays */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
    </motion.div>
  );
}
