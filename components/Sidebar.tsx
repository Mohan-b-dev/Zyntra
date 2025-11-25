"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { UserCircle, Search, Plus, Settings, LogOut } from "lucide-react";

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
  const { account, currentUser, disconnectWallet, userChats, isLoadingChats } =
    useWeb3();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out deleted chats from localStorage
  const deletedChats = JSON.parse(localStorage.getItem("deletedChats") || "[]");
  
  const filteredChats = userChats
    .filter((chat) => !deletedChats.includes(chat.address.toLowerCase()))
    .filter((chat) =>
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
    <div className="w-full md:w-96 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
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
        {isLoadingChats ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
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
              onClick={() => onSelectChat(chat.address, chat.username)}
              className={`p-4 border-b border-gray-800 cursor-pointer transition-colors hover:bg-gray-800 ${
                selectedChat === chat.address ? "bg-gray-800" : ""
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
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
                    <span className="text-xs text-gray-500">
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
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
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
