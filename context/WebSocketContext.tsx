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

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (recipient: string, content: string, txHash: string) => void;
  confirmMessage: (txHash: string, recipient: string) => void;
  onNewMessage: (callback: (data: any) => void) => void;
  onMessageStatus: (callback: (data: any) => void) => void;
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
  const messageCallbacksRef = useRef<Array<(data: any) => void>>([]);
  const statusCallbacksRef = useRef<Array<(data: any) => void>>([]);

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
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ [WebSocket] Disconnected");
      setIsConnected(false);
    });

    socketInstance.on("receive-message", (data) => {
      console.log("📨 [WebSocket] Message received:", data);
      messageCallbacksRef.current.forEach((callback) => callback(data));
    });

    socketInstance.on("message-status", (data) => {
      console.log("✅ [WebSocket] Message status update:", data);
      statusCallbacksRef.current.forEach((callback) => callback(data));
    });

    setSocket(socketInstance);

    return () => {
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

      const messageData = {
        recipient,
        sender: walletAddress,
        content,
        timestamp: Math.floor(Date.now() / 1000),
        txHash,
      };

      console.log("📤 [WebSocket] Sending message:", messageData);
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

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        sendMessage,
        confirmMessage,
        onNewMessage,
        onMessageStatus,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
