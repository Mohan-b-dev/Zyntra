import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { motion } from "framer-motion";

interface MessageStatusTickProps {
  status: "sent" | "delivered" | "read";
  isGroup?: boolean;
  readCount?: number;
  totalMembers?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function MessageStatusTick({
  status,
  isGroup = false,
  readCount = 0,
  totalMembers = 0,
  showText = false,
  size = "md",
}: MessageStatusTickProps) {
  const tick1Ref = useRef<SVGPathElement>(null);
  const tick2Ref = useRef<SVGPathElement>(null);

  // Size configurations
  const sizeConfig = {
    sm: { width: 12, height: 10, strokeWidth: 2, textSize: "text-[8px]" },
    md: { width: 16, height: 12, strokeWidth: 2, textSize: "text-[10px]" },
    lg: { width: 20, height: 15, strokeWidth: 2.5, textSize: "text-xs" },
  };

  const config = sizeConfig[size];

  // Animate ticks on status change
  useEffect(() => {
    if (status === "delivered" || status === "read") {
      // Animate second tick appearing
      if (tick2Ref.current) {
        gsap.fromTo(
          tick2Ref.current,
          { opacity: 0, x: -5 },
          { opacity: 1, x: 0, duration: 0.3, ease: "back.out" }
        );
      }
    }

    if (status === "read") {
      // Animate color change to blue
      const targets = [tick1Ref.current, tick2Ref.current].filter(Boolean);
      gsap.to(targets, {
        fill: "none",
        stroke: "#3b82f6",
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, [status]);

  // Color based on status
  const getColor = () => {
    if (status === "read") return "text-blue-400";
    return "text-gray-400";
  };

  // Get status text for groups
  const getStatusText = () => {
    if (!isGroup || !showText) return null;

    if (status === "sent") return null;
    if (status === "delivered") return "Delivered";
    if (status === "read") {
      if (readCount === totalMembers) return "Read by all";
      return `Read by ${readCount}/${totalMembers}`;
    }
    return null;
  };

  const statusText = getStatusText();

  return (
    <div className="inline-flex items-center gap-1">
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className={getColor()}
      >
        {/* First checkmark (always visible) */}
        <motion.path
          ref={tick1Ref}
          d={`M1 ${config.height / 2}L${config.width * 0.35} ${
            config.height - 2
          }L${config.width * 0.75} 2`}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {/* Second checkmark (delivered/read) */}
        {(status === "delivered" || status === "read") && (
          <motion.path
            ref={tick2Ref}
            d={`M${config.width * 0.25} ${config.height / 2}L${
              config.width * 0.6
            } ${config.height - 2}L${config.width} 2`}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          />
        )}
      </svg>

      {statusText && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${config.textSize} ${getColor()} font-medium`}
        >
          {statusText}
        </motion.span>
      )}
    </div>
  );
}

// Animated loading variant for pending messages
export function MessageStatusLoading({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeConfig = {
    sm: { width: 12, height: 10 },
    md: { width: 16, height: 12 },
    lg: { width: 20, height: 15 },
  };

  const config = sizeConfig[size];

  return (
    <div className="inline-flex items-center gap-0.5">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        className="w-1 h-1 rounded-full bg-gray-400"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        className="w-1 h-1 rounded-full bg-gray-400"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        className="w-1 h-1 rounded-full bg-gray-400"
      />
    </div>
  );
}
