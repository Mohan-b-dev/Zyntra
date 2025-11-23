"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, X, PhoneOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useCallRingtone } from "@/hooks/useCallRingtone";

interface IncomingCallModalV2Props {
  isOpen: boolean;
  callerAddress: string;
  callType: "voice" | "video";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModalV2({
  isOpen,
  callerAddress,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalV2Props) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setPulse((prev) => (prev + 1) % 3);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const formatAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90]"
          />

          {/* Call Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-white/10 p-8 max-w-md w-full">
              {/* Call Type Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{
                    scale: pulse === 0 ? 1 : pulse === 1 ? 1.1 : 1.05,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border-2 border-green-500/50">
                    {callType === "video" ? (
                      <Video className="w-12 h-12 text-green-400" />
                    ) : (
                      <Phone className="w-12 h-12 text-green-400" />
                    )}
                  </div>

                  {/* Pulse rings */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1.5],
                      opacity: [0.5, 0, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full border-2 border-green-500/50"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1.5],
                      opacity: [0.5, 0, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5,
                    }}
                    className="absolute inset-0 rounded-full border-2 border-green-500/50"
                  />
                </motion.div>
              </div>

              {/* Caller Info */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Incoming {callType === "video" ? "Video" : "Voice"} Call
                </h2>
                <p className="text-gray-400 text-lg font-mono">
                  {formatAddress(callerAddress)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-6 justify-center">
                {/* Reject Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onReject}
                  className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50 flex items-center justify-center transition-all duration-300 hover:shadow-red-500/70"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                  <span className="absolute -bottom-8 text-sm text-gray-400 group-hover:text-white transition-colors">
                    Decline
                  </span>
                </motion.button>

                {/* Accept Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAccept}
                  className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/50 flex items-center justify-center transition-all duration-300 hover:shadow-green-500/70"
                >
                  <Phone className="w-8 h-8 text-white" />
                  <span className="absolute -bottom-8 text-sm text-gray-400 group-hover:text-white transition-colors">
                    Accept
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
