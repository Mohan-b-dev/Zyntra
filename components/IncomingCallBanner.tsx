"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallBannerProps {
  isOpen: boolean;
  callerName: string;
  callerAddress: string;
  callType: "voice" | "video";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallBanner({
  isOpen,
  callerName,
  callerAddress,
  callType,
  onAccept,
  onReject,
}: IncomingCallBannerProps) {
  const formatAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] mx-auto max-w-md px-4 pt-4"
        >
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border-2 border-green-500/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 animate-pulse" />

            <div className="relative p-4 flex items-center gap-4">
              {/* Caller Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-green-500/50">
                  <span className="text-white font-bold text-xl">
                    {callerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Pulse ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1.3],
                    opacity: [0.5, 0, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-green-500"
                />
              </div>

              {/* Caller Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {callType === "video" ? (
                    <Video className="w-4 h-4 text-green-400" />
                  ) : (
                    <Phone className="w-4 h-4 text-green-400" />
                  )}
                  <span className="text-xs text-gray-400 font-medium">
                    Incoming {callType === "video" ? "Video" : "Voice"} Call
                  </span>
                </div>
                <h3 className="text-white font-bold text-base truncate">
                  {callerName}
                </h3>
                <p className="text-gray-400 text-xs font-mono">
                  {formatAddress(callerAddress)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {/* Reject */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onReject}
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 flex items-center justify-center transition-colors"
                  aria-label="Reject call"
                >
                  <PhoneOff className="w-5 h-5 text-white" />
                </motion.button>

                {/* Accept */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onAccept}
                  className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/50 flex items-center justify-center transition-colors"
                  aria-label="Accept call"
                >
                  <Phone className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
