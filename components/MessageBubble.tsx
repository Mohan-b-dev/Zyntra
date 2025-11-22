"use client";

import React, { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";

interface MessageBubbleProps {
  sender: string;
  text: string;
  timestamp: bigint;
  isOwnMessage: boolean;
}

export default function MessageBubble({
  sender,
  text,
  timestamp,
  isOwnMessage,
}: MessageBubbleProps) {
  const { contract } = useWeb3();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!contract) return;

      setIsLoadingUsername(true);
      try {
        const name = await contract.getUsername(sender);
        setUsername(name || null);
      } catch (err) {
        console.error("Error fetching username:", err);
        setUsername(null);
      } finally {
        setIsLoadingUsername(false);
      }
    };

    fetchUsername();
  }, [contract, sender]);

  const formatTime = (ts: bigint) => {
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getInitials = (address: string, username?: string | null) => {
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return address.slice(2, 4).toUpperCase();
  };

  return (
    <div
      className={`flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      } mb-4 animate-fadeIn`}
    >
      <div
        className={`flex gap-3 max-w-[70%] ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
            isOwnMessage
              ? "bg-gradient-to-br from-purple-500 to-pink-500"
              : "bg-gradient-to-br from-blue-500 to-cyan-500"
          }`}
        >
          {getInitials(sender, username)}
        </div>

        <div
          className={`flex flex-col ${
            isOwnMessage ? "items-end" : "items-start"
          }`}
        >
          {username && (
            <span
              className={`text-xs font-semibold mb-1 px-2 ${
                isOwnMessage ? "text-purple-300" : "text-cyan-300"
              }`}
            >
              {username}
            </span>
          )}

          <div
            className={`px-4 py-2 rounded-2xl backdrop-blur ${
              isOwnMessage
                ? "bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white rounded-br-sm"
                : "bg-gray-800/60 text-gray-100 rounded-bl-sm border border-gray-700/50"
            }`}
          >
            <p className="text-sm break-words">{text}</p>
          </div>

          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-gray-500 font-mono">
              {formatAddress(sender)}
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">
              {formatTime(timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
