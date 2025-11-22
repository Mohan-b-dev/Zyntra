import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  Users,
  Phone,
  Video,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Paperclip,
  X,
  UserPlus,
  UserMinus,
  Crown,
  Settings,
} from "lucide-react";

interface GroupMember {
  address: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
  isOnline: boolean;
  lastSeen?: number;
}

interface GroupMessage {
  sender: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  txHash: string;
  status: "sent" | "delivered" | "read";
  readBy?: string[];
  isMe: boolean;
}

interface GroupInfo {
  groupId: string;
  name: string;
  imageUrl: string;
  description: string;
  memberCount: number;
  members: GroupMember[];
  createdAt: number;
  creator: string;
}

interface GroupChatWindowProps {
  groupInfo: GroupInfo;
  messages: GroupMessage[];
  currentUser: string;
  isCurrentUserAdmin: boolean;
  typingUsers: string[]; // Array of usernames currently typing
  onSendMessage: (content: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberAddress: string) => void;
  onPromoteToAdmin: (memberAddress: string) => void;
  onLeaveGroup: () => void;
  onClose: () => void;
  chatBackground?: {
    type: "color" | "gradient" | "image" | "wallpaper";
    value: string;
    opacity?: number;
    blur?: number;
  };
  onChangeBackground?: () => void;
}

export default function GroupChatWindow({
  groupInfo,
  messages,
  currentUser,
  isCurrentUserAdmin,
  typingUsers,
  onSendMessage,
  onAddMember,
  onRemoveMember,
  onPromoteToAdmin,
  onLeaveGroup,
  onClose,
  chatBackground,
  onChangeBackground,
}: GroupChatWindowProps) {
  const [messageText, setMessageText] = useState("");
  const [showMemberList, setShowMemberList] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // GSAP animations on mount
  useEffect(() => {
    if (headerRef.current) {
      gsap.from(headerRef.current, {
        y: -50,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
      });
    }
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");

      // Button pop animation
      gsap.fromTo(
        ".send-btn",
        { scale: 1.2, rotate: 10 },
        { scale: 1, rotate: 0, duration: 0.3, ease: "back.out" }
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getBackgroundStyle = () => {
    if (!chatBackground) return {};

    const { type, value, opacity = 1, blur = 0 } = chatBackground;
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      zIndex: 0,
    };

    switch (type) {
      case "color":
        return { ...baseStyle, backgroundColor: value, opacity };
      case "gradient":
        return { ...baseStyle, background: value, opacity };
      case "image":
      case "wallpaper":
        return {
          ...baseStyle,
          backgroundImage: `url(${value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `blur(${blur}px)`,
          opacity,
        };
      default:
        return baseStyle;
    }
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2)
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers[0]}, ${typingUsers[1]} and ${
      typingUsers.length - 2
    } others are typing...`;
  };

  const getReadStatus = (message: GroupMessage) => {
    if (!message.readBy || message.readBy.length === 0) {
      return { status: message.status, text: "" };
    }

    const totalMembers = groupInfo.memberCount;
    const readCount = message.readBy.length;

    if (readCount === totalMembers) {
      return { status: "read", text: "Read by all" };
    }
    return {
      status: "delivered",
      text: `Read by ${readCount}/${totalMembers}`,
    };
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20" />
      {chatBackground && (
        <motion.div
          style={getBackgroundStyle()}
          initial={{ opacity: 0 }}
          animate={{ opacity: chatBackground.opacity || 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Glassmorphic Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Header */}
      <div
        ref={headerRef}
        className="relative z-10 bg-gradient-to-r from-purple-900/60 via-blue-900/60 to-purple-900/60 backdrop-blur-xl border-b border-white/10 p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setShowMemberList(true)}
              className="relative group"
            >
              {groupInfo.imageUrl ? (
                <img
                  src={groupInfo.imageUrl}
                  alt={groupInfo.name}
                  className="w-12 h-12 rounded-full border-2 border-blue-400/50 group-hover:border-blue-400 transition-all"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-2 border-blue-400/50 group-hover:border-blue-400 transition-all">
                  <Users className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full px-1.5 py-0.5 border border-blue-400/30">
                <span className="text-[10px] text-blue-400 font-semibold">
                  {groupInfo.memberCount}
                </span>
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                {groupInfo.name}
              </h2>
              <p className="text-xs text-gray-300 truncate">
                {groupInfo.members.filter((m) => m.isOnline).length} online •{" "}
                {groupInfo.memberCount} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onChangeBackground && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onChangeBackground}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-300" />
              </motion.button>
            )}

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <MoreVertical className="w-5 h-5 text-gray-300" />
              </motion.button>

              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl overflow-hidden"
                  >
                    {isCurrentUserAdmin && (
                      <button
                        onClick={() => {
                          onAddMember();
                          setShowOptions(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2 transition-all"
                      >
                        <UserPlus className="w-4 h-4 text-green-400" />
                        Add Member
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMemberList(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2 transition-all"
                    >
                      <Users className="w-4 h-4 text-blue-400" />
                      View Members
                    </button>
                    <button
                      onClick={() => {
                        onLeaveGroup();
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-all border-t border-white/5"
                    >
                      <X className="w-4 h-4" />
                      Leave Group
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 transition-all"
            >
              <X className="w-5 h-5 text-gray-300 hover:text-red-400" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            const readStatus = message.isMe ? getReadStatus(message) : null;

            return (
              <motion.div
                key={message.txHash}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  delay: index * 0.03,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className={`flex gap-2 ${
                  message.isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!message.isMe && (
                  <img
                    src={message.senderAvatar}
                    alt={message.senderName}
                    className="w-8 h-8 rounded-full border border-white/20 flex-shrink-0"
                  />
                )}

                <div
                  className={`max-w-[70%] ${
                    message.isMe ? "items-end" : "items-start"
                  } flex flex-col gap-1`}
                >
                  {!message.isMe && (
                    <span className="text-xs text-blue-400 font-medium px-1">
                      {message.senderName}
                    </span>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl backdrop-blur-xl border ${
                      message.isMe
                        ? "bg-gradient-to-br from-blue-600/80 to-purple-600/80 border-blue-400/30 rounded-br-sm"
                        : "bg-gray-800/80 border-white/10 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-white text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {readStatus && (
                      <div className="flex items-center gap-1">
                        {/* Message Status Tick */}
                        <svg
                          width="16"
                          height="12"
                          viewBox="0 0 16 12"
                          className={
                            readStatus.status === "read"
                              ? "text-blue-400"
                              : "text-gray-400"
                          }
                        >
                          {/* First checkmark */}
                          <path
                            d="M1 6L5 10L13 2"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Second checkmark (for delivered/read) */}
                          {(readStatus.status === "delivered" ||
                            readStatus.status === "read") && (
                            <path
                              d="M4 6L8 10L16 2"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                        {readStatus.text && (
                          <span className="text-[9px] text-gray-400">
                            {readStatus.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {message.isMe && (
                  <img
                    src={message.senderAvatar}
                    alt="You"
                    className="w-8 h-8 rounded-full border border-blue-400/50 flex-shrink-0"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10 px-4 py-2"
          >
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-full px-4 py-2 inline-flex items-center gap-2 border border-white/10">
              <div className="flex gap-1">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-blue-400"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-blue-400"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-blue-400"
                />
              </div>
              <span className="text-xs text-gray-300">{getTypingText()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="relative z-10 bg-gradient-to-r from-gray-900/80 via-purple-900/40 to-gray-900/80 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <Paperclip className="w-5 h-5 text-gray-300" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <ImageIcon className="w-5 h-5 text-gray-300" />
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${groupInfo.name}...`}
            className="flex-1 bg-gray-800/50 text-white px-4 py-3 rounded-full border border-white/10 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all placeholder-gray-400"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!messageText.trim()}
            className="send-btn p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 border border-blue-400/30 disabled:border-gray-600 transition-all shadow-lg disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Member List Modal */}
      <AnimatePresence>
        {showMemberList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowMemberList(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 backdrop-blur-xl p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Group Members
                      </h3>
                      <p className="text-sm text-gray-300">
                        {groupInfo.memberCount} members
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMemberList(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Member List */}
              <div className="overflow-y-auto max-h-96 p-4 space-y-2 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
                <AnimatePresence>
                  {groupInfo.members.map((member, index) => (
                    <motion.div
                      key={member.address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <img
                            src={member.avatar}
                            alt={member.username}
                            className="w-10 h-10 rounded-full border-2 border-white/20"
                          />
                          {member.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {member.username}
                            </p>
                            {member.isAdmin && (
                              <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {member.isOnline
                              ? "Online"
                              : member.lastSeen
                              ? `Last seen ${new Date(
                                  member.lastSeen
                                ).toLocaleString()}`
                              : "Offline"}
                          </p>
                        </div>
                      </div>

                      {isCurrentUserAdmin && member.address !== currentUser && (
                        <div className="flex items-center gap-1">
                          {!member.isAdmin && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onPromoteToAdmin(member.address)}
                              className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 transition-all"
                              title="Promote to Admin"
                            >
                              <Crown className="w-4 h-4 text-yellow-400" />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onRemoveMember(member.address)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all"
                            title="Remove Member"
                          >
                            <UserMinus className="w-4 h-4 text-red-400" />
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
