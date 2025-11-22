import React from "react";
import { motion } from "framer-motion";

interface TypingIndicatorProps {
  typingUsers: string[];
  isGroup?: boolean;
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function TypingIndicator({
  typingUsers,
  isGroup = false,
  maxVisible = 3,
  size = "md",
  showText = true,
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  // Size configurations
  const sizeConfig = {
    sm: { dot: "w-1.5 h-1.5", text: "text-[10px]", gap: "gap-1" },
    md: { dot: "w-2 h-2", text: "text-xs", gap: "gap-1.5" },
    lg: { dot: "w-2.5 h-2.5", text: "text-sm", gap: "gap-2" },
  };

  const config = sizeConfig[size];

  // Generate typing text
  const getTypingText = () => {
    const visibleUsers = typingUsers.slice(0, maxVisible);
    const remainingCount = typingUsers.length - maxVisible;

    if (!isGroup) {
      return "typing...";
    }

    if (typingUsers.length === 1) {
      return `${visibleUsers[0]} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${visibleUsers[0]} and ${visibleUsers[1]} are typing...`;
    }

    if (remainingCount > 0) {
      return `${visibleUsers.join(", ")} and ${remainingCount} ${
        remainingCount === 1 ? "other" : "others"
      } are typing...`;
    }

    return `${visibleUsers.slice(0, -1).join(", ")} and ${
      visibleUsers[visibleUsers.length - 1]
    } are typing...`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`inline-flex items-center ${config.gap}`}
    >
      {/* Animated dots */}
      <div className={`flex ${config.gap}`}>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0,
          }}
          className={`${config.dot} rounded-full bg-blue-400`}
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
          className={`${config.dot} rounded-full bg-blue-400`}
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
          className={`${config.dot} rounded-full bg-blue-400`}
        />
      </div>

      {/* Typing text */}
      {showText && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${config.text} text-gray-400 italic`}
        >
          {getTypingText()}
        </motion.span>
      )}
    </motion.div>
  );
}

// Compact version for chat input area
export function TypingIndicatorCompact({ isTyping }: { isTyping: boolean }) {
  if (!isTyping) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-xl rounded-full border border-white/10"
    >
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
        />
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
        />
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
        />
      </div>
      <span className="text-[10px] text-gray-400 italic">typing...</span>
    </motion.div>
  );
}

// Badge version for sidebar
export function TypingBadge({ count = 1 }: { count?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-400/20 border border-blue-400/30"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="w-1 h-1 rounded-full bg-blue-400"
      />
      {count > 1 && (
        <span className="text-[9px] text-blue-400 font-semibold">{count}</span>
      )}
    </motion.div>
  );
}
