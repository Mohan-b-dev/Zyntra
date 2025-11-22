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
  Loader2,
  Smile,
  Paperclip,
  X,
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import useFilteredMessages from "@/components/hooks/useFilteredMessages";

interface ChatWindowProps {
  selectedChat: string | null;
  selectedChatName: string;
}

export default function ChatWindowV2({
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
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  // Load messages when selectedChat changes. include loadChatMessages in deps and cancel if unmounted
  useEffect(() => {
    let cancelled = false;
    const doLoad = async () => {
      if (!selectedChat || !account) {
        console.log(
          "🔍 [ChatWindowV2] No selectedChat or account, skipping load"
        );
        setMessagesLoaded(false);
        return;
      }

      console.log(
        "🔍 [ChatWindowV2] Loading messages for chat:",
        selectedChat.slice(0, 10) + "..."
      );
      setMessagesLoaded(false);
      try {
        await loadChatMessages(selectedChat);
        if (!cancelled) {
          console.log("🔍 [ChatWindowV2] Messages loaded successfully");
          setMessagesLoaded(true);
        }
      } catch (err) {
        console.error("❌ [ChatWindowV2] Error loading messages:", err);
        if (!cancelled) setMessagesLoaded(true);
      }
    };

    doLoad();

    return () => {
      cancelled = true;
    };
  }, [selectedChat, account, loadChatMessages]);

  // Use the centralized filtering hook
  const filteredMessages = useFilteredMessages(
    privateMessages,
    selectedChat,
    account
  );

  console.log("🔍 [ChatWindowV2] Render state:", {
    selectedChat: selectedChat?.slice(0, 10) + "..." || "none",
    account: account?.slice(0, 10) + "..." || "none",
    totalMessages: privateMessages.length,
    filteredMessages: filteredMessages.length,
    isLoadingMessages,
    messagesLoaded,
  });

  // Auto-scroll when the number of filtered messages changes - ONLY within messages container
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use scrollIntoView with block: 'nearest' to prevent page scroll
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
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
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="text-center">
          <UserCircle className="w-20 h-20 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No Chat Selected</h3>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 relative min-h-0 max-h-full overflow-hidden">
      {/* Chat Header - ALWAYS VISIBLE, NEVER CLIPPED */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between relative z-30 flex-shrink-0 w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">
              {selectedChatName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-white">{selectedChatName}</h3>
            <p className="text-xs text-gray-400">Online</p>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          style={{ opacity: 1, visibility: "visible" }}
        >
          {/* Voice Call Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedChat && startCall(selectedChat, "voice")}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-700"
            title="Voice Call"
            style={{ display: "flex", opacity: 1, visibility: "visible" }}
          >
            <Phone className="w-5 h-5 text-blue-400" />
          </motion.button>
          {/* Video Call Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => selectedChat && startCall(selectedChat, "video")}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-700"
            title="Video Call"
            style={{ display: "flex", opacity: 1, visibility: "visible" }}
          >
            <Video className="w-5 h-5 text-purple-400" />
          </motion.button>
          {/* More Options Button */}
          <button
            className="p-2 hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-700"
            style={{ display: "flex", opacity: 1, visibility: "visible" }}
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages Container - Scrollable area between header and input, SCROLL CONTAINED */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 relative z-10 min-h-0"
        style={{ scrollBehavior: "smooth" }}
      >
        {isLoadingMessages && !messagesLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMessages.length === 0 && messagesLoaded ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isOwnMessage =
              msg.sender.toLowerCase() === account?.toLowerCase();
            const timestamp = new Date(Number(msg.timestamp) * 1000);

            return (
              <motion.div
                key={`${msg.sender}-${String(msg.timestamp)}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      <AnimatePresence>
        {filePreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-2 bg-gray-900 border-t border-gray-800"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{selectedFile?.name}</p>
                <p className="text-xs text-gray-400">
                  {(selectedFile!.size / 1024).toFixed(2)} KB
                </p>
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleSendFile}
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area - Fixed at bottom, never overlapped */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 relative z-20 flex-shrink-0 w-full">
        <div className="flex items-end space-x-2">
          {/* Emoji Picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              title="Emoji"
            >
              <Smile className="w-6 h-6 text-gray-400" />
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 z-50"
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-6 h-6 text-gray-400" />
          </button>
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
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
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
        callType={callInfo?.type || "voice"}
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
