"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Smile, Paperclip, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  showTypingIndicator?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  showTypingIndicator = false,
  onTyping,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(
    null
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced typing indicator
  useEffect(() => {
    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    if (message.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping?.(false);
      }, 1000);
    } else {
      setIsTyping(false);
      onTyping?.(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, onTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) return;

    // Optimistic UI update
    setOptimisticMessage(trimmedMessage);
    setMessage("");
    setIsSending(true);

    try {
      const success = await onSend(trimmedMessage);

      if (success) {
        setOptimisticMessage(null);
      } else {
        // Restore message on failure
        setMessage(trimmedMessage);
        setOptimisticMessage(null);
      }
    } catch (error) {
      console.error("Send error:", error);
      setMessage(trimmedMessage);
      setOptimisticMessage(null);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="relative">
      {/* Optimistic Message Indicator */}
      {optimisticMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-full left-0 right-0 p-2 mb-2"
        >
          <div className="backdrop-blur-glass bg-glass-dark/50 border border-neon-purple/20 rounded-lg p-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
            <span className="text-xs text-gray-400">Sending message...</span>
          </div>
        </motion.div>
      )}

      {/* Typing Indicator */}
      {showTypingIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-full left-0 p-2 mb-1"
        >
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex gap-1">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 bg-neon-cyan rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-neon-cyan rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-neon-cyan rounded-full"
              />
            </div>
            <span>typing...</span>
          </div>
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="relative">
        <div className="backdrop-blur-glass bg-glass-dark border border-white/10 rounded-2xl p-3 flex items-end gap-3 hover:border-neon-purple/20 transition-colors">
          {/* Emoji Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-neon-purple transition-colors rounded-lg hover:bg-white/5"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          />

          {/* Attach Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-neon-cyan transition-colors rounded-lg hover:bg-white/5"
            title="Attach"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={!message.trim() || isSending || disabled}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              message.trim() && !isSending && !disabled
                ? "bg-gradient-to-br from-neon-purple to-neon-blue text-white shadow-neon hover:shadow-glow"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Character Counter */}
        <div className="flex justify-between items-center mt-1 px-2">
          <span className="text-xs text-gray-500">
            {message.length > 0 && `${message.length} / 500`}
          </span>
          <span className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </form>
    </div>
  );
}
