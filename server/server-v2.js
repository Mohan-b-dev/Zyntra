const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST"],
  },
});

// ========== STATE MANAGEMENT ==========

// Online users: { walletAddress: { socketId, isOnline, lastSeen } }
const onlineUsers = new Map();

// Active calls: { walletAddress: { inCall: boolean, with: walletAddress } }
const activeCalls = new Map();

// Typing status: { chatId: { userAddress: true/false } }
const typingStatus = new Map();

// Group typing: { groupId: { userAddress: timestamp } }
const groupTypingStatus = new Map();

// Message delivery tracking: { txHash: { delivered: [addresses], read: [addresses] } }
const messageStatus = new Map();

// Group members cache: { groupId: [memberAddresses] }
const groupMembers = new Map();

// ========== HELPER FUNCTIONS ==========

function getChatId(addr1, addr2) {
  return addr1.toLowerCase() < addr2.toLowerCase()
    ? `${addr1.toLowerCase()}-${addr2.toLowerCase()}`
    : `${addr2.toLowerCase()}-${addr1.toLowerCase()}`;
}

function broadcastToGroup(groupId, event, data, excludeSocket = null) {
  const members = groupMembers.get(groupId) || [];
  members.forEach((memberAddress) => {
    const member = onlineUsers.get(memberAddress.toLowerCase());
    if (member && member.socketId && member.socketId !== excludeSocket) {
      io.to(member.socketId).emit(event, data);
    }
  });
}

// ========== CONNECTION HANDLING ==========

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // ========== USER REGISTRATION & ONLINE STATUS ==========

  socket.on("register", (walletAddress) => {
    console.log("📝 User registered:", walletAddress);
    const addr = walletAddress.toLowerCase();

    onlineUsers.set(addr, {
      socketId: socket.id,
      isOnline: true,
      lastSeen: Date.now(),
    });

    socket.walletAddress = addr;

    // Notify all users that this user is online
    socket.broadcast.emit("user-online", {
      address: walletAddress,
      timestamp: Date.now(),
    });

    console.log("👥 Online users:", onlineUsers.size);
  });

  socket.on("set-online-status", (data) => {
    const { isOnline } = data;
    if (socket.walletAddress) {
      const user = onlineUsers.get(socket.walletAddress);
      if (user) {
        user.isOnline = isOnline;
        user.lastSeen = Date.now();

        socket.broadcast.emit("user-status-changed", {
          address: socket.walletAddress,
          isOnline,
          lastSeen: user.lastSeen,
        });
      }
    }
  });

  // ========== PRIVATE MESSAGING ==========

  socket.on("new-message", (data) => {
    const {
      recipient,
      sender,
      content,
      timestamp,
      txHash,
      messageType = "text",
    } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    console.log("📨 New message:", { sender, recipient, type: messageType });

    // Initialize message status tracking
    messageStatus.set(txHash, {
      delivered: [],
      read: [],
      sender: sender.toLowerCase(),
      recipient: recipientAddr,
      timestamp: Date.now(),
    });

    if (recipientUser && recipientUser.isOnline) {
      // User is online - deliver immediately
      io.to(recipientUser.socketId).emit("receive-message", {
        sender,
        recipient,
        content,
        timestamp,
        txHash,
        messageType,
        status: "delivered",
      });

      // Mark as delivered
      const status = messageStatus.get(txHash);
      if (status) {
        status.delivered.push(recipientAddr);
      }

      // Notify sender of delivery
      socket.emit("message-delivered", {
        txHash,
        recipient: recipientAddr,
        timestamp: Date.now(),
      });

      console.log("✅ Message delivered to:", recipient);
    } else {
      // User offline - will be delivered when they come online
      console.log("📵 Recipient offline, message queued");
    }
  });

  socket.on("message-read", (data) => {
    const { txHash, chatId, messageIndex } = data;

    const status = messageStatus.get(txHash);
    if (status && socket.walletAddress) {
      if (!status.read.includes(socket.walletAddress)) {
        status.read.push(socket.walletAddress);
      }

      // Notify sender that message was read
      const senderUser = onlineUsers.get(status.sender);
      if (senderUser && senderUser.socketId) {
        io.to(senderUser.socketId).emit("message-read-receipt", {
          txHash,
          reader: socket.walletAddress,
          chatId,
          messageIndex,
          timestamp: Date.now(),
        });
      }

      console.log("👁️ Message read by:", socket.walletAddress);
    }
  });

  // ========== TYPING INDICATORS ==========

  socket.on("typing-start", (data) => {
    const { recipient, chatId } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    if (recipientUser && recipientUser.socketId) {
      io.to(recipientUser.socketId).emit("user-typing", {
        user: socket.walletAddress,
        chatId,
        isTyping: true,
      });
    }

    // Store typing status
    if (!typingStatus.has(chatId)) {
      typingStatus.set(chatId, new Map());
    }
    typingStatus.get(chatId).set(socket.walletAddress, true);
  });

  socket.on("typing-stop", (data) => {
    const { recipient, chatId } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    if (recipientUser && recipientUser.socketId) {
      io.to(recipientUser.socketId).emit("user-typing", {
        user: socket.walletAddress,
        chatId,
        isTyping: false,
      });
    }

    // Clear typing status
    if (typingStatus.has(chatId)) {
      typingStatus.get(chatId).delete(socket.walletAddress);
    }
  });

  // ========== GROUP CHAT ==========

  socket.on("join-group", (data) => {
    const { groupId, members } = data;

    // Store group members for broadcasting
    if (!groupMembers.has(groupId)) {
      groupMembers.set(
        groupId,
        members.map((m) => m.toLowerCase())
      );
    }

    // Join socket room for this group
    socket.join(`group:${groupId}`);

    console.log(`👥 User ${socket.walletAddress} joined group ${groupId}`);
  });

  socket.on("leave-group", (data) => {
    const { groupId } = data;
    socket.leave(`group:${groupId}`);

    console.log(`👋 User ${socket.walletAddress} left group ${groupId}`);
  });

  socket.on("group-message", (data) => {
    const {
      groupId,
      sender,
      content,
      timestamp,
      txHash,
      messageType = "text",
    } = data;

    console.log("📨 Group message:", { groupId, sender, type: messageType });

    // Broadcast to all group members except sender
    socket.to(`group:${groupId}`).emit("receive-group-message", {
      groupId,
      sender,
      content,
      timestamp,
      txHash,
      messageType,
      status: "delivered",
    });

    // Track delivery status for group message
    const members = groupMembers.get(groupId) || [];
    messageStatus.set(txHash, {
      type: "group",
      groupId,
      sender: sender.toLowerCase(),
      delivered: [],
      read: [],
      totalMembers: members.length - 1, // Exclude sender
      timestamp: Date.now(),
    });

    console.log(`✅ Group message broadcast to ${members.length} members`);
  });

  socket.on("group-message-read", (data) => {
    const { groupId, messageIndex, txHash } = data;

    const status = messageStatus.get(txHash);
    if (status && socket.walletAddress) {
      if (!status.read.includes(socket.walletAddress)) {
        status.read.push(socket.walletAddress);
      }

      // Broadcast read receipt to all group members
      io.to(`group:${groupId}`).emit("group-message-read-receipt", {
        groupId,
        messageIndex,
        txHash,
        reader: socket.walletAddress,
        readCount: status.read.length,
        totalMembers: status.totalMembers,
        timestamp: Date.now(),
      });

      console.log(
        `👁️ Group message read by ${socket.walletAddress} (${status.read.length}/${status.totalMembers})`
      );
    }
  });

  socket.on("group-typing-start", (data) => {
    const { groupId, userName } = data;

    // Broadcast typing status to group (except sender)
    socket.to(`group:${groupId}`).emit("group-user-typing", {
      groupId,
      user: socket.walletAddress,
      userName,
      isTyping: true,
    });

    // Store typing status with timestamp
    if (!groupTypingStatus.has(groupId)) {
      groupTypingStatus.set(groupId, new Map());
    }
    groupTypingStatus.get(groupId).set(socket.walletAddress, Date.now());
  });

  socket.on("group-typing-stop", (data) => {
    const { groupId } = data;

    socket.to(`group:${groupId}`).emit("group-user-typing", {
      groupId,
      user: socket.walletAddress,
      isTyping: false,
    });

    if (groupTypingStatus.has(groupId)) {
      groupTypingStatus.get(groupId).delete(socket.walletAddress);
    }
  });

  socket.on("member-added", (data) => {
    const { groupId, member, addedBy } = data;

    // Update group members cache
    const members = groupMembers.get(groupId) || [];
    if (!members.includes(member.toLowerCase())) {
      members.push(member.toLowerCase());
      groupMembers.set(groupId, members);
    }

    // Notify all group members
    io.to(`group:${groupId}`).emit("group-member-added", {
      groupId,
      member,
      addedBy,
      timestamp: Date.now(),
    });

    // Notify the new member
    const memberUser = onlineUsers.get(member.toLowerCase());
    if (memberUser && memberUser.socketId) {
      io.to(memberUser.socketId).emit("added-to-group", {
        groupId,
        addedBy,
        timestamp: Date.now(),
      });
    }
  });

  socket.on("member-removed", (data) => {
    const { groupId, member, removedBy } = data;

    // Update group members cache
    const members = groupMembers.get(groupId) || [];
    const index = members.indexOf(member.toLowerCase());
    if (index > -1) {
      members.splice(index, 1);
      groupMembers.set(groupId, members);
    }

    // Notify group
    io.to(`group:${groupId}`).emit("group-member-removed", {
      groupId,
      member,
      removedBy,
      timestamp: Date.now(),
    });

    // Notify removed member
    const memberUser = onlineUsers.get(member.toLowerCase());
    if (memberUser && memberUser.socketId) {
      io.to(memberUser.socketId).emit("removed-from-group", {
        groupId,
        removedBy,
        timestamp: Date.now(),
      });
    }
  });

  // ========== WEBRTC CALL SIGNALING ==========

  socket.on("call-offer", (data) => {
    const { recipient, offer, callType } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    console.log("📞 Call offer:", {
      caller: socket.walletAddress,
      recipient,
      callType,
    });

    // Check if recipient is busy
    const activeCall = activeCalls.get(recipientAddr);
    if (activeCall && activeCall.inCall) {
      console.log("📵 Recipient is busy:", recipient);
      socket.emit("call-busy", { from: recipient });
      return;
    }

    if (recipientUser && recipientUser.socketId) {
      io.to(recipientUser.socketId).emit("incoming-call", {
        caller: socket.walletAddress,
        offer,
        callType,
      });
    }
  });

  socket.on("call-answer", (data) => {
    const { caller, answer } = data;
    const callerAddr = caller.toLowerCase();
    const callerUser = onlineUsers.get(callerAddr);

    console.log("✅ Call answered:", {
      caller,
      answerer: socket.walletAddress,
    });

    // Mark both users as in call
    activeCalls.set(socket.walletAddress, { inCall: true, with: callerAddr });
    activeCalls.set(callerAddr, { inCall: true, with: socket.walletAddress });

    if (callerUser && callerUser.socketId) {
      io.to(callerUser.socketId).emit("call-answered", {
        answerer: socket.walletAddress,
        answer,
      });
    }
  });

  socket.on("ice-candidate", (data) => {
    const { recipient, candidate } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    if (recipientUser && recipientUser.socketId) {
      io.to(recipientUser.socketId).emit("ice-candidate", {
        sender: socket.walletAddress,
        candidate,
      });
    }
  });

  socket.on("call-end", (data) => {
    const { recipient } = data;
    const recipientAddr = recipient.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);

    console.log("☎️ Call ended:", { caller: socket.walletAddress, recipient });

    // Clear active call status
    activeCalls.delete(socket.walletAddress);
    activeCalls.delete(recipientAddr);

    if (recipientUser && recipientUser.socketId) {
      io.to(recipientUser.socketId).emit("call-ended", {
        caller: socket.walletAddress,
      });
    }
  });

  socket.on("call-reject", (data) => {
    const { caller } = data;
    const callerAddr = caller.toLowerCase();
    const callerUser = onlineUsers.get(callerAddr);

    console.log("❌ Call rejected by:", socket.walletAddress);

    if (callerUser && callerUser.socketId) {
      io.to(callerUser.socketId).emit("call-rejected", {
        recipient: socket.walletAddress,
      });
    }
  });

  socket.on("call-busy", (data) => {
    const { caller } = data;
    const callerAddr = caller.toLowerCase();
    const callerUser = onlineUsers.get(callerAddr);

    if (callerUser && callerUser.socketId) {
      console.log("📵 Sending busy signal to:", caller);
      io.to(callerUser.socketId).emit("call-busy", {
        from: socket.walletAddress,
      });
    }
  });

  // ========== DISCONNECT HANDLING ==========

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);

    if (socket.walletAddress) {
      // If user was in a call, notify the peer
      const activeCall = activeCalls.get(socket.walletAddress);
      if (activeCall && activeCall.with) {
        const peerUser = onlineUsers.get(activeCall.with);
        if (peerUser && peerUser.socketId) {
          io.to(peerUser.socketId).emit("call-ended", {
            caller: socket.walletAddress,
          });
        }
        activeCalls.delete(activeCall.with);
      }
      activeCalls.delete(socket.walletAddress);

      // Clear typing status
      typingStatus.forEach((users, chatId) => {
        users.delete(socket.walletAddress);
      });

      groupTypingStatus.forEach((users, groupId) => {
        if (users.has(socket.walletAddress)) {
          users.delete(socket.walletAddress);
          // Notify group that user stopped typing
          io.to(`group:${groupId}`).emit("group-user-typing", {
            groupId,
            user: socket.walletAddress,
            isTyping: false,
          });
        }
      });

      // Update online status
      const user = onlineUsers.get(socket.walletAddress);
      if (user) {
        user.isOnline = false;
        user.lastSeen = Date.now();

        // Notify others that user is offline
        socket.broadcast.emit("user-offline", {
          address: socket.walletAddress,
          lastSeen: user.lastSeen,
        });
      }

      // Keep user in map for last seen info, but mark as offline
      // onlineUsers.delete(socket.walletAddress); // Don't delete immediately
    }

    console.log(
      "👥 Online users:",
      Array.from(onlineUsers.values()).filter((u) => u.isOnline).length
    );
  });
});

// ========== CLEANUP & MAINTENANCE ==========

// Clean up old typing statuses every 5 seconds
setInterval(() => {
  const now = Date.now();
  groupTypingStatus.forEach((users, groupId) => {
    users.forEach((timestamp, userAddr) => {
      if (now - timestamp > 5000) {
        users.delete(userAddr);
        io.to(`group:${groupId}`).emit("group-user-typing", {
          groupId,
          user: userAddr,
          isTyping: false,
        });
      }
    });
  });
}, 5000);

// Clean up old message status tracking (older than 24 hours)
setInterval(() => {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  messageStatus.forEach((status, txHash) => {
    if (status.timestamp < dayAgo) {
      messageStatus.delete(txHash);
    }
  });
}, 60 * 60 * 1000); // Run every hour

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   🚀 WebSocket Server v2.0 Running     ║
  ║   📡 Port: ${PORT}                        ║
  ║   ✅ Features: Groups, Status, Calls   ║
  ╚════════════════════════════════════════╝
  `);
});
