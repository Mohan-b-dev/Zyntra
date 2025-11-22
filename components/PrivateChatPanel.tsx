"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Clock } from "lucide-react";
import GlassCard from "./GlassCard";

interface Chat {
  address: string;
  username: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  avatarUrl?: string;
}

interface PrivateChatPanelProps {
  chats: Chat[];
  currentChat: string | null;
  onSelectChat: (address: string, username: string) => void;
}

export default function PrivateChatPanel({
  chats,
  currentChat,
  onSelectChat,
}: PrivateChatPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(
    (chat) =>
      chat.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-3 backdrop-blur-glass bg-glass-dark border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-neon-purple/30 transition-colors"
          />
        </div>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2">
        <AnimatePresence>
          {filteredChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center p-8"
            >
              <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Start chatting with someone!
              </p>
            </motion.div>
          ) : (
            filteredChats.map((chat, index) => (
              <motion.div
                key={chat.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard
                  variant={currentChat === chat.address ? "glow" : "hover"}
                  animate={false}
                  className={`p-4 cursor-pointer ${
                    currentChat === chat.address
                      ? "bg-glass-light border-neon-purple/30"
                      : ""
                  }`}
                  onClick={() => onSelectChat(chat.address, chat.username)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-neon">
                        {chat.avatarUrl ? (
                          <img
                            src={chat.avatarUrl}
                            alt={chat.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {chat.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {chat.unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-neon-pink rounded-full flex items-center justify-center shadow-neon"
                        >
                          <span className="text-xs font-bold text-white">
                            {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className={`font-semibold truncate ${
                            chat.unreadCount > 0
                              ? "text-white"
                              : "text-gray-300"
                          }`}
                        >
                          {chat.username}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(chat.lastMessageTime)}</span>
                        </div>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          chat.unreadCount > 0
                            ? "text-gray-300 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
