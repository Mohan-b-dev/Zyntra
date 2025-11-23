"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { Send, Smile, Paperclip, MoreVertical, ArrowLeft } from "lucide-react";

interface ChatWindowProps {
  recipientAddress: string;
  recipientName: string;
  onBack: () => void;
}

export default function ChatWindow({
  recipientAddress,
  recipientName,
  onBack,
}: ChatWindowProps) {
  const { account, privateMessages, isLoadingMessages, sendPrivateMessage } =
    useWeb3();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [privateMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isSending) return;

    setIsSending(true);
    const result = await sendPrivateMessage(recipientAddress, message.trim());

    if (result.success) {
      setMessage("");
    }
    setIsSending(false);
  };

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

  const groupMessagesByDate = () => {
    const grouped: { [key: string]: typeof privateMessages } = {};

    privateMessages.forEach((msg) => {
      const date = formatDate(msg.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(msg);
    });

    return grouped;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full">
      {/* Chat Header */}
      <div className="bg-gray-800 px-4 py-6 border-b border-gray-700 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold">
            {recipientName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white">{recipientName}</h2>
          <p className="text-xs text-gray-400">
            {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
          </p>
        </div>
        <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : privateMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <div key={date}>
                {/* Date Divider */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                    {date}
                  </div>
                </div>

                {/* Messages for this date */}
                {messages.map((msg, idx) => {
                  const isOwnMessage =
                    msg.sender.toLowerCase() === account?.toLowerCase();

                  return (
                    <div
                      key={idx}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      } mb-2`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-100"
                        }`}
                      >
                        {msg.isDeleted ? (
                          <p className="text-sm italic opacity-70">
                            This message was deleted
                          </p>
                        ) : (
                          <>
                            <p className="break-words">{msg.content}</p>
                            <div className="flex items-center justify-end space-x-1 mt-1">
                              <span className="text-xs opacity-70">
                                {formatTime(msg.timestamp)}
                              </span>
                              {isOwnMessage && (
                                <span className="text-xs">
                                  {msg.isRead ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <Smile className="w-5 h-5 text-gray-400" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!message.trim() || isSending}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {message.length}/500 characters
        </p>
      </div>
    </div>
  );
}
