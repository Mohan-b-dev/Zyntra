"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

interface UserPresence {
  address: string;
  isOnline: boolean;
  presenceState?: "active" | "away" | "offline";
  lastSeen: number;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (recipient: string, content: string, txHash: string) => void;
  confirmMessage: (txHash: string, recipient: string) => void;
  onNewMessage: (callback: (data: any) => void) => void;
  onMessageStatus: (callback: (data: any) => void) => void;
  userPresence: Map<string, UserPresence>;
  checkUserPresence: (address: string) => void;
  onPresenceUpdate: (callback: (data: UserPresence) => void) => () => void;
  markMessagesAsRead: (txHashes: string[], chatAddress: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  walletAddress: string | null;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3002";

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  walletAddress,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const messageCallbacksRef = useRef<Array<(data: any) => void>>([]);
  const statusCallbacksRef = useRef<Array<(data: any) => void>>([]);
  const presenceCallbacksRef = useRef<Array<(data: UserPresence) => void>>([]);

  useEffect(() => {
    if (!walletAddress) return;

    console.log("🔌 [WebSocket] Connecting to:", SOCKET_URL);

    const socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketInstance.on("connect", () => {
      console.log("✅ [WebSocket] Connected");
      setIsConnected(true);
      socketInstance.emit("register", walletAddress);
      // Emit online status after a short delay to ensure registration completes
      setTimeout(() => {
        socketInstance.emit("set-online-status", { isOnline: true });
      }, 100);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ [WebSocket] Disconnected");
      setIsConnected(false);
    });

    // Send heartbeat every 5 seconds (server checks every 5s with 10s timeout)
    const heartbeatInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit("heartbeat");
      }
    }, 5000);

    // Handle window focus/blur for away state
    const handleFocus = () => {
      console.log("👁️ [WebSocket] Window focused - setting presence to active");
      if (socketInstance.connected) {
        socketInstance.emit("set-presence-state", { presenceState: "active" });
      }
    };

    const handleBlur = () => {
      console.log("💤 [WebSocket] Window blurred - setting presence to away");
      if (socketInstance.connected) {
        socketInstance.emit("set-presence-state", { presenceState: "away" });
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Set initial state based on document visibility
    if (document.hasFocus()) {
      setTimeout(() => {
        if (socketInstance.connected) {
          socketInstance.emit("set-presence-state", {
            presenceState: "active",
          });
        }
      }, 200);
    }

    // PROTOCOL: Handle incoming messages from server
    socketInstance.on("server:message-incoming", (data) => {
      console.log("📨 [PROTOCOL] server:message-incoming:", {
        messageId: data.messageId?.slice(0, 10),
        from: data.sender?.slice(0, 10),
      });

      // Step 3b: Immediately acknowledge receipt to server (DELIVERED)
      if (data.messageId || data.txHash) {
        socketInstance.emit("client:message-received", {
          messageId: data.messageId || data.txHash,
          txHash: data.txHash,
        });
        console.log("📬 [PROTOCOL] client:message-received → server");
      }

      // Pass to message callbacks
      messageCallbacksRef.current.forEach((callback) => callback(data));
    });

    // Backward compatibility: map old event to new protocol
    socketInstance.on("receive-message", (data) => {
      console.log("📨 [WebSocket] receive-message (legacy):", data);
      socketInstance.emit("server:message-incoming", data);
    });

    // PROTOCOL: Message sent acknowledgement (SENT state for sender)
    socketInstance.on(
      "server:message-sent-ack",
      (data: {
        messageId: string;
        txHash?: string;
        serverTimestamp: number;
      }) => {
        console.log("✅ [PROTOCOL] server:message-sent-ack:", {
          messageId: data.messageId?.slice(0, 10),
          txHash: data.txHash?.slice(0, 10),
        });
        statusCallbacksRef.current.forEach((callback) =>
          callback({
            messageId: data.messageId,
            txHash: data.txHash || data.messageId,
            status: "sent",
            timestamp: data.serverTimestamp,
          })
        );
      }
    );

    // Backward compatibility
    socketInstance.on(
      "message-sent-ack",
      (data: { txHash: string; timestamp: number }) => {
        console.log("✅ [WebSocket] message-sent-ack (legacy):", data.txHash);
        statusCallbacksRef.current.forEach((callback) =>
          callback({
            messageId: data.txHash,
            txHash: data.txHash,
            status: "sent",
          })
        );
      }
    );

    socketInstance.on("message-status", (data) => {
      console.log("✅ [WebSocket] Message status update:", data);
      statusCallbacksRef.current.forEach((callback) => callback(data));
    });

    // PROTOCOL: Message delivered (DELIVERED state)
    socketInstance.on(
      "server:message-delivered",
      (data: {
        messageId: string;
        txHash?: string;
        deliveredAt: number;
        deliveredBy: string;
      }) => {
        console.log("📬 [PROTOCOL] server:message-delivered:", {
          messageId: data.messageId?.slice(0, 10),
          txHash: data.txHash?.slice(0, 10),
          by: data.deliveredBy?.slice(0, 10),
        });
        statusCallbacksRef.current.forEach((callback) =>
          callback({
            messageId: data.messageId,
            txHash: data.txHash || data.messageId,
            status: "delivered",
            timestamp: data.deliveredAt,
          })
        );
      }
    );

    // Backward compatibility
    socketInstance.on("message-delivered", (data) => {
      console.log("📬 [WebSocket] message-delivered (legacy):", data);
      statusCallbacksRef.current.forEach((callback) =>
        callback({
          messageId: data.txHash,
          txHash: data.txHash,
          status: "delivered",
        })
      );
    });

    // PROTOCOL: Message read (READ state)
    socketInstance.on(
      "server:message-read",
      (data: {
        messageId: string;
        txHash?: string;
        readAt: number;
        readBy: string;
      }) => {
        console.log("👁️ [PROTOCOL] server:message-read:", {
          messageId: data.messageId?.slice(0, 10),
          txHash: data.txHash?.slice(0, 10),
          by: data.readBy?.slice(0, 10),
        });
        statusCallbacksRef.current.forEach((callback) =>
          callback({
            messageId: data.messageId,
            txHash: data.txHash || data.messageId,
            status: "read",
            timestamp: data.readAt,
          })
        );
      }
    );

    // Backward compatibility
    socketInstance.on("message-read", (data) => {
      console.log("👁️ [WebSocket] message-read (legacy):", data);
      statusCallbacksRef.current.forEach((callback) =>
        callback({
          messageId: data.txHash,
          txHash: data.txHash,
          status: "read",
        })
      );
    });

    socketInstance.on("message-read-receipt", (data) => {
      console.log("👁️ [WebSocket] message-read-receipt (legacy):", data);
      statusCallbacksRef.current.forEach((callback) =>
        callback({
          messageId: data.txHash,
          txHash: data.txHash,
          status: "read",
        })
      );
    });

    // Presence events
    socketInstance.on(
      "user-online",
      (data: {
        address?: string;
        timestamp?: number;
        presenceState?: string;
      }) => {
        if (!data || !data.address) {
          console.warn(
            "⚠️ [WebSocket] Received user-online with no address:",
            data
          );
          return;
        }
        const normalizedAddress = data.address.toLowerCase();
        console.log(
          "🟢 [WebSocket] User online:",
          normalizedAddress,
          "state:",
          data.presenceState
        );
        const presenceData: UserPresence = {
          address: normalizedAddress,
          isOnline: true,
          presenceState: (data.presenceState as "active" | "away") || "active",
          lastSeen: data.timestamp || Date.now(),
        };
        setUserPresence((prev) => {
          const updated = new Map(prev);
          updated.set(normalizedAddress, presenceData);
          return updated;
        });
        presenceCallbacksRef.current.forEach((callback) =>
          callback(presenceData)
        );
      }
    );

    socketInstance.on(
      "user-offline",
      (data: {
        address?: string;
        lastSeen?: number;
        timestamp?: number;
        presenceState?: string;
      }) => {
        if (!data || !data.address) {
          console.warn(
            "⚠️ [WebSocket] Received user-offline with no address:",
            data
          );
          return;
        }
        const normalizedAddress = data.address.toLowerCase();
        console.log("⚫ [WebSocket] User offline:", normalizedAddress);
        const presenceData: UserPresence = {
          address: normalizedAddress,
          isOnline: false,
          presenceState: "offline",
          lastSeen: data.lastSeen || data.timestamp || Date.now(),
        };
        setUserPresence((prev) => {
          const updated = new Map(prev);
          updated.set(normalizedAddress, presenceData);
          return updated;
        });
        presenceCallbacksRef.current.forEach((callback) =>
          callback(presenceData)
        );
      }
    );

    socketInstance.on(
      "user-status-changed",
      (data: {
        address?: string;
        isOnline?: boolean;
        lastSeen?: number;
        presenceState?: string;
      }) => {
        if (!data || !data.address) {
          console.warn(
            "⚠️ [WebSocket] Received user-status-changed with no address:",
            data
          );
          return;
        }
        const normalizedAddress = data.address.toLowerCase();
        console.log(
          "📍 [WebSocket] User status changed:",
          normalizedAddress,
          "isOnline:",
          data.isOnline,
          "presence:",
          data.presenceState
        );
        const presenceData: UserPresence = {
          address: normalizedAddress,
          isOnline: data.isOnline ?? false,
          presenceState:
            (data.presenceState as "active" | "away" | "offline") || "offline",
          lastSeen: data.lastSeen || Date.now(),
        };
        setUserPresence((prev) => {
          const updated = new Map(prev);
          updated.set(normalizedAddress, presenceData);
          return updated;
        });
        presenceCallbacksRef.current.forEach((callback) =>
          callback(presenceData)
        );
      }
    );

    socketInstance.on(
      "presence-response",
      (data: {
        address: string;
        isOnline: boolean;
        lastSeen: number;
        presenceState?: string;
      }) => {
        console.log("📍 [WebSocket] Presence response:", data);
        const normalizedAddress = data.address.toLowerCase();
        const presenceData: UserPresence = {
          address: normalizedAddress,
          isOnline: data.isOnline,
          presenceState:
            (data.presenceState as "active" | "away" | "offline") ||
            (data.isOnline ? "active" : "offline"),
          lastSeen: data.lastSeen,
        };
        setUserPresence((prev) => {
          const updated = new Map(prev);
          updated.set(normalizedAddress, presenceData);
          return updated;
        });
        presenceCallbacksRef.current.forEach((callback) =>
          callback(presenceData)
        );
      }
    );

    setSocket(socketInstance);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      console.log("🔴 [WebSocket] Disconnecting");
      socketInstance.disconnect();
    };
  }, [walletAddress]);

  const sendMessage = useCallback(
    (recipient: string, content: string, txHash: string) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ [WebSocket] Socket not connected");
        return;
      }

      // Generate messageId for protocol tracking
      const messageId =
        txHash ||
        `msg-${walletAddress}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

      const messageData = {
        messageId,
        recipient,
        sender: walletAddress,
        content,
        timestamp: Math.floor(Date.now() / 1000),
        txHash,
      };

      console.log("📤 [PROTOCOL] Sending client:message-send:", {
        messageId: messageId.slice(0, 10),
        to: recipient.slice(0, 10),
      });

      // Use new protocol event
      socket.emit("client:message-send", messageData);

      // Backward compatibility - also emit old event
      socket.emit("new-message", messageData);
    },
    [socket, isConnected, walletAddress]
  );

  const confirmMessage = useCallback(
    (txHash: string, recipient: string) => {
      if (!socket || !isConnected) return;

      console.log("✅ [WebSocket] Confirming message:", txHash);
      socket.emit("message-confirmed", { txHash, recipient });
    },
    [socket, isConnected]
  );

  const onNewMessage = useCallback((callback: (data: any) => void) => {
    messageCallbacksRef.current.push(callback);
    return () => {
      messageCallbacksRef.current = messageCallbacksRef.current.filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  const onMessageStatus = useCallback((callback: (data: any) => void) => {
    statusCallbacksRef.current.push(callback);
    return () => {
      statusCallbacksRef.current = statusCallbacksRef.current.filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  const checkUserPresence = useCallback(
    (address: string) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ [WebSocket] Cannot check presence - not connected");
        return;
      }
      const normalizedAddress = address.toLowerCase();
      console.log("🔍 [WebSocket] Checking presence for:", normalizedAddress);
      socket.emit("get-user-status", { address: normalizedAddress });
    },
    [socket, isConnected]
  );

  const onPresenceUpdate = useCallback(
    (callback: (data: UserPresence) => void) => {
      presenceCallbacksRef.current.push(callback);
      return () => {
        presenceCallbacksRef.current = presenceCallbacksRef.current.filter(
          (cb) => cb !== callback
        );
      };
    },
    []
  );

  const markMessagesAsRead = useCallback(
    (txHashes: string[], chatAddress: string) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ [WebSocket] Cannot mark as read - not connected");
        return;
      }
      console.log("👁️ [WebSocket] Marking messages as read:", txHashes.length);
      txHashes.forEach((txHash) => {
        const payload = {
          messageId: txHash,
          txHash,
        };

        // New strict protocol
        socket.emit("client:message-read", payload);
        console.log(
          "📤 [PROTOCOL] client:message-read:",
          txHash?.slice(0, 10)
        );

        // Legacy fallback for older servers
        socket.emit("message-read", payload);
      });
    },
    [socket, isConnected, walletAddress]
  );

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        sendMessage,
        confirmMessage,
        onNewMessage,
        onMessageStatus,
        userPresence,
        checkUserPresence,
        onPresenceUpdate,
        markMessagesAsRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
