"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { useWebSocket } from "@/context/WebSocketContext";
import {
  UserCircle,
  Search,
  Plus,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

interface SidebarProps {
  onSelectChat: (address: string, username: string) => void;
  selectedChat: string | null;
  onOpenContacts: () => void;
  onOpenProfile: () => void;
}

export default function Sidebar({
  onSelectChat,
  selectedChat,
  onOpenContacts,
  onOpenProfile,
}: SidebarProps) {
  const {
    account,
    currentUser,
    disconnectWallet,
    userChats,
    isLoadingChats,
    setSelectedChat,
    refreshData,
  } = useWeb3();
  const webSocket = useWebSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket listener for instant sidebar updates
  useEffect(() => {
    if (!webSocket || !account) return;

    console.log(
      "👂 [Sidebar] Setting up WebSocket listener for instant updates"
    );

    const unsubscribe = webSocket.onNewMessage((data: any) => {
      console.log("📨 [Sidebar] New message received, refreshing chat list");
      // Refresh sidebar immediately when new message arrives
      refreshData();
    });

    return unsubscribe;
  }, [webSocket, account, refreshData]);

  // SMART LOADING: Only show after 10 seconds of no update
  useEffect(() => {
    if (!isLoadingChats) {
      // Data updated, reset timer
      lastUpdateTimeRef.current = Date.now();
      setShowLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    } else {
      // Loading started, set 10-second timeout
      loadingTimeoutRef.current = setTimeout(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
        if (timeSinceLastUpdate >= 10000) {
          setShowLoading(true);
        }
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoadingChats]);

  const filteredChats = userChats.filter((chat) =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="w-full md:w-96 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Header - Fixed height, no overlap */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-semibold text-white">
                {currentUser?.username || "User"}
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-[150px]">
                {currentUser?.status || "Hey there!"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Smart Loading Indicator - only shows after 10s */}
            {showLoading && (
              <div className="animate-fade-in">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
            <button
              onClick={onOpenContacts}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onOpenProfile}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              title="Profile"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={disconnectWallet}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              title="Disconnect"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p>No chats yet</p>
            <button
              onClick={onOpenContacts}
              className="mt-2 text-blue-500 hover:text-blue-400 text-sm"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.address}
              onClick={() => {
                // Ensure context-selectedChat updates immediately to avoid stale renders
                try {
                  if (setSelectedChat) setSelectedChat(chat.address);
                } catch (e) {
                  // ignore
                }
                // Notify parent (sets selectedChatName and mobile view)
                onSelectChat(chat.address, chat.username);
              }}
              className={`p-4 border-b border-gray-800 cursor-pointer transition-all hover:bg-gray-800 ${
                selectedChat === chat.address
                  ? "bg-gray-800 border-l-4 border-l-blue-500"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                {chat.avatarUrl ? (
                  <img
                    src={chat.avatarUrl}
                    alt={chat.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {chat.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white truncate">
                      {chat.username}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {chat.lastMessageTime
                        ? formatLastSeen(chat.lastMessageTime)
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0 ml-2">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
