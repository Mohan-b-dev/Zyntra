"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  Image as ImageIcon,
  Bell,
  BellOff,
  Trash2,
  Ban,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onViewMedia: () => void;
  onMute: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onBlock: () => void;
  isMuted?: boolean;
}

export default function ChatMenuDropdown({
  isOpen,
  onClose,
  onViewProfile,
  onViewMedia,
  onMute,
  onClearChat,
  onDeleteChat,
  onBlock,
  isMuted = false,
}: ChatMenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    {
      icon: UserCircle,
      label: "View Profile",
      onClick: onViewProfile,
      color: "text-blue-400",
    },
    {
      icon: ImageIcon,
      label: "Media, Links & Docs",
      onClick: onViewMedia,
      color: "text-purple-400",
    },
    {
      icon: isMuted ? Bell : BellOff,
      label: isMuted ? "Unmute" : "Mute",
      onClick: onMute,
      color: "text-yellow-400",
    },
    {
      icon: Trash2,
      label: "Clear Chat",
      onClick: onClearChat,
      color: "text-orange-400",
    },
    {
      icon: X,
      label: "Delete Chat",
      onClick: onDeleteChat,
      color: "text-red-400",
    },
    {
      icon: Ban,
      label: "Block",
      onClick: onBlock,
      color: "text-red-500",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-[100]"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors text-left group"
            >
              <item.icon
                className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`}
              />
              <span className="text-sm font-medium text-gray-200 group-hover:text-white">
                {item.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
