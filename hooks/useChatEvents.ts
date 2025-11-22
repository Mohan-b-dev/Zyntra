"use client";

import { useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";

interface ChatEventsConfig {
  contractAddress: string;
  contractABI: any[];
  onPrivateMessage?: (event: any) => void;
  onMessageRead?: (event: any) => void;
  onMessageDeleted?: (event: any) => void;
  onMessageReacted?: (event: any) => void;
  onUserRegistered?: (event: any) => void;
  enabled?: boolean;
}

export function useChatEvents({
  contractAddress,
  contractABI,
  onPrivateMessage,
  onMessageRead,
  onMessageDeleted,
  onMessageReacted,
  onUserRegistered,
  enabled = true,
}: ChatEventsConfig) {
  const providerRef = useRef<ethers.WebSocketProvider | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket RPC URL for Celo Sepolia
  const WS_RPC_URL = "wss://alfajores-forno.celo-testnet.org/ws";

  const setupListeners = useCallback(() => {
    if (!contractRef.current) return;

    const contract = contractRef.current;

    // Remove existing listeners
    contract.removeAllListeners();

    // PrivateMessageSent event
    if (onPrivateMessage) {
      contract.on(
        "PrivateMessageSent",
        (
          chatId,
          sender,
          recipient,
          messageIndex,
          timestamp,
          preview,
          event
        ) => {
          console.log("📨 New private message:", {
            chatId,
            sender,
            recipient,
            messageIndex: messageIndex.toString(),
            timestamp: timestamp.toString(),
            preview,
          });
          onPrivateMessage({
            chatId,
            sender,
            recipient,
            messageIndex: messageIndex.toString(),
            timestamp: timestamp.toString(),
            preview,
            event,
          });
        }
      );
    }

    // MessageRead event
    if (onMessageRead) {
      contract.on("MessageRead", (chatId, messageIndex, reader, event) => {
        console.log("✓✓ Message read:", {
          chatId,
          messageIndex: messageIndex.toString(),
          reader,
        });
        onMessageRead({
          chatId,
          messageIndex: messageIndex.toString(),
          reader,
          event,
        });
      });
    }

    // MessageDeleted event
    if (onMessageDeleted) {
      contract.on("MessageDeleted", (chatId, messageIndex, deleter, event) => {
        console.log("🗑️ Message deleted:", {
          chatId,
          messageIndex: messageIndex.toString(),
          deleter,
        });
        onMessageDeleted({
          chatId,
          messageIndex: messageIndex.toString(),
          deleter,
          event,
        });
      });
    }

    // MessageReacted event
    if (onMessageReacted) {
      contract.on(
        "MessageReacted",
        (chatId, messageIndex, reactor, emoji, event) => {
          console.log("❤️ Message reacted:", {
            chatId,
            messageIndex: messageIndex.toString(),
            reactor,
            emoji,
          });
          onMessageReacted({
            chatId,
            messageIndex: messageIndex.toString(),
            reactor,
            emoji,
            event,
          });
        }
      );
    }

    // UserRegistered event
    if (onUserRegistered) {
      contract.on("UserRegistered", (user, username, timestamp, event) => {
        console.log("👤 New user registered:", {
          user,
          username,
          timestamp: timestamp.toString(),
        });
        onUserRegistered({
          user,
          username,
          timestamp: timestamp.toString(),
          event,
        });
      });
    }

    console.log("✅ Event listeners setup complete");
  }, [
    onPrivateMessage,
    onMessageRead,
    onMessageDeleted,
    onMessageReacted,
    onUserRegistered,
  ]);

  const connect = useCallback(async () => {
    try {
      console.log("🔌 Connecting to WebSocket RPC...");

      // Create WebSocket provider
      const provider = new ethers.WebSocketProvider(WS_RPC_URL);
      providerRef.current = provider;

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      contractRef.current = contract;

      // Setup event listeners
      setupListeners();

      // Reset reconnect attempts on successful connection
      reconnectAttemptsRef.current = 0;

      // Handle provider errors
      provider.on("error", (error: Error) => {
        console.error("❌ Provider error:", error);
      });

      console.log("✅ Connected to WebSocket RPC");
    } catch (error) {
      console.error("❌ Failed to connect to WebSocket:", error);
      if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    }
  }, [contractAddress, contractABI, enabled, setupListeners]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting WebSocket...");

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Remove contract listeners
    if (contractRef.current) {
      contractRef.current.removeAllListeners();
      contractRef.current = null;
    }

    // Destroy provider
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    console.log("✅ WebSocket disconnected");
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect on page focus
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      console.log("👀 Page focused, checking connection...");
      if (!providerRef.current) {
        console.log("🔄 Reconnecting...");
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, connect]);

  // Reconnect on network reconnect
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      console.log("🌐 Network reconnected, reconnecting WebSocket...");
      reconnectAttemptsRef.current = 0;
      connect();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, connect]);

  return {
    isConnected: !!providerRef.current,
    reconnect: connect,
    disconnect,
  };
}
