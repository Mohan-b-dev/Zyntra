"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Trash2, SmilePlus } from "lucide-react";

interface Message {
  sender: string;
  content: string;
  timestamp: bigint;
  isRead: boolean;
  isDeleted: boolean;
  messageType: number;
}

interface MessagesListProps {
  messages: Message[];
  currentUserAddress: string;
  recipientAddress: string;
  onDelete?: (index: number) => void;
  onReact?: (index: number, emoji: string) => void;
}

export default function MessagesList({
  messages,
  currentUserAddress,
  recipientAddress,
  onDelete,
  onReact,
}: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const grouped: { [key: string]: Message[] } = {};

    messages.forEach((msg) => {
      const date = formatDate(msg.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(msg);
    });

    return grouped;
  };

  const groupedMessages = groupMessagesByDate();

  // Fallback for empty messages
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-glass-dark border border-neon-purple/20 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💬
            </motion.div>
          </div>
          <p className="text-gray-400 text-sm">No messages yet</p>
          <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence>
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="backdrop-blur-sm bg-glass-dark px-3 py-1 rounded-full border border-white/10">
                <span className="text-xs text-gray-400">{date}</span>
              </div>
            </div>

            {/* Messages for this date */}
            {msgs.map((message, index) => {
              const isOwnMessage =
                message.sender.toLowerCase() ===
                currentUserAddress.toLowerCase();
              const messageIndex = messages.indexOf(message);

              return (
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <div
                    className={`group relative max-w-[75%] ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 backdrop-blur-glass border shadow-glass ${
                        message.isDeleted
                          ? "bg-glass-dark/50 border-gray-700/30 italic"
                          : isOwnMessage
                          ? "bg-gradient-to-br from-neon-purple/30 to-neon-blue/30 border-neon-purple/20 shadow-neon"
                          : "bg-glass-dark border-white/10"
                      } ${
                        !message.isDeleted &&
                        "hover:shadow-glow transition-all duration-300"
                      }`}
                    >
                      {/* Message Content with word-wrap */}
                      <p
                        className={`text-sm ${
                          message.isDeleted ? "text-gray-500" : "text-white"
                        } break-words overflow-wrap-anywhere`}
                        style={{
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {message.isDeleted
                          ? "🗑️ Message deleted"
                          : message.content}
                      </p>

                      {/* Time & Status */}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                        {isOwnMessage && !message.isDeleted && (
                          <span>
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-neon-cyan" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover Actions */}
                    {!message.isDeleted && (
                      <div
                        className={`absolute top-0 ${
                          isOwnMessage
                            ? "left-0 -translate-x-full"
                            : "right-0 translate-x-full"
                        } opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 px-2`}
                      >
                        {onReact && (
                          <button
                            onClick={() => onReact(messageIndex, "❤️")}
                            className="p-1 rounded-lg backdrop-blur-sm bg-glass-dark border border-white/10 hover:border-neon-pink/30 transition-colors"
                            title="React"
                          >
                            <SmilePlus className="w-4 h-4 text-gray-400 hover:text-neon-pink" />
                          </button>
                        )}
                        {isOwnMessage && onDelete && (
                          <button
                            onClick={() => onDelete(messageIndex)}
                            className="p-1 rounded-lg backdrop-blur-sm bg-glass-dark border border-white/10 hover:border-red-500/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </AnimatePresence>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
