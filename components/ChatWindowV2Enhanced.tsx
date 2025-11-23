"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { useWebSocket } from "@/context/WebSocketContext";
import { useWebRTCEnhanced } from "@/hooks/useWebRTCEnhanced";
import IncomingCallModalV2 from "@/components/IncomingCallModalV2";
import CallScreenV2 from "@/components/CallScreenV2";
import {
  Send,
  Phone,
  Video,
  MoreVertical,
  UserCircle,
  Smile,
  Paperclip,
  X,
  Loader2,
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import useFilteredMessages from "@/components/hooks/useFilteredMessages";

interface ChatWindowProps {
  selectedChat: string | null;
  selectedChatName: string;
}

export default function ChatWindowV2Enhanced({
  selectedChat,
  selectedChatName,
}: ChatWindowProps) {
  const {
    account,
    privateMessages,
    isLoadingMessages,
    sendPrivateMessage,
    loadChatMessages,
  } = useWeb3();

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlButtonsRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time features
  const webSocket = useWebSocket();

  // Enhanced WebRTC for voice/video calls
  const {
    callState,
    callInfo,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    callDuration,
    isReconnecting,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
  } = useWebRTCEnhanced({
    socket: webSocket?.socket || null,
    userAddress: account,
  });

  // INSTANT message loading - no delays, no loading states blocking UI
  useEffect(() => {
    if (selectedChat && account) {
      console.log(
        "⚡ [ChatWindow] INSTANT load for:",
        selectedChat.slice(0, 10)
      );
      loadChatMessages(selectedChat).catch((err) =>
        console.error("❌ [ChatWindow] Load error:", err)
      );
    }
  }, [selectedChat, account, loadChatMessages]);

  // Use optimized filtered messages
  const filteredMessages = useFilteredMessages(
    privateMessages,
    selectedChat,
    account
  );

  // Debug: Log call functions availability
  useEffect(() => {
    console.log("🔧 [ChatWindow] Call functions available:", {
      startCall: typeof startCall,
      callState,
      selectedChat: !!selectedChat,
    });
  }, [startCall, callState, selectedChat]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages.length]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // GSAP Animations for header and buttons - Smooth, consistent appearance
  useEffect(() => {
    if (selectedChat && headerRef.current) {
      // Smooth fade and slide from top
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }

    if (selectedChat && controlButtonsRef.current) {
      // Smooth fade in for buttons - NO scale animation for consistency
      gsap.fromTo(
        controlButtonsRef.current.children,
        { opacity: 0, y: -10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.08,
          ease: "power2.out",
        }
      );
    }
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!selectedChat || !message.trim()) return;

    setIsSending(true);
    try {
      await sendPrivateMessage(selectedChat, message.trim(), "text");
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Only images (JPEG, PNG, GIF, WEBP) are supported");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedChat) return;
    setIsSending(true);
    setUploadProgress(0);
    try {
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        clearInterval(uploadInterval);
        setUploadProgress(100);
        const base64 = ev.target?.result as string;
        await sendPrivateMessage(
          selectedChat,
          base64.substring(0, 100) + "...[IMAGE]",
          "image"
        );
        setSelectedFile(null);
        setFilePreview(null);
        setUploadProgress(0);
        setIsSending(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error("Failed to send file:", err);
      setIsSending(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-400">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-blue-500/30 backdrop-blur-xl">
            <UserCircle className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            No Chat Selected
          </h3>
          <p className="text-gray-500">
            Select a conversation to start messaging
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 h-full relative overflow-hidden pt-safe">
      {/* Animated background particles - Behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-500/30 rounded-full"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Glassmorphic Chat Header - COMPACT & CLEAN */}
      <div
        ref={headerRef}
        className="px-4 py-3 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 flex items-center justify-between relative z-50 shadow-xl flex-shrink-0"
        style={{ marginTop: 0 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/40 border border-blue-400/30"
          >
            <span className="text-white font-bold text-base">
              {selectedChatName.charAt(0).toUpperCase()}
            </span>
          </motion.div>
          <div>
            <h3 className="font-semibold text-white text-base tracking-wide">
              {selectedChatName}
            </h3>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs text-green-400 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              Online
            </motion.p>
          </div>
        </div>
        <div ref={controlButtonsRef} className="flex items-center gap-2">
          {/* Voice Call Button - Compact & Clean */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              console.log("🔵 Voice call clicked", {
                selectedChat,
                startCall: typeof startCall,
              });
              if (selectedChat && startCall) {
                startCall(selectedChat, "voice");
              }
            }}
            className="flex items-center justify-center p-2.5 bg-gradient-to-br from-blue-500/25 to-blue-600/25 hover:from-blue-500/35 hover:to-blue-600/35 rounded-xl transition-all duration-300 border border-blue-400/50 hover:border-blue-400/70 shadow-md shadow-blue-500/15 hover:shadow-blue-500/30 backdrop-blur-sm"
            title="Voice Call"
            aria-label="Voice Call"
            style={{ opacity: 1, visibility: "visible" }}
          >
            <Phone className="w-4.5 h-4.5 text-blue-300" strokeWidth={2.5} />
          </motion.button>

          {/* Video Call Button - Compact & Clean */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              console.log("🟣 Video call clicked", {
                selectedChat,
                startCall: typeof startCall,
              });
              if (selectedChat && startCall) {
                startCall(selectedChat, "video");
              }
            }}
            className="flex items-center justify-center p-2.5 bg-gradient-to-br from-purple-500/25 to-purple-600/25 hover:from-purple-500/35 hover:to-purple-600/35 rounded-xl transition-all duration-300 border border-purple-400/50 hover:border-purple-400/70 shadow-md shadow-purple-500/15 hover:shadow-purple-500/30 backdrop-blur-sm"
            title="Video Call"
            aria-label="Video Call"
            style={{ opacity: 1, visibility: "visible" }}
          >
            <Video className="w-4.5 h-4.5 text-purple-300" strokeWidth={2.5} />
          </motion.button>

          {/* More Options Button - Compact & Clean */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center p-2.5 bg-gradient-to-br from-gray-700/25 to-gray-800/25 hover:from-gray-700/35 hover:to-gray-800/35 rounded-xl transition-all duration-300 border border-gray-600/50 hover:border-gray-500/70 shadow-md shadow-gray-800/15 hover:shadow-gray-700/30 backdrop-blur-sm"
            title="More Options"
            aria-label="More Options"
            style={{ opacity: 1, visibility: "visible" }}
          >
            <MoreVertical
              className="w-4.5 h-4.5 text-gray-300"
              strokeWidth={2.5}
            />
          </motion.button>
        </div>
      </div>

      {/* Messages Container - ALWAYS visible, NO loading blocking */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 flex-shrink flex-grow">
        <AnimatePresence mode="popLayout">
          {filteredMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center p-8 rounded-2xl bg-gray-800/20 backdrop-blur-xl border border-gray-700/30">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                  <Send className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-gray-400 text-lg">No messages yet</p>
                <p className="text-gray-600 text-sm mt-2">
                  Start the conversation!
                </p>
              </div>
            </motion.div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isOwnMessage =
                msg.sender.toLowerCase() === account?.toLowerCase();
              const timestamp = new Date(Number(msg.timestamp) * 1000);

              return (
                <motion.div
                  key={`${msg.sender}-${String(msg.timestamp)}-${index}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.02,
                  }}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`max-w-[75%] rounded-2xl p-4 backdrop-blur-xl border shadow-lg ${
                      isOwnMessage
                        ? "bg-gradient-to-br from-blue-600/90 to-purple-600/90 text-white border-blue-400/30 shadow-blue-500/20"
                        : "bg-gray-800/60 text-white border-gray-700/30 shadow-gray-900/20"
                    }`}
                  >
                    <p className="break-words leading-relaxed">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-60">
                      {timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      <AnimatePresence>
        {filePreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-3 bg-gray-900/80 backdrop-blur-2xl border-t border-gray-700/30 relative z-30"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-xl border border-gray-700/50"
                />
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 shadow-lg"
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(selectedFile!.size / 1024).toFixed(2)} KB
                </p>
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-700/50 rounded-full h-2 mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                    />
                  </div>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendFile}
                disabled={isSending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white p-3 rounded-xl transition-all duration-300 shadow-lg disabled:shadow-none"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphic Input Area - ALWAYS VISIBLE, PROPERLY POSITIONED */}
      <div className="px-4 py-4 bg-gray-900/80 backdrop-blur-2xl border-t border-gray-700/30 relative z-30 shadow-2xl shadow-blue-500/5 flex-shrink-0">
        <div className="flex items-end space-x-3">
          {/* Emoji Picker */}
          <div className="relative" ref={emojiPickerRef}>
            <motion.button
              whileHover={{ scale: 1.15, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-yellow-500/20 rounded-xl transition-all duration-300 border border-transparent hover:border-yellow-500/30"
              title="Emoji"
            >
              <Smile className="w-6 h-6 text-yellow-400" />
            </motion.button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 z-50"
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File Upload */}
          <motion.button
            whileHover={{ scale: 1.15, rotate: -10 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-700/30 rounded-xl transition-all duration-300 border border-transparent hover:border-gray-600/30"
            title="Attach file"
          >
            <Paperclip className="w-6 h-6 text-gray-400" />
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Message Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-gray-800/60 backdrop-blur-xl text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/30 resize-none overflow-y-auto placeholder-gray-500 shadow-inner"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-blue-500/30 disabled:shadow-none border border-blue-400/30"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Incoming Call Modal */}
      <IncomingCallModalV2
        isOpen={callState === "incoming"}
        callerAddress={callInfo?.peer || ""}
        callType={callInfo?.type || "voice"}
        onAccept={answerCall}
        onReject={rejectCall}
      />

      {/* Active Call Screen */}
      <CallScreenV2
        isOpen={
          callState === "calling" ||
          callState === "connecting" ||
          callState === "connected" ||
          callState === "ended"
        }
        callState={callState}
        callType={callInfo?.type || "video"}
        peerAddress={callInfo?.peer || selectedChat || ""}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isSpeakerOn={isSpeakerOn}
        callDuration={callDuration}
        isReconnecting={isReconnecting}
        localStream={localStream}
        remoteStream={remoteStream}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
        onSwitchCamera={switchCamera}
      />
    </div>
  );
}
