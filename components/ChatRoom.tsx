"use client";

import React, { useEffect, useRef } from "react";
import { useWeb3 } from "@/context/Web3Context";
import MessageBubble from "./MessageBubble";

export default function ChatRoom() {
  const { messages, isLoadingMessages, account, refreshMessages } = useWeb3();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    // Auto-scroll when messages change
    if (messages.length > 0) {
      if (messages.length > prevMessagesLength.current) {
        scrollToBottom("smooth");
      } else if (prevMessagesLength.current === 0) {
        scrollToBottom("auto");
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  if (!account) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/50">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            Welcome to ChatDApp
          </h3>
          <p className="text-gray-400">Connect your wallet to start chatting</p>
        </div>
      </div>
    );
  }

  if (isLoadingMessages) {
    return (
      <div className="h-full flex flex-col bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/50 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-700/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-1/4" />
                <div className="h-16 bg-gray-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/50">
      <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Chat Room</h2>
          <p className="text-sm text-gray-500">{messages.length} messages</p>
        </div>
        <button
          onClick={refreshMessages}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          title="Refresh messages"
        >
          <svg
            className="w-5 h-5 text-gray-400 hover:text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <p className="text-gray-400">
                No messages yet. Be the first to say something!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble
                key={`${msg.sender}-${msg.timestamp}-${index}`}
                sender={msg.sender}
                text={msg.text}
                timestamp={msg.timestamp}
                isOwnMessage={
                  msg.sender.toLowerCase() === account.toLowerCase()
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
