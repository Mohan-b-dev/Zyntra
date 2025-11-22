"use client";

import React from "react";
import { useWeb3 } from "@/context/Web3ContextV4";

export default function WalletButton() {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getInitials = (address: string) => {
    return address.slice(2, 4).toUpperCase();
  };

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-800/60 backdrop-blur rounded-xl px-4 py-2 border border-gray-700/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            {getInitials(account)}
          </div>
          <span className="text-gray-200 font-mono text-sm">
            {formatAddress(account)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-medium backdrop-blur"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
