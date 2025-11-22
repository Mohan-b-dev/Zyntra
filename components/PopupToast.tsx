"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Bell, AlertCircle } from "lucide-react";

export interface Toast {
  id: string;
  type: "message" | "private" | "system";
  sender?: string;
  preview: string;
  timestamp: number;
}

interface PopupToastProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function PopupToast({ toasts, onClose }: PopupToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 2500);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "message":
        return <MessageCircle className="w-5 h-5 text-neon-cyan" />;
      case "private":
        return <MessageCircle className="w-5 h-5 text-neon-purple" />;
      case "system":
        return <Bell className="w-5 h-5 text-neon-blue" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "message":
        return "border-neon-cyan/30";
      case "private":
        return "border-neon-purple/30";
      case "system":
        return "border-neon-blue/30";
      default:
        return "border-gray-700";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`backdrop-blur-glass bg-glass-darker border ${getBorderColor()} rounded-xl shadow-glass p-4 flex items-start gap-3 min-w-[320px]`}
    >
      <div className="flex-shrink-0 mt-1">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        {toast.sender && (
          <p className="text-sm font-semibold text-white mb-1">
            {toast.sender}
          </p>
        )}
        <p className="text-sm text-gray-300 break-words overflow-wrap-anywhere">
          {toast.preview}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatTime(toast.timestamp)}
        </p>
      </div>

      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
