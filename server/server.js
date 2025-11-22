const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

// Store connected users: { walletAddress: socketId }
const connectedUsers = new Map();
// Track active calls: { walletAddress: { inCall: boolean, with: walletAddress } }
const activeCalls = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // User registers with wallet address
  socket.on("register", (walletAddress) => {
    console.log("📝 User registered:", walletAddress);
    connectedUsers.set(walletAddress.toLowerCase(), socket.id);
    socket.walletAddress = walletAddress.toLowerCase();

    // Notify others that user is online
    socket.broadcast.emit("user-online", walletAddress);
  });

  // Real-time message event
  socket.on("new-message", (data) => {
    const { recipient, sender, content, timestamp, txHash } = data;
    const recipientSocketId = connectedUsers.get(recipient.toLowerCase());

    console.log("New message:", { sender, recipient, content });

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive-message", {
        sender,
        recipient,
        content,
        timestamp,
        txHash,
        status: "pending",
      });
      console.log("Message delivered to:", recipient);
    }
  });

  // Message confirmation (blockchain confirmed)
  socket.on("message-confirmed", (data) => {
    const { txHash, recipient } = data;
    const recipientSocketId = connectedUsers.get(recipient.toLowerCase());

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("message-status", {
        txHash,
        status: "confirmed",
      });
    }
  });

  // WebRTC Signaling for Voice/Video Calls

  // Call offer
  socket.on("call-offer", (data) => {
    const { recipient, offer, callType } = data; // callType: 'voice' | 'video'
    const recipientSocketId = connectedUsers.get(recipient.toLowerCase());

    console.log("📞 Call offer:", {
      caller: socket.walletAddress,
      recipient,
      callType,
    });

    // Check if recipient is busy
    if (activeCalls.get(recipient.toLowerCase())?.inCall) {
      console.log("📵 Recipient is busy:", recipient);
      socket.emit("call-busy", { from: recipient });
      return;
    }

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("incoming-call", {
        caller: socket.walletAddress,
        offer,
        callType,
      });
    }
  });

  // Call answer
  socket.on("call-answer", (data) => {
    const { caller, answer } = data;
    const callerSocketId = connectedUsers.get(caller.toLowerCase());

    console.log("✅ Call answered:", {
      caller,
      answerer: socket.walletAddress,
    });

    // Mark both users as in call
    activeCalls.set(socket.walletAddress, {
      inCall: true,
      with: caller.toLowerCase(),
    });
    activeCalls.set(caller.toLowerCase(), {
      inCall: true,
      with: socket.walletAddress,
    });

    if (callerSocketId) {
      io.to(callerSocketId).emit("call-answered", {
        answerer: socket.walletAddress,
        answer,
      });
    }
  });

  // ICE candidate
  socket.on("ice-candidate", (data) => {
    const { recipient, candidate } = data;
    const recipientSocketId = connectedUsers.get(recipient.toLowerCase());

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("ice-candidate", {
        sender: socket.walletAddress,
        candidate,
      });
    }
  });

  // Call end
  socket.on("call-end", (data) => {
    const { recipient } = data;
    const recipientSocketId = connectedUsers.get(recipient.toLowerCase());

    console.log("☎️ Call ended:", { caller: socket.walletAddress, recipient });

    // Clear active call status for both users
    activeCalls.delete(socket.walletAddress);
    activeCalls.delete(recipient.toLowerCase());

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-ended", {
        caller: socket.walletAddress,
      });
    }
  });

  // Call reject
  socket.on("call-reject", (data) => {
    const { caller } = data;
    const callerSocketId = connectedUsers.get(caller.toLowerCase());

    console.log("❌ Call rejected by:", socket.walletAddress);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected", {
        recipient: socket.walletAddress,
      });
    }
  });

  // Busy signal
  socket.on("call-busy", (data) => {
    const { caller } = data;
    const callerSocketId = connectedUsers.get(caller.toLowerCase());

    if (callerSocketId) {
      console.log("📵 Sending busy signal to:", caller);
      io.to(callerSocketId).emit("call-busy", {
        from: socket.walletAddress,
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
    if (socket.walletAddress) {
      // If user was in a call, notify the other peer
      const activeCall = activeCalls.get(socket.walletAddress);
      if (activeCall && activeCall.with) {
        const peerSocket = connectedUsers.get(activeCall.with);
        if (peerSocket) {
          io.to(peerSocket).emit("call-ended", {
            caller: socket.walletAddress,
          });
        }
      }

      connectedUsers.delete(socket.walletAddress);
      activeCalls.delete(socket.walletAddress);
      socket.broadcast.emit("user-offline", socket.walletAddress);
    }
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
