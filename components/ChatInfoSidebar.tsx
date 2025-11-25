"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Bell,
  BellOff,
  Trash2,
  Ban,
  ShieldOff,
  Star,
  Download,
  ExternalLink,
} from "lucide-react";

interface ChatInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatAddress: string;
  chatName: string;
  isOnline: boolean;
  onMute: () => void;
  onUnmute: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onBlockUser: () => void;
  onUnblockUser: () => void;
  isMuted: boolean;
  isBlocked: boolean;
}

interface MediaItem {
  type: "image" | "video";
  url: string;
  timestamp: number;
  txHash: string;
}

interface DocumentItem {
  name: string;
  url: string;
  size: number;
  timestamp: number;
  txHash: string;
}

interface LinkItem {
  url: string;
  title: string;
  timestamp: number;
  txHash: string;
}

interface ChatInfoSidebarExtendedProps extends ChatInfoSidebarProps {
  messages?: Array<{
    sender: string;
    content: string;
    timestamp: bigint;
    messageType?: string;
  }>;
}

export default function ChatInfoSidebar({
  isOpen,
  onClose,
  chatAddress,
  chatName,
  isOnline,
  onMute,
  onUnmute,
  onClearChat,
  onDeleteChat,
  onBlockUser,
  onUnblockUser,
  isMuted,
  isBlocked,
  messages = [],
}: ChatInfoSidebarExtendedProps) {
  const [activeTab, setActiveTab] = useState<"media" | "docs" | "links">(
    "media"
  );
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Extract media, documents, and links from messages
  useEffect(() => {
    if (!isOpen || !chatAddress || !messages.length) {
      setMedia([]);
      setDocuments([]);
      setLinks([]);
      return;
    }

    const extractedMedia: MediaItem[] = [];
    const extractedDocs: DocumentItem[] = [];
    const extractedLinks: LinkItem[] = [];

    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach((msg, index) => {
      const timestamp = Number(msg.timestamp);
      const txHash = `msg-${index}-${timestamp}`;
      const msgType = msg.messageType || "text"; // Default to text if undefined

      // Extract images
      if (msgType === "image") {
        try {
          const fileData = JSON.parse(msg.content);
          extractedMedia.push({
            type: "image",
            url: fileData.data || "",
            timestamp,
            txHash,
          });
        } catch {
          // If not JSON, might be old format
          if (msg.content.includes("data:image")) {
            extractedMedia.push({
              type: "image",
              url: msg.content,
              timestamp,
              txHash,
            });
          }
        }
      }

      // Extract documents/files
      if (msgType === "file") {
        try {
          const fileData = JSON.parse(msg.content);
          extractedDocs.push({
            name: fileData.name || "Unknown File",
            url: fileData.data || "",
            size: fileData.size || 0,
            timestamp,
            txHash,
          });
        } catch {
          // Fallback for old format
          extractedDocs.push({
            name: "Document",
            url: msg.content,
            size: 0,
            timestamp,
            txHash,
          });
        }
      }

      // Extract URLs from text messages (default type or explicit text)
      if (msgType === "text" || !msg.messageType) {
        const urls = msg.content.match(urlRegex);
        if (urls) {
          urls.forEach((url) => {
            extractedLinks.push({
              url,
              title: url,
              timestamp,
              txHash,
            });
          });
        }
      }
    });

    setMedia(extractedMedia);
    setDocuments(extractedDocs);
    setLinks(extractedLinks);
  }, [isOpen, chatAddress, messages]);

  const handleConfirmDelete = () => {
    onDeleteChat();
    setShowConfirmDelete(false);
    onClose();
  };

  const handleConfirmBlock = () => {
    if (isBlocked) {
      onUnblockUser();
    } else {
      onBlockUser();
    }
    setShowConfirmBlock(false);
  };

  const handleConfirmClear = () => {
    onClearChat();
    setShowConfirmClear(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">Chat Info</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-gray-800 text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <span className="text-white font-bold text-3xl">
                  {chatName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">
                {chatName}
              </h3>
              <p className="text-sm text-gray-400 mb-2 truncate px-4">
                {chatAddress}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-400" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm text-gray-400">
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2 border-b border-gray-800">
              <button
                onClick={isMuted ? onUnmute : onMute}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                {isMuted ? (
                  <Bell className="w-5 h-5 text-blue-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-white">
                  {isMuted ? "Unmute Notifications" : "Mute Notifications"}
                </span>
              </button>

              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                <Trash2 className="w-5 h-5 text-yellow-400" />
                <span className="text-white">Clear Chat</span>
              </button>

              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="text-white">Delete Chat</span>
              </button>

              <button
                onClick={() => setShowConfirmBlock(true)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                {isBlocked ? (
                  <>
                    <ShieldOff className="w-5 h-5 text-green-400" />
                    <span className="text-white">Unblock User</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-5 h-5 text-red-400" />
                    <span className="text-white">Block User</span>
                  </>
                )}
              </button>
            </div>

            {/* Media/Docs/Links Tabs */}
            <div className="border-b border-gray-800">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("media")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "media"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                  Media
                </button>
                <button
                  onClick={() => setActiveTab("docs")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "docs"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-4 h-4 mx-auto mb-1" />
                  Docs
                </button>
                <button
                  onClick={() => setActiveTab("links")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "links"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LinkIcon className="w-4 h-4 mx-auto mb-1" />
                  Links
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {activeTab === "media" && (
                <div>
                  {media.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No media shared yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {media.map((item, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg bg-gray-800 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt="Shared media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "docs" && (
                <div>
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No documents shared yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
                        >
                          <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {doc.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {(doc.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "links" && (
                <div>
                  {links.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No links shared yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                          <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {link.title || link.url}
                            </p>
                            <p className="text-gray-400 text-xs truncate">
                              {link.url}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation Modals */}
            <AnimatePresence>
              {showConfirmClear && (
                <ConfirmModal
                  title="Clear Chat?"
                  message="This will delete all messages from this chat. This action cannot be undone."
                  confirmText="Clear"
                  confirmColor="yellow"
                  onConfirm={handleConfirmClear}
                  onCancel={() => setShowConfirmClear(false)}
                />
              )}

              {showConfirmDelete && (
                <ConfirmModal
                  title="Delete Chat?"
                  message="This will permanently delete this chat and all its messages. This action cannot be undone."
                  confirmText="Delete"
                  confirmColor="red"
                  onConfirm={handleConfirmDelete}
                  onCancel={() => setShowConfirmDelete(false)}
                />
              )}

              {showConfirmBlock && (
                <ConfirmModal
                  title={isBlocked ? "Unblock User?" : "Block User?"}
                  message={
                    isBlocked
                      ? "This user will be able to send you messages again."
                      : "This user will no longer be able to send you messages."
                  }
                  confirmText={isBlocked ? "Unblock" : "Block"}
                  confirmColor={isBlocked ? "green" : "red"}
                  onConfirm={handleConfirmBlock}
                  onCancel={() => setShowConfirmBlock(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ConfirmModal({
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: "red" | "yellow" | "green";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colorClasses = {
    red: "bg-red-600 hover:bg-red-700",
    yellow: "bg-yellow-600 hover:bg-yellow-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800"
      >
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 text-white rounded-lg transition-colors ${colorClasses[confirmColor]}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
