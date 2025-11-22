"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { UserCircle, Image as ImageIcon, MessageSquare } from "lucide-react";

export default function RegistrationModal() {
  const { registerUser, error, isUserRegistered } = useWeb3();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("Hey there! I'm using ChatDApp");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 3 || username.length > 20) {
      return;
    }

    setIsRegistering(true);
    await registerUser(username, avatarUrl, status);
    setIsRegistering(false);
  };

  if (isUserRegistered) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-8 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-2">
          Welcome to ChatDApp
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Create your profile to start messaging
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (3-20 characters)"
              minLength={3}
              maxLength={20}
              required
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {username.length}/20 characters
            </p>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <ImageIcon className="inline w-4 h-4 mr-1" />
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-1" />
              Status Message
            </label>
            <textarea
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={100}
              rows={3}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {status.length}/100 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isRegistering || username.length < 3}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRegistering ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Profile...</span>
              </>
            ) : (
              <span>Create Profile</span>
            )}
          </button>
        </form>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your username will be stored on the Celo blockchain
        </p>
      </div>
    </div>
  );
}
