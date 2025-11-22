"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { X, Camera, User, MessageSquare } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, updateProfile, account } = useWeb3();
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [status, setStatus] = useState(currentUser?.status || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsUpdating(true);
    const success = await updateProfile(avatarUrl, status);
    setIsUpdating(false);

    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            {currentUser?.avatarUrl || avatarUrl ? (
              <img
                src={avatarUrl || currentUser?.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover mb-3"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            <button
              type="button"
              className="flex items-center space-x-2 text-blue-500 hover:text-blue-400 text-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Change Photo</span>
            </button>
          </div>

          {/* Username (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Username
            </label>
            <input
              type="text"
              value={currentUser?.username || ""}
              disabled
              className="w-full bg-gray-800 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Wallet Address (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={`${account?.slice(0, 6)}...${account?.slice(-4)}`}
              disabled
              className="w-full bg-gray-800 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Status Message
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <textarea
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Hey there! I'm using ChatDApp"
                maxLength={100}
                rows={3}
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {status.length}/100 characters
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
