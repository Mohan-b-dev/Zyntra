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

// Online users: { walletAddress: { socketId, isOnline, lastSeen, lastHeartbeat, presenceState } }
// presenceState: 'active' | 'away' | 'offline'
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

// Heartbeat check interval (check every 10 seconds with 30s timeout for better stability)
const HEARTBEAT_INTERVAL = 10000; // Check every 10s
const HEARTBEAT_TIMEOUT = 30000; // Mark offline after 30s (more forgiving)

setInterval(() => {
  const now = Date.now();
  onlineUsers.forEach((user, address) => {
    // If no heartbeat for HEARTBEAT_TIMEOUT, mark as offline
    if (
      user.isOnline &&
      user.lastHeartbeat &&
      now - user.lastHeartbeat > HEARTBEAT_TIMEOUT
    ) {
      console.log(`💔 User timeout (no heartbeat for ${HEARTBEAT_TIMEOUT/1000}s):`, address);
      user.isOnline = false;
      user.presenceState = "offline";
      user.lastSeen = now;

      // Notify all clients
      io.emit("user-status-changed", {
        address: address,
        isOnline: false,
        presenceState: "offline",
        lastSeen: now,
      });
    }
  });
}, HEARTBEAT_INTERVAL); // Check every 10 seconds

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
    if (!walletAddress || typeof walletAddress !== 'string') {
      console.warn("⚠️ Register called with invalid wallet address:", walletAddress);
      return;
    }

    const addr = walletAddress.toLowerCase();
    console.log("📝 User registered:", walletAddress);

    // Check if user already registered with different socket
    const existingUser = onlineUsers.get(addr);
    if (existingUser && existingUser.socketId !== socket.id) {
      console.log("⚠️ User re-registering from new socket, updating...");
    }

    onlineUsers.set(addr, {
      socketId: socket.id,
      isOnline: true,
      presenceState: "active", // Start as active
      lastSeen: Date.now(),
      lastHeartbeat: Date.now(),
    });

    socket.walletAddress = addr;

    // Send current online users to the newly connected client
    const onlineUsersList = [];
    onlineUsers.forEach((userData, userAddr) => {
      if (userAddr !== addr && userData.isOnline) {
        onlineUsersList.push({
          address: userAddr,
          isOnline: userData.isOnline,
          presenceState: userData.presenceState || "active",
          lastSeen: userData.lastSeen,
        });
      }
    });

    // Send all online users to the new connection
    onlineUsersList.forEach((user) => {
      socket.emit("user-status-changed", user);
    });

    // Notify all OTHER users that this user is online
    socket.broadcast.emit("user-online", {
      address: addr,
      presenceState: "active",
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
        user.presenceState = isOnline ? "active" : "offline";
        user.lastSeen = Date.now();
        user.lastHeartbeat = Date.now();

        socket.broadcast.emit("user-status-changed", {
          address: socket.walletAddress,
          isOnline,
          presenceState: user.presenceState,
          lastSeen: user.lastSeen,
        });
      }
    }
  });

  // Set presence state (active/away)
  socket.on("set-presence-state", (data) => {
    const { presenceState } = data; // 'active' or 'away'
    if (
      socket.walletAddress &&
      (presenceState === "active" || presenceState === "away")
    ) {
      const user = onlineUsers.get(socket.walletAddress);
      if (user) {
        console.log(
          `👤 User ${socket.walletAddress} presence: ${user.presenceState} → ${presenceState}`
        );
        user.presenceState = presenceState;
        user.lastHeartbeat = Date.now();

        // Broadcast presence change
        socket.broadcast.emit("user-status-changed", {
          address: socket.walletAddress,
          isOnline: user.isOnline,
          presenceState: presenceState,
          lastSeen: user.lastSeen,
        });
      }
    }
  });

  // Heartbeat to keep connection alive and detect disconnects
  socket.on("heartbeat", () => {
    if (socket.walletAddress) {
      const user = onlineUsers.get(socket.walletAddress);
      if (user) {
        user.lastHeartbeat = Date.now();
        user.isOnline = true;
        // If user was offline, bring them back online
        if (user.presenceState === "offline") {
          user.presenceState = "active";
          socket.broadcast.emit("user-status-changed", {
            address: socket.walletAddress,
            isOnline: true,
            presenceState: "active",
            lastSeen: user.lastSeen,
          });
        }
      }
    }
  });

  // Get user status
  socket.on("get-user-status", (data) => {
    const { address } = data;
    if (!address) {
      console.warn("⚠️ get-user-status called without address");
      return;
    }

    const userAddr = address.toLowerCase();
    const user = onlineUsers.get(userAddr);

    console.log(
      "🔍 Get user status:",
      userAddr,
      user ? (user.isOnline ? "online" : "offline") : "not found",
      user?.presenceState || "unknown"
    );

    // Always emit response, even if user not found (means offline)
    socket.emit("user-status-changed", {
      address: userAddr,
      isOnline: user ? user.isOnline : false,
      presenceState: user ? user.presenceState || "offline" : "offline",
      lastSeen: user ? user.lastSeen : Date.now(),
    });
  });

  // ========== PRIVATE MESSAGING (STRICT PROTOCOL) ==========

  // 1. Client sends message
  socket.on("client:message-send", (data) => {
    const {
      messageId,
      recipient,
      sender,
      content,
      timestamp,
      txHash,
      messageType = "text",
    } = data;
    const recipientAddr = recipient.toLowerCase();
    const senderAddr = sender.toLowerCase();
    const recipientUser = onlineUsers.get(recipientAddr);
    const serverTimestamp = Date.now();

    console.log("📨 [PROTOCOL] client:message-send:", {
      messageId: messageId?.slice(0, 10),
      sender: senderAddr.slice(0, 10),
      recipient: recipientAddr.slice(0, 10),
      type: messageType,
    });

    // Initialize message status tracking (idempotent)
    if (!messageStatus.has(messageId)) {
      messageStatus.set(messageId, {
        delivered: [],
        read: [],
        sender: senderAddr,
        recipient: recipientAddr,
        timestamp: serverTimestamp,
        txHash: txHash,
      });
    }

    // 2. Immediately emit sent-ack to sender (SENT state)
    socket.emit("server:message-sent-ack", {
      messageId,
      txHash,
      serverTimestamp,
    });
    console.log("  ✅ [PROTOCOL] server:message-sent-ack → sender");

    // 3. Emit incoming message to recipient
    if (recipientUser && recipientUser.isOnline) {
      io.to(recipientUser.socketId).emit("server:message-incoming", {
        messageId,
        sender,
        recipient,
        content,
        timestamp,
        txHash,
        messageType,
        serverTimestamp,
      });
      console.log("  📬 [PROTOCOL] server:message-incoming → recipient");
    } else {
      console.log("  📵 [PROTOCOL] Recipient offline, message queued");
    }
  });

  // Backward compatibility - map old event to new
  socket.on("new-message", (data) => {
    socket.emit("client:message-send", {
      ...data,
      messageId: data.txHash || `msg-${Date.now()}-${Math.random()}`,
    });
  });

  // 4. Recipient acknowledges receipt (DELIVERED state)
  socket.on("client:message-received", (data) => {
    const { messageId, txHash } = data;
    const lookupId = messageId || txHash;
    const deliveredAt = Date.now();

    console.log("📬 [PROTOCOL] client:message-received:", {
      messageId: lookupId?.slice(0, 10),
      from: socket.walletAddress?.slice(0, 10),
    });

    const status = messageStatus.get(lookupId);
    if (status && socket.walletAddress) {
      const recipientAddr = socket.walletAddress.toLowerCase();

      // Mark as delivered (idempotent)
      if (!status.delivered.includes(recipientAddr)) {
        status.delivered.push(recipientAddr);
        console.log("  📝 [PROTOCOL] Persisted delivered status");
      }

      // 5. Notify sender that message was delivered
      const senderUser = onlineUsers.get(status.sender);
      if (senderUser && senderUser.socketId) {
        io.to(senderUser.socketId).emit("server:message-delivered", {
          messageId: lookupId,
          txHash: status.txHash,
          deliveredAt,
          deliveredBy: recipientAddr,
        });
        console.log("  ✅ [PROTOCOL] server:message-delivered → sender");
      }

      // Also notify recipient for their UI (single gray tick)
      socket.emit("server:message-delivered", {
        messageId: lookupId,
        txHash: status.txHash,
        deliveredAt,
        deliveredBy: recipientAddr,
      });
      console.log(
        "  ✅ [PROTOCOL] server:message-delivered → recipient (for UI)"
      );
    }
  });

  // Backward compatibility
  socket.on("message-delivered-ack", (data) => {
    socket.emit("client:message-received", {
      messageId: data.txHash,
      txHash: data.txHash,
    });
  });

  // 6-7. Recipient marks message as read (READ state)
  socket.on("client:message-read", (data) => {
    const { messageId, txHash } = data;
    const lookupId = messageId || txHash;
    const readAt = Date.now();

    console.log("👁️ [PROTOCOL] client:message-read:", {
      messageId: lookupId?.slice(0, 10),
      from: socket.walletAddress?.slice(0, 10),
    });

    const status = messageStatus.get(lookupId);
    if (status && socket.walletAddress) {
      const readerAddr = socket.walletAddress.toLowerCase();

      // Mark as read (idempotent)
      if (!status.read.includes(readerAddr)) {
        status.read.push(readerAddr);
        console.log("  📝 [PROTOCOL] Persisted read status");
      }

      // 8. Notify sender that message was read
      const senderUser = onlineUsers.get(status.sender);
      if (senderUser && senderUser.socketId) {
        io.to(senderUser.socketId).emit("server:message-read", {
          messageId: lookupId,
          txHash: status.txHash,
          readAt,
          readBy: readerAddr,
        });
        console.log("  ✅ [PROTOCOL] server:message-read → sender");
      }

      // Also notify recipient for their UI (double blue tick)
      socket.emit("server:message-read", {
        messageId: lookupId,
        txHash: status.txHash,
        readAt,
        readBy: readerAddr,
      });
      console.log("  ✅ [PROTOCOL] server:message-read → recipient (for UI)");
    }
  });

  // Backward compatibility
  socket.on("message-read", (data) => {
    socket.emit("client:message-read", {
      messageId: data.txHash,
      txHash: data.txHash,
    });
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
    if (!recipient) {
      console.warn("⚠️ ICE candidate received without recipient");
      return;
    }
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
    if (!recipient) {
      console.warn("⚠️ Call-end received without recipient");
      // Clear caller's active call status at minimum
      activeCalls.delete(socket.walletAddress);
      return;
    }
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
      try {
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
          if (users.has(socket.walletAddress)) {
            users.delete(socket.walletAddress);
          }
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
          user.presenceState = "offline";
          user.lastSeen = Date.now();

          // Notify others that user is offline
          socket.broadcast.emit("user-offline", {
            address: socket.walletAddress,
            presenceState: "offline",
            lastSeen: user.lastSeen,
          });
        }

        // Keep user in map for last seen info, but mark as offline
        // onlineUsers.delete(socket.walletAddress); // Don't delete immediately
      } catch (error) {
        console.error("❌ Error during disconnect cleanup:", error);
      }
    }

    const onlineCount = Array.from(onlineUsers.values()).filter((u) => u.isOnline).length;
    console.log("👥 Online users:", onlineCount);
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
