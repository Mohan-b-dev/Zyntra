"use client";

import { useMemo } from "react";

interface PrivateMessage {
  sender: string;
  recipient: string;
  content: string;
  timestamp: any;
  isRead?: boolean;
  isDeleted?: boolean;
  messageType?: string;
}

/**
 * Hook to filter private messages for the active chat.
 * Rules:
 *  - Return messages where (sender === connectedUser AND recipient === activeUser)
 *    OR (recipient === connectedUser AND sender === activeUser)
 *  - For group chats (selectedChat === 'group'), return all messages
 */
export default function useFilteredMessages(
  messages: PrivateMessage[],
  selectedChat: string | null,
  connectedAccount: string | null
) {
  return useMemo(() => {
    console.log("🔍 [useFilteredMessages] Filtering messages:", {
      totalMessages: messages.length,
      selectedChat: selectedChat?.slice(0, 10) + "..." || "null",
      connectedAccount: connectedAccount?.slice(0, 10) + "..." || "null",
    });

    if (!selectedChat || !connectedAccount) {
      console.log(
        "🔍 [useFilteredMessages] No selectedChat or connectedAccount, returning empty array"
      );
      return [];
    }

    const sel = selectedChat.toLowerCase();
    const acc = connectedAccount.toLowerCase();

    // If the app has a convention for group chats, detect it here
    if (sel === "group" || sel === "all") {
      console.log(
        "🔍 [useFilteredMessages] Group chat detected, returning all messages"
      );
      return messages;
    }

    const filtered = messages.filter((msg) => {
      if (!msg || !msg.sender || !msg.recipient) {
        console.warn("🔍 [useFilteredMessages] Invalid message:", msg);
        return false;
      }
      const sender = msg.sender.toLowerCase();
      const recipient = msg.recipient.toLowerCase();

      const a = sender === acc && recipient === sel;
      const b = recipient === acc && sender === sel;

      const match = a || b;

      if (match) {
        console.log("✅ [useFilteredMessages] Message matched:", {
          from: msg.sender.slice(0, 10) + "...",
          to: msg.recipient.slice(0, 10) + "...",
          content:
            msg.content.slice(0, 30) + (msg.content.length > 30 ? "..." : ""),
        });
      }

      return match;
    });

    console.log(
      `✅ [useFilteredMessages] Filtered ${filtered.length} messages out of ${messages.length} total`
    );
    return filtered;
  }, [messages, selectedChat, connectedAccount]);
}
