"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3ContextV4";
import WalletButton from "@/components/WalletButton";
import RegistrationModal from "@/components/RegistrationModal";
import SidebarV2 from "@/components/SidebarV2";
import ChatWindowV2Enhanced from "@/components/ChatWindowV2Enhanced";
import ContactsList from "@/components/ContactsList";
import ProfileModal from "@/components/ProfileModal";
import PopupToast from "@/components/PopupToast";
import GlobalCallManager from "@/components/GlobalCallManager";
import { MessageCircle } from "lucide-react";

export default function HomePage() {
  const {
    account,
    isUserRegistered,
    setSelectedChat,
    selectedChat,
    toasts,
    removeToast,
  } = useWeb3();
  const [showContacts, setShowContacts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedChatName, setSelectedChatName] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);

  const handleSelectChat = (address: string, username: string) => {
    setSelectedChat(address);
    setSelectedChatName(username);
    setIsMobileView(true);
  };

  const handleBack = () => {
    setIsMobileView(false);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            ChatDApp{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              v3.0
            </span>
          </h1>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Decentralized messaging platform with WhatsApp-like features.
            Connect your wallet to start private conversations on the
            blockchain.
          </p>
          <WalletButton />
          <div className="mt-8 text-sm text-gray-500">
            <p>✓ Private 1-to-1 Messaging</p>
            <p>✓ User Profiles & Status</p>
            <p>✓ Message Reactions</p>
            <p>✓ Powered by Celo Network</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isUserRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <RegistrationModal />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Global Call Manager - Handles all incoming/outgoing calls */}
      <GlobalCallManager
        currentRoute={selectedChat ? "chat" : "home"}
        currentChatAddress={selectedChat}
      />

      {/* Main Chat Interface - Responsive layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Sidebar - Slides in/out on mobile, always visible on desktop */}
        <div
          className={`${
            isMobileView && selectedChat ? "hidden" : "flex"
          } md:flex w-full md:w-auto flex-shrink-0`}
        >
          <SidebarV2
            onSelectChat={handleSelectChat}
            selectedChat={selectedChat}
            onOpenContacts={() => setShowContacts(true)}
            onOpenProfile={() => setShowProfile(true)}
          />
        </div>

        {/* Chat Window or Welcome Screen */}
        {selectedChat ? (
          <div
            className={`${
              isMobileView ? "flex" : "hidden md:flex"
            } flex-1 w-full md:w-auto absolute md:relative inset-0 md:inset-auto z-10 md:z-auto`}
          >
            <ChatWindowV2Enhanced
              selectedChat={selectedChat}
              selectedChatName={selectedChatName}
              onBack={handleBack}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-16 h-16 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                ChatDApp v3.0
              </h2>
              <p className="text-gray-400 mb-6">
                Select a chat to start messaging
              </p>
              <button
                onClick={() => setShowContacts(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ContactsList
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
        onSelectContact={handleSelectChat}
      />
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Toast Notifications */}
      <PopupToast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
