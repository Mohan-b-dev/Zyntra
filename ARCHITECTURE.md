# 📐 Group Chat System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ CreateGroup    │  │ GroupChat      │  │ Background     │   │
│  │ Modal          │  │ Window         │  │ Selector       │   │
│  │                │  │                │  │                │   │
│  │ • Name Input   │  │ • Messages     │  │ • Colors       │   │
│  │ • Image URL    │  │ • Member List  │  │ • Gradients    │   │
│  │ • Description  │  │ • Typing       │  │ • Images       │   │
│  │ • Member       │  │ • Status Ticks │  │ • Wallpapers   │   │
│  │   Selection    │  │ • Admin Ctrl   │  │ • Opacity/Blur │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      WEB3 CONTEXT V5                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ State Management                                          │   │
│  │ • userGroups: Group[]                                     │   │
│  │ • onlineUsers: Map<address, boolean>                      │   │
│  │ • typingUsers: Map<chatId, string[]>                      │   │
│  │ • groupTypingUsers: Map<groupId, string[]>                │   │
│  │                                                            │   │
│  │ Functions                                                  │   │
│  │ • createGroup(name, image, desc, members) → groupId       │   │
│  │ • sendGroupMessage(groupId, content)                      │   │
│  │ • addGroupMember(groupId, member)                         │   │
│  │ • removeGroupMember(groupId, member)                      │   │
│  │ • markMessageRead(chatId, index, isGroup)                 │   │
│  │ • startTyping(chatId, isGroup)                            │   │
│  │ • stopTyping(chatId, isGroup)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ↓ ↑                                    ↓ ↑
┌───────────────────────┐            ┌──────────────────────────┐
│   SMART CONTRACT      │            │   WEBSOCKET SERVER       │
│   (ChatDAppV5.sol)    │            │   (server-v2.js)         │
│                       │            │                          │
│ • Groups Storage      │            │ • Online Tracking        │
│ • Messages Storage    │            │ • Typing Status          │
│ • Member Mapping      │            │ • Message Broadcasting   │
│ • Status Tracking     │            │ • Delivery Receipts      │
│ • Read Receipts       │            │ • Group Rooms            │
│ • Admin Controls      │            │ • Auto-cleanup           │
│                       │            │ • WebRTC Signaling       │
└───────────────────────┘            └──────────────────────────┘
          ↓                                      ↓
┌───────────────────────┐            ┌──────────────────────────┐
│   CELO BLOCKCHAIN     │            │   SOCKET.IO              │
│   (Alfajores)         │            │   (Port 3002)            │
└───────────────────────┘            └──────────────────────────┘
```

---

## 📡 Data Flow Diagrams

### 1. Create Group Flow

```
User Input                 Frontend                    Contract                  WebSocket
────────────────────────────────────────────────────────────────────────────────────────

1. Fill form     →    2. Validate input
   • Name              • Min 3 chars
   • Image             • At least 1 member
   • Description
   • Members

                       3. Call createGroup()    →    4. Create group
                                                     • Generate groupId
                                                     • Store GroupInfo
                                                     • Add creator as admin
                                                     • Emit GroupCreated

                       5. Add members           →    6. For each member:
                          contract.addGroupMember()  • Add to memberInfo
                                                     • Add to userGroups
                                                     • Emit MemberAdded

                       7. socket.emit('join-group')  →  8. Join group room
                                                           • Add to groupMembers Map
                                                           • Broadcast to members

9. Success!      ←    10. Update userGroups
   Group created       11. Show GroupChatWindow
```

### 2. Send Group Message Flow

```
User Action              Frontend                    WebSocket                  Contract
────────────────────────────────────────────────────────────────────────────────────────

1. Type message  →   2. Show typing indicator
                        socket.emit('group-typing-start')
                                                   →   3. Broadcast to group
                                                          socket.to(group).emit(
                                                            'group-user-typing'
                                                          )

4. Press send    →   5. Call sendGroupMessage()                            →   6. Store message
                                                                                  • Add to messages[]
                                                                                  • Set status: sent
                                                                                  • Emit GroupMessageSent

                     7. socket.emit('group-message')  →   8. Broadcast message
                                                             • Send to all members
                                                             • Track delivery
                                                             • Update messageStatus

9. Others        ←   10. socket.on('receive-group-message')
   receive              • Display in chat
   message              • Show sender info
                        • Emit 'message-delivered'
```

### 3. Message Status Update Flow

```
Recipient Actions       WebSocket                   Contract                   Sender UI
────────────────────────────────────────────────────────────────────────────────────────

1. Receive message →   2. Emit 'message-delivered'
                          { txHash, userAddress }
                                              →    3. Track delivery
                                                      messageStatus.delivered[]
                                                      .push(userAddress)

                       4. Broadcast receipt    →   5. Update tick
                                                      ✓ → ✓✓

6. Open chat       →   7. Call markGroupMessageRead()  →  8. Update contract
                                                              • Add to read[]
                                                              • Increment readCount
                                                              • Emit MessageRead

                       9. Emit 'group-message-read'    →  10. Get read count
                          { groupId, messageIndex }        • readCount / totalMembers

                       11. Broadcast count         →      12. Update tick
                                                               ✓✓ → Blue ✓✓
                                                               Show "Read by 5/8"
```

### 4. Typing Indicator Flow

```
User Action             Frontend                    WebSocket                  Other Members
────────────────────────────────────────────────────────────────────────────────────────

1. Start typing  →   2. Emit 'group-typing-start'
                        { groupId, userAddress, username }
                                                   →   3. Broadcast to group
                                                          socket.to(group).emit(
                                                            'group-user-typing'
                                                          )
                                                       4. Add to groupTypingStatus
                                                          with timestamp

5. Others see    ←   6. Render TypingIndicator
   indicator            • Bouncing dots
                        • "Alice is typing..."

7. Stop typing   →   8. Emit 'group-typing-stop'  →   9. Remove from status

10. Auto-cleanup      11. setInterval(5s)
    (after 5s)            • Remove old entries
                                                   →   12. Indicator disappears
```

### 5. Online Status Sync Flow

```
User Action             Frontend                    WebSocket                  Contract
────────────────────────────────────────────────────────────────────────────────────────

1. Connect       →   2. socket.emit('register')
                        { userAddress }
                                                   →   3. Add to onlineUsers
                                                          { socketId, isOnline: true }

                     4. socket.emit('set-online-status')  →  5. Store timestamp
                        { userAddress, isOnline: true }        contract.setOnlineStatus()

                     6. Broadcast 'user-online'   →      7. Others update UI
                                                             • Green dot appears
                                                             • "Online" text

8. Disconnect    →   9. socket.on('disconnect')   →      10. Update status
                                                              • Set isOnline: false
                                                              • Set lastSeen

                     11. Broadcast 'user-offline'  →     12. Others update UI
                                                              • Gray dot
                                                              • "Last seen 2m ago"
```

---

## 🗂️ File Structure

```
chatapp/
├── contracts/
│   └── ChatDAppV5.sol ─────────── Smart contract (groups, status, messages)
│
├── server/
│   └── server-v2.js ───────────── WebSocket server (real-time events)
│
├── components/
│   ├── GroupChatWindow.tsx ────── Main group chat interface
│   ├── CreateGroupModal.tsx ───── Group creation wizard
│   ├── BackgroundSelector.tsx ─── Background customization
│   ├── MessageStatusTick.tsx ──── Animated status ticks
│   ├── OnlineStatusIndicator.tsx  Online/offline dots
│   └── TypingIndicator.tsx ────── Typing animations
│
├── hooks/
│   └── useChatBackground.ts ───── Background state management
│
├── scripts/
│   └── deploy-v5.js ───────────── Deployment script
│
└── docs/
    ├── COMPLETE_SUMMARY.md ────── This summary
    ├── INTEGRATION_GUIDE.md ───── Step-by-step integration
    ├── QUICK_REFERENCE.md ─────── Quick lookup
    └── GROUP_CHAT_IMPLEMENTATION.md  Full specifications
```

---

## 🔄 WebSocket Event Map

### Client → Server (Emit)

| Event                | Payload                                           | Purpose                    |
| -------------------- | ------------------------------------------------- | -------------------------- |
| `register`           | `{ userAddress }`                                 | Register user on connect   |
| `join-group`         | `{ groupId }`                                     | Join group room            |
| `leave-group`        | `{ groupId }`                                     | Leave group room           |
| `group-message`      | `{ groupId, content, sender, timestamp, txHash }` | Send group message         |
| `typing-start`       | `{ chatId, userAddress }`                         | Start typing (personal)    |
| `typing-stop`        | `{ chatId, userAddress }`                         | Stop typing (personal)     |
| `group-typing-start` | `{ groupId, userAddress, username }`              | Start typing (group)       |
| `group-typing-stop`  | `{ groupId, userAddress }`                        | Stop typing (group)        |
| `message-read`       | `{ chatId, messageIndex }`                        | Mark personal message read |
| `group-message-read` | `{ groupId, messageIndex, userAddress }`          | Mark group message read    |
| `set-online-status`  | `{ userAddress, isOnline }`                       | Update online status       |
| `member-added`       | `{ groupId, member }`                             | Notify member added        |
| `member-removed`     | `{ groupId, member }`                             | Notify member removed      |

### Server → Client (Listen)

| Event                        | Payload                                              | Purpose                |
| ---------------------------- | ---------------------------------------------------- | ---------------------- |
| `user-online`                | `{ userAddress }`                                    | User came online       |
| `user-offline`               | `{ userAddress, lastSeen }`                          | User went offline      |
| `user-status-changed`        | `{ userAddress, isOnline }`                          | Status changed         |
| `receive-group-message`      | `{ groupId, content, sender, timestamp, txHash }`    | New group message      |
| `user-typing`                | `{ chatId, userAddress }`                            | User typing (personal) |
| `group-user-typing`          | `{ groupId, userAddress, username }`                 | User typing (group)    |
| `message-delivered`          | `{ txHash, recipient }`                              | Message delivered      |
| `message-read-receipt`       | `{ txHash }`                                         | Message read           |
| `group-message-read-receipt` | `{ groupId, messageIndex, readCount, totalMembers }` | Group read count       |
| `added-to-group`             | `{ groupId, groupInfo }`                             | You were added         |
| `removed-from-group`         | `{ groupId }`                                        | You were removed       |

---

## 💾 Smart Contract Structure

### Main Structs

```solidity
struct GroupInfo {
  bytes32 groupId;
  address creator;
  uint48 createdAt;
  uint32 memberCount;
  bool isActive;
  string name;
  string imageUrl;
  string description;
}

struct GroupMessage {
  address sender;
  uint48 timestamp;
  uint8 messageType;
  bool isDeleted;
  string content;
  string txHash;
}

struct GroupMember {
  address memberAddress;
  uint48 joinedAt;
  bool isAdmin;
  bool isMuted;
  uint48 lastReadTime;
}

struct MessageStatus {
  mapping(address => bool) delivered;
  mapping(address => bool) read;
  uint32 deliveredCount;
  uint32 readCount;
}
```

### Key Mappings

```solidity
mapping(bytes32 => GroupInfo) groups;
mapping(bytes32 => GroupMessage[]) groupMessages;
mapping(bytes32 => mapping(address => GroupMember)) memberInfo;
mapping(bytes32 => address[]) groupMembers;
mapping(address => bytes32[]) userGroups;
mapping(address => bool) isOnline;
mapping(bytes32 => mapping(uint256 => MessageStatus)) groupMessageStatus;
```

---

## 🎨 Component Props Reference

### GroupChatWindow

```typescript
interface GroupChatWindowProps {
  groupInfo: GroupInfo;
  messages: GroupMessage[];
  currentUser: string;
  isCurrentUserAdmin: boolean;
  typingUsers: string[];
  onSendMessage: (content: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberAddress: string) => void;
  onPromoteToAdmin: (memberAddress: string) => void;
  onLeaveGroup: () => void;
  onClose: () => void;
  chatBackground?: ChatBackground;
  onChangeBackground?: () => void;
}
```

### CreateGroupModal

```typescript
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (data: {
    name: string;
    imageUrl: string;
    description: string;
    members: string[];
  }) => void;
  availableContacts: Contact[];
}
```

### BackgroundSelector

```typescript
interface BackgroundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentBackground?: ChatBackground;
  onApplyBackground: (background: ChatBackground) => void;
}
```

### MessageStatusTick

```typescript
interface MessageStatusTickProps {
  status: "sent" | "delivered" | "read";
  isGroup?: boolean;
  readCount?: number;
  totalMembers?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}
```

---

## ⚡ Performance Optimizations

### Implemented

✅ **Message Pagination**: Load 50 messages at a time
✅ **Typing Debounce**: 300ms delay before emitting
✅ **Status Throttle**: Update every 5 seconds max
✅ **Auto-cleanup**: Remove stale data every 5s (typing), 24h (messages)
✅ **Virtual Scrolling**: For 100+ messages
✅ **Memoization**: React.memo on all components
✅ **Lazy Loading**: Images loaded on demand
✅ **WebSocket Rooms**: Only broadcast to relevant members

### Recommended

- Use React.useMemo for expensive computations
- Use React.useCallback for event handlers
- Enable code splitting for modals
- Compress images before uploading
- Use CDN for wallpaper assets
- Enable service worker for offline support

---

## 🔒 Security Considerations

### Smart Contract

✅ **Access Control**: onlyGroupMember, onlyGroupAdmin modifiers
✅ **Input Validation**: Name length, member limits
✅ **Reentrancy Protection**: No external calls in loops
✅ **Gas Optimization**: Packed structs, minimal storage

### WebSocket

✅ **Authentication**: Wallet signature verification
✅ **Rate Limiting**: Max events per second
✅ **Input Sanitization**: Validate all incoming data
✅ **Room Isolation**: Members only see their groups

### Frontend

✅ **XSS Prevention**: Sanitize user input
✅ **CORS**: Proper origin validation
✅ **HTTPS**: Always use secure connections
✅ **localStorage**: Encrypt sensitive data

---

## 📈 Scaling Considerations

### Current Limits

- Max group members: 256
- Max message length: 1000 chars
- Message status tracking: 24 hours
- Typing status timeout: 5 seconds

### To Scale Further

1. **Database**: Add PostgreSQL for message history
2. **Caching**: Add Redis for online status
3. **Load Balancing**: Multiple WebSocket instances
4. **CDN**: Serve static assets globally
5. **Message Queue**: Add RabbitMQ for async processing
6. **Monitoring**: Add Sentry for error tracking

---

## 🎯 Quick Command Reference

```powershell
# Compile contracts
npx hardhat compile

# Deploy to Alfajores
npx hardhat run scripts/deploy-v5.js --network alfajores

# Start WebSocket server
cd server; node server-v2.js

# Start Next.js app
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

---

**🎉 COMPLETE ARCHITECTURE DOCUMENTED!**

Use this diagram to understand how all pieces fit together.
