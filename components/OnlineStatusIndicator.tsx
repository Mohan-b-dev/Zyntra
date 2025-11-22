import React from "react";
import { motion } from "framer-motion";

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  lastSeen?: number;
  showLastSeen?: boolean;
  size?: "sm" | "md" | "lg";
  withPulse?: boolean;
  position?: "relative" | "absolute";
}

export default function OnlineStatusIndicator({
  isOnline,
  lastSeen,
  showLastSeen = false,
  size = "md",
  withPulse = true,
  position = "relative",
}: OnlineStatusIndicatorProps) {
  // Size configurations
  const sizeConfig = {
    sm: { dot: "w-2 h-2", text: "text-[10px]" },
    md: { dot: "w-3 h-3", text: "text-xs" },
    lg: { dot: "w-4 h-4", text: "text-sm" },
  };

  const config = sizeConfig[size];

  // Format last seen time
  const getLastSeenText = () => {
    if (!lastSeen) return "Offline";

    const now = Date.now();
    const diff = now - lastSeen;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  const positionClass =
    position === "absolute" ? "absolute -bottom-0.5 -right-0.5" : "relative";

  return (
    <div className={`inline-flex items-center gap-2 ${positionClass}`}>
      {/* Status Dot */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring (only when online) */}
        {isOnline && withPulse && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute ${config.dot} rounded-full bg-green-400`}
          />
        )}

        {/* Main dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`${config.dot} rounded-full border-2 ${
            isOnline
              ? "bg-green-400 border-green-300"
              : "bg-gray-500 border-gray-400"
          } shadow-lg`}
        />
      </div>

      {/* Last seen text */}
      {showLastSeen && !isOnline && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${config.text} text-gray-400`}
        >
          {getLastSeenText()}
        </motion.span>
      )}

      {showLastSeen && isOnline && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${config.text} text-green-400 font-medium`}
        >
          Online
        </motion.span>
      )}
    </div>
  );
}

// Compact variant for lists
export function OnlineStatusBadge({
  isOnline,
  count,
}: {
  isOnline?: boolean;
  count?: number;
}) {
  if (count !== undefined && count > 0) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-400/20 border border-green-400/30"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-green-400 font-semibold">
          {count}
        </span>
      </motion.div>
    );
  }

  if (isOnline) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-2 h-2 rounded-full bg-green-400 border border-green-300 shadow-lg"
      >
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-green-400"
        />
      </motion.div>
    );
  }

  return (
    <div className="w-2 h-2 rounded-full bg-gray-500 border border-gray-400" />
  );
}
