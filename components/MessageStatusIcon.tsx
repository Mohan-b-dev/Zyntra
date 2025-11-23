"use client";

import React from "react";
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusIconProps {
  status: "sending" | "sent" | "delivered" | "read";
  isSender: boolean;
}

/**
 * Message status indicator with tick rules:
 * SENDER side:
 *   - No tick: sending
 *   - ✓ gray: sent (server received)
 *   - ✓✓ gray: delivered (recipient received)
 *   - ✓✓ BLACK: read (recipient saw it)
 * RECEIVER side:
 *   - ✓ gray: delivered (message rendered on their screen)
 *   - ✓✓ BLUE: read (they opened chat and saw it)
 */
export default function MessageStatusIcon({
  status,
  isSender,
}: MessageStatusIconProps) {
  // SENDER: Don't show tick while sending
  if (isSender && status === "sending") return null;

  // SENDER: Single gray tick when sent
  if (isSender && status === "sent") {
    return (
      <Check
        className="w-4 h-4 text-gray-400"
        strokeWidth={2.5}
        aria-label="Sent"
      />
    );
  }

  // RECEIVER: Single gray tick when delivered (message rendered)
  if (!isSender && status === "delivered") {
    return (
      <Check
        className="w-4 h-4 text-gray-400"
        strokeWidth={2.5}
        aria-label="Delivered"
      />
    );
  }

  // SENDER: Double gray ticks when delivered
  if (isSender && status === "delivered") {
    return (
      <CheckCheck
        className="w-4 h-4 text-gray-400"
        strokeWidth={2.5}
        aria-label="Delivered"
      />
    );
  }

  // SENDER: Double BLACK ticks when read
  if (isSender && status === "read") {
    return (
      <CheckCheck
        className="w-4 h-4 text-black"
        strokeWidth={2.5}
        aria-label="Read"
      />
    );
  }

  // RECEIVER: Double BLUE ticks when read
  if (!isSender && status === "read") {
    return (
      <CheckCheck
        className="w-4 h-4 text-blue-500"
        strokeWidth={2.5}
        aria-label="Read"
      />
    );
  }

  return null;
}
