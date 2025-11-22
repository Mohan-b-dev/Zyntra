# ChatDApp v4.0 - Integration Code Snippets

## 1. Update app/layout.tsx

```tsx
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Web3Provider } from "@/context/Web3ContextV4";
import ParticlesBackground from "@/components/ParticlesBackground";
import "@/styles/glassmorphism.css";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <WebSocketProvider>
            <ParticlesBackground />
            {children}
          </WebSocketProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
```

---

## 2. Update context/Web3ContextV4.tsx

Add these imports at the top:

```tsx
import { useWebSocket } from "./WebSocketContext";
```

Inside your `Web3Provider` component, add:

```tsx
export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  // Existing state...
  const webSocket = useWebSocket(); // ADD THIS

  // Update sendPrivateMessage function:
  const sendPrivateMessage = async (recipient: string, content: string) => {
    if (!contract || !currentAddress) {
      throw new Error("Contract not initialized or user not connected");
    }

    try {
      console.log("📤 Sending message:", { recipient, content });

      // 1. Show optimistic UI immediately
      const optimisticMessage: PrivateMessage = {
        sender: currentAddress,
        recipient,
        content,
        timestamp: BigInt(Date.now()),
        isRead: false,
        isDeleted: false,
        messageType: "text",
        status: "sending", // Add this property
      };

      setPrivateMessages((prev) => [...prev, optimisticMessage]);

      // 2. Submit to blockchain
      const tx = await contract.sendPrivateMessage(recipient, content, "text");
      console.log("📝 Transaction submitted:", tx.hash);

      // 3. Send via WebSocket for instant delivery
      if (webSocket?.isConnected) {
        webSocket.sendMessage(recipient, content, tx.hash);
        console.log("🔌 WebSocket message sent");

        // Update status to 'sent'
        setPrivateMessages((prev) =>
          prev.map((msg) =>
            msg.timestamp === optimisticMessage.timestamp
              ? { ...msg, status: "sent" }
              : msg
          )
        );
      }

      // 4. Wait for blockchain confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt.transactionHash);

      // 5. Notify confirmation via WebSocket
      if (webSocket?.isConnected) {
        webSocket.confirmMessage(tx.hash, recipient);
      }

      // 6. Update status to 'confirmed'
      setPrivateMessages((prev) =>
        prev.map((msg) =>
          msg.timestamp === optimisticMessage.timestamp
            ? { ...msg, status: "confirmed" }
            : msg
        )
      );

      // 7. Reload chats to update sidebar
      await loadUserChats();

      return receipt;
    } catch (error) {
      console.error("❌ Error sending message:", error);

      // Remove optimistic message on error
      setPrivateMessages((prev) =>
        prev.filter((msg) => msg.timestamp !== optimisticMessage.timestamp)
      );

      throw error;
    }
  };

  // Listen for incoming WebSocket messages
  useEffect(() => {
    if (!webSocket) return;

    console.log("👂 Setting up WebSocket message listener");

    const unsubscribe = webSocket.onNewMessage((data) => {
      console.log("📨 Received WebSocket message:", data);

      // Add message instantly
      const newMessage: PrivateMessage = {
        sender: data.sender,
        recipient: data.recipient,
        content: data.content,
        timestamp: BigInt(data.timestamp),
        isRead: false,
        isDeleted: false,
        messageType: "text",
        status: "pending", // Will be updated when blockchain confirms
      };

      setPrivateMessages((prev) => {
        // Check if message already exists (avoid duplicates)
        const exists = prev.some(
          (msg) =>
            msg.sender.toLowerCase() === data.sender.toLowerCase() &&
            msg.timestamp === BigInt(data.timestamp)
        );

        if (exists) {
          console.log("⚠️ Message already exists, skipping");
          return prev;
        }

        console.log("✅ Added new message to state");
        return [...prev, newMessage];
      });

      // Update sidebar
      loadUserChats();
    });

    return unsubscribe;
  }, [webSocket, currentAddress]);

  // Listen for message confirmations
  useEffect(() => {
    if (!webSocket) return;

    console.log("👂 Setting up WebSocket confirmation listener");

    const unsubscribe = webSocket.onMessageStatus((data) => {
      console.log("✅ Received message confirmation:", data);

      setPrivateMessages((prev) =>
        prev.map((msg) => {
          // Update message status based on transaction hash or timestamp
          if (
            msg.timestamp === BigInt(data.timestamp) ||
            (msg.txHash && msg.txHash === data.txHash)
          ) {
            return { ...msg, status: "confirmed" };
          }
          return msg;
        })
      );
    });

    return unsubscribe;
  }, [webSocket]);

  // Reduce polling interval since we have WebSocket
  useEffect(() => {
    if (!selectedChat || !currentAddress) return;

    // Increase polling to 60 seconds (backup sync only)
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling for updates (backup)");
      loadChatMessages(selectedChat, true);
    }, 60000); // 60 seconds instead of 10

    return () => clearInterval(pollInterval);
  }, [selectedChat, currentAddress, contract]);

  // Rest of your existing code...
};
```

---

## 3. Update components/ChatWindowV2.tsx

Add these imports:

```tsx
import { useWebRTC } from "@/hooks/useWebRTC";
import IncomingCallModal from "@/components/IncomingCallModal";
import CallScreen from "@/components/CallScreen";
import { Phone, Video, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
```

Inside your component:

```tsx
export default function ChatWindowV2() {
  const { selectedChat, privateMessages, sendPrivateMessage } = useWeb3();
  const [messageInput, setMessageInput] = useState("");

  // Add WebRTC hook
  const {
    callStatus,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useWebRTC();

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    try {
      await sendPrivateMessage(selectedChat, messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header with call buttons */}
      <div className="glass-card p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {selectedChat?.[0]?.toUpperCase() || "?"}
          </div>

          {/* User info */}
          <div>
            <h3 className="text-white font-semibold">
              {selectedChat?.slice(0, 6)}...{selectedChat?.slice(-4)}
            </h3>
            <p className="text-sm text-gray-400">Online</p>
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startCall(selectedChat, "voice")}
            className="glass-button p-3 text-white"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startCall(selectedChat, "video")}
            className="glass-button p-3 text-white"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 glass-scrollbar">
        <AnimatePresence>
          {privateMessages.map((message, index) => {
            const isSent =
              message.sender.toLowerCase() === currentAddress?.toLowerCase();

            return (
              <motion.div
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    isSent ? "message-bubble-sent" : "message-bubble-received"
                  }`}
                >
                  <p className="text-white break-words">{message.content}</p>

                  {/* Message metadata */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                    <span>
                      {new Date(Number(message.timestamp)).toLocaleTimeString()}
                    </span>

                    {/* Status indicator */}
                    {isSent && (
                      <span className="flex items-center gap-1">
                        {message.status === "sending" && (
                          <span className="text-gray-400">⏳</span>
                        )}
                        {message.status === "sent" && (
                          <span className="text-blue-400">✓</span>
                        )}
                        {message.status === "confirmed" && (
                          <span className="text-green-400">✓✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Message input */}
      <div className="glass-card p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 glass-input px-4 py-3 text-white placeholder-gray-400"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="glass-button px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Incoming call modal */}
      {incomingCall && (
        <IncomingCallModal
          callerAddress={incomingCall.from}
          callType={incomingCall.type}
          onAccept={answerCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call screen */}
      {callStatus === "connected" && selectedChat && (
        <CallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          callType={incomingCall?.type || "voice"}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          callDuration={callDuration}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onEndCall={endCall}
          remoteAddress={selectedChat}
        />
      )}
    </div>
  );
}
```

---

## 4. Update components/SidebarV2.tsx

Add WebSocket for instant updates:

```tsx
import { useWebSocket } from "@/context/WebSocketContext";
import { useEffect } from "react";

export default function SidebarV2() {
  const { userChats, loadUserChats } = useWeb3();
  const webSocket = useWebSocket();

  // Listen for new messages to update sidebar
  useEffect(() => {
    if (!webSocket) return;

    const unsubscribe = webSocket.onNewMessage((data) => {
      // Refresh chat list immediately
      loadUserChats();
    });

    return unsubscribe;
  }, [webSocket, loadUserChats]);

  return (
    <div className="sidebar-glass h-full">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">Messages</h2>
      </div>

      <div className="overflow-y-auto glass-scrollbar">
        {userChats.map((chat) => (
          <div
            key={chat.address}
            className={`chat-item-glass p-4 cursor-pointer ${
              selectedChat === chat.address ? "active" : ""
            }`}
            onClick={() => setSelectedChat(chat.address)}
          >
            {/* Chat avatar */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {chat.address[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold truncate">
                    {chat.address.slice(0, 6)}...{chat.address.slice(-4)}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {new Date(
                      Number(chat.lastMessageTime) * 1000
                    ).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-sm text-gray-400 truncate">
                  {chat.lastMessage}
                </p>
              </div>

              {/* Unread count */}
              {chat.unreadCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Update app/globals.css

Add at the top:

```css
@import "../styles/glassmorphism.css";

/* Your existing styles... */
```

---

## 6. Add TypeScript type for message status

Update your types (e.g., in `types/index.ts` or at the top of Web3ContextV4.tsx):

```tsx
export interface PrivateMessage {
  sender: string;
  recipient: string;
  content: string;
  timestamp: bigint;
  isRead: boolean;
  isDeleted: boolean;
  messageType: string;
  status?: "sending" | "sent" | "pending" | "confirmed"; // ADD THIS
  txHash?: string; // Optional transaction hash
}
```

---

## 7. Start the servers

**Terminal 1 - WebSocket Server:**

```bash
cd server
npm start
```

**Terminal 2 - Next.js App:**

```bash
npm run dev
```

---

## 8. Test the integration

1. Open two browsers with different wallets
2. Send a message - should appear instantly (<1 second)
3. Click voice/video call button - should pop up on other browser
4. Accept call - should hear/see each other

---

## 🎉 That's it!

Your ChatDApp v4.0 is now fully integrated with:

- ✅ Real-time messaging
- ✅ Voice/video calling
- ✅ Glass-morphism UI
- ✅ Smooth animations
- ✅ Instant sidebar updates

**Enjoy your professional Web3 chat app! 🚀**
