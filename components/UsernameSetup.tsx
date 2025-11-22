"use client";

import { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";

export default function UsernameSetup() {
  const { registerUser, isCheckingRegistration } = useWeb3();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(username);
    } catch (err: any) {
      setError(err.message || "Failed to register username");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingRegistration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="glass-card p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            <p className="text-gray-300">Checking registration status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-card p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Welcome to ChatDApp
          </h2>
          <p className="text-gray-400">Choose a username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-white placeholder-gray-500"
              disabled={isLoading}
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full py-3 px-6 rounded-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Registering...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>
              Your username will be stored on the blockchain and cannot be
              changed. Choose wisely!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
