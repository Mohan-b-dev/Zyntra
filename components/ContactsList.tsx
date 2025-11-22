"use client";

import React, { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import { Search, X, MessageCircle } from "lucide-react";

interface ContactsListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (address: string, username: string) => void;
}

export default function ContactsList({
  isOpen,
  onClose,
  onSelectContact,
}: ContactsListProps) {
  const { getAllUsers, searchUsers, contract } = useWeb3();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers(0, 50);
      setUsers(allUsers);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsLoading(true);
      const results = await searchUsers(query);
      setUsers(results);
      setIsLoading(false);
    } else {
      loadUsers();
    }
  };

  const handleSelectContact = async (username: string) => {
    if (!contract) return;

    try {
      const address = await contract.getAddressByUsername(username);
      onSelectContact(address, username);
      onClose();
    } catch (err) {
      console.error("Error getting user address:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            users.map((user, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectContact(user.username)}
                className="p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors flex items-center space-x-3"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {user.username}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">
                    {user.status || "Hey there! I'm using ChatDApp"}
                  </p>
                </div>
                <MessageCircle className="w-5 h-5 text-blue-500" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
