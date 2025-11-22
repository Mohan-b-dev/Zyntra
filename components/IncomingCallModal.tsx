"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  callerAddress: string;
  callerName?: string;
  callType: "voice" | "video";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerAddress,
  callerName,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4"
        >
          {/* Glass-morphism container */}
          <div className="glass-card p-8 text-center">
            {/* Call type icon with pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50"
            >
              {callType === "video" ? (
                <Video className="w-12 h-12 text-white" />
              ) : (
                <Phone className="w-12 h-12 text-white" />
              )}
            </motion.div>

            {/* Caller info */}
            <h2 className="text-2xl font-bold text-white mb-2">
              Incoming {callType === "video" ? "Video" : "Voice"} Call
            </h2>
            <p className="text-lg text-gray-300 mb-2">
              {callerName || "Unknown User"}
            </p>
            <p className="text-sm text-gray-400 mb-8 font-mono">
              {callerAddress.slice(0, 6)}...{callerAddress.slice(-4)}
            </p>

            {/* Action buttons */}
            <div className="flex gap-4 justify-center">
              {/* Reject button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReject}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-all"
              >
                <PhoneOff className="w-6 h-6" />
                Decline
              </motion.button>

              {/* Accept button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAccept}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/50 hover:shadow-green-500/70 transition-all"
              >
                <Phone className="w-6 h-6" />
                Accept
              </motion.button>
            </div>
          </div>

          {/* Decorative glow */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-3xl rounded-3xl"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
