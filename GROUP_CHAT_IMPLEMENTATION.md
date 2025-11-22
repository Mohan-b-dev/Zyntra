# 🚀 Group Chat & Advanced Features Implementation Guide

## ✅ **COMPLETED COMPONENTS**

### 1. Smart Contract (ChatDAppV5.sol) ✓

**Location**: `contracts/ChatDAppV5.sol`

**Features Implemented**:

- ✅ Group creation with name, image, description
- ✅ Member management (add/remove by admins)
- ✅ Admin promotion system
- ✅ Group message broadcasting
- ✅ Private + Group message status (sent/delivered/read)
- ✅ Online status tracking
- ✅ Read receipt tracking for groups (per-member)
- ✅ Efficient gas-optimized structs

**Key Functions**:

```solidity
createGroup(name, imageUrl, description) → groupId
addGroupMember(groupId, member)
removeGroupMember(groupId, member)
sendGroupMessage(groupId, content, messageType, txHash)
markGroupMessageRead(groupId, messageIndex)
getGroupMessageReadCount(groupId, messageIndex) → (readCount, totalMembers)
setOnlineStatus(isOnline)
markMessageDelivered(chatId, messageIndex)
markMessageRead(chatId, messageIndex)
```

---

### 2. WebSocket Server v2 (server-v2.js) ✓

**Location**: `server/server-v2.js`

**Features Implemented**:

- ✅ Online/offline user tracking
- ✅ Typing indicators (personal & group)
- ✅ Message delivery & read receipt broadcasting
- ✅ Group message broadcasting
- ✅ Real-time member add/remove notifications
- ✅ WebRTC call signaling (maintained)
- ✅ Automatic cleanup of stale statuses

**Socket Events Added**:

```javascript
// Status
"user-online" / "user-offline" / "user-status-changed";

// Typing
"typing-start" / "typing-stop" / "user-typing";
"group-typing-start" / "group-typing-stop" / "group-user-typing";

// Messages
"message-delivered" / "message-read" / "message-read-receipt";
"group-message" / "receive-group-message";
"group-message-read" / "group-message-read-receipt";

// Group Management
"join-group" / "leave-group";
"member-added" / "member-removed";
"added-to-group" / "removed-from-group";
```

---

### 3. Create Group Modal Component ✓

**Location**: `components/CreateGroupModal.tsx`

**Features**:

- ✅ Two-step creation (details → members)
- ✅ Glassmorphic design with animations
- ✅ Contact selection with checkboxes
- ✅ Optional group image & description
- ✅ Member counter
- ✅ GSAP + Framer Motion animations
- ✅ Progress bar showing steps

---

## 🔧 **COMPONENTS TO CREATE** (Next Steps)

### 4. Group Chat Window Component

**File**: `components/GroupChatWindow.tsx`

**Required Features**:

```typescript
- Display group info (name, image, member count)
- Show member list with admin badges
- Group message rendering with sender names
- Typing indicators showing "User1, User2 are typing..."
- Read receipts showing "Read by X/Y members"
- Admin controls (add/remove members)
- Message status ticks (✓ → ✓✓ → Blue ✓✓)
- Background customization support
```

### 5. Chat Background Customization

**Files**:

- `components/BackgroundSelector.tsx` (Modal)
- `hooks/useChatBackground.tsx` (State management)
- `utils/backgrounds.ts` (Preset backgrounds)

**Required Features**:

```typescript
// Background Types
{
  type: 'solid' | 'gradient' | 'image' | 'wallpaper',
  value: string | { from: string, to: string },
  opacity: number,
  blur: number
}

// Presets
solidColors: ['#1a1a2e', '#16213e', '#0f3460', ...]
gradients: [
  { from: '#667eea', to: '#764ba2' },
  { from: '#f093fb', to: '#f5576c' },
  ...
]
wallpapers: [
  '/wallpapers/abstract1.jpg',
  '/wallpapers/geometric2.jpg',
  ...
]

// Local Storage
localStorage.setItem('chat-background-{chatId}', JSON.stringify(background))
```

### 6. Message Status Ticks Component

**File**: `components/MessageStatusTick.tsx`

```typescript
interface MessageStatusTickProps {
  status: 'sent' | 'delivered' | 'read';
  isGroup?: boolean;
  readCount?: number;
  totalMembers?: number;
}

// Render Logic
sent: Single gray tick ✓
delivered: Double gray ticks ✓✓
read (personal): Double blue ticks ✓✓
read (group): Blue ticks + "Read by 5/8"

// Animation
GSAP animation on status change: scale + color transition
```

### 7. Enhanced Sidebar with Groups

**File**: `components/SidebarV3.tsx`

```typescript
// Layout
<div>
  {/* Header with "Create Group" button */}

  {/* Personal Chats Section */}
  <section>
    <h3>Personal Chats</h3>
    {personalChats.map((chat) => (
      <ChatTile
        user={chat.user}
        lastMessage={chat.lastMessage}
        unreadCount={chat.unreadCount}
        isOnline={chat.isOnline}
        isTyping={chat.isTyping}
        status={chat.lastMessage.status} // Show ticks
      />
    ))}
  </section>

  {/* Groups Section */}
  <section>
    <h3>Groups ({userGroups.length})</h3>
    {userGroups.map((group) => (
      <GroupTile
        group={group}
        lastMessage={group.lastMessage}
        unreadCount={group.unreadCount}
        typingUsers={group.typingUsers} // Array of typing users
        memberCount={group.memberCount}
      />
    ))}
  </section>
</div>
```

### 8. Online Status Indicator

**File**: `components/OnlineStatusIndicator.tsx`

```typescript
interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: number;
  size?: "sm" | "md" | "lg";
}

// Render
<div className="relative">
  {isOnline ? (
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
    />
  ) : (
    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-900" />
  )}
</div>;
```

### 9. Typing Indicator Component

**File**: `components/TypingIndicator.tsx`

```typescript
// Personal Chat
<motion.div className="flex items-center gap-2 text-sm text-gray-400">
  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
    typing
  </motion.div>
  <div className="flex gap-1">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
      />
    ))}
  </div>
</motion.div>

// Group Chat
<div className="text-sm text-blue-400">
  {typingUsers.length === 1 && `${typingUsers[0]} is typing...`}
  {typingUsers.length === 2 && `${typingUsers[0]} and ${typingUsers[1]} are typing...`}
  {typingUsers.length > 2 && `${typingUsers[0]}, ${typingUsers[1]} and ${typingUsers.length - 2} others are typing...`}
</div>
```

---

## 📋 **INTEGRATION STEPS**

### Step 1: Deploy New Smart Contract

```bash
# 1. Compile ChatDAppV5.sol
npx hardhat compile

# 2. Deploy to Celo Alfajores
npx hardhat run scripts/deploy-v5.js --network alfajores

# 3. Update contract address in .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Step 2: Start Enhanced WebSocket Server

```bash
# Stop old server
# Start new server
cd server
node server-v2.js

# Should see:
# ╔════════════════════════════════════════╗
# ║   🚀 WebSocket Server v2.0 Running     ║
# ║   📡 Port: 3002                        ║
# ║   ✅ Features: Groups, Status, Calls   ║
# ╚════════════════════════════════════════╝
```

### Step 3: Update Web3 Context

**File**: `context/Web3ContextV5.tsx`

Add group-related functions:

```typescript
const [userGroups, setUserGroups] = useState<GroupInfo[]>([]);
const [currentGroup, setCurrentGroup] = useState<string | null>(null);

async function createGroup(
  name: string,
  description: string,
  imageUrl: string,
  members: string[]
) {
  const tx = await contract.createGroup(name, imageUrl, description);
  const receipt = await tx.wait();

  // Extract groupId from event
  const event = receipt.events?.find((e) => e.event === "GroupCreated");
  const groupId = event?.args?.groupId;

  // Add members
  for (const member of members) {
    await contract.addGroupMember(groupId, member);
  }

  // Join WebSocket room
  socket?.emit("join-group", { groupId, members });

  return groupId;
}

async function sendGroupMessage(
  groupId: string,
  content: string,
  messageType: number
) {
  const txHash = ethers.utils.id(content + Date.now());
  const tx = await contract.sendGroupMessage(
    groupId,
    content,
    messageType,
    txHash
  );

  // Emit via WebSocket for instant delivery
  socket?.emit("group-message", {
    groupId,
    sender: account,
    content,
    timestamp: Date.now(),
    txHash,
    messageType,
  });

  await tx.wait();
}

async function markGroupMessageRead(
  groupId: string,
  messageIndex: number,
  txHash: string
) {
  await contract.markGroupMessageRead(groupId, messageIndex);

  socket?.emit("group-message-read", {
    groupId,
    messageIndex,
    txHash,
  });
}

// Listen for real-time updates
useEffect(() => {
  if (!socket) return;

  socket.on("receive-group-message", (data) => {
    // Add to group messages state
    setGroupMessages((prev) => ({
      ...prev,
      [data.groupId]: [...(prev[data.groupId] || []), data],
    }));
  });

  socket.on("group-message-read-receipt", (data) => {
    // Update message status
    updateMessageReadStatus(data.groupId, data.messageIndex, data.readCount);
  });

  socket.on("group-user-typing", (data) => {
    // Update typing status
    setGroupTypingUsers((prev) => ({
      ...prev,
      [data.groupId]: data.isTyping
        ? [...(prev[data.groupId] || []), data.user]
        : (prev[data.groupId] || []).filter((u) => u !== data.user),
    }));
  });

  return () => {
    socket.off("receive-group-message");
    socket.off("group-message-read-receipt");
    socket.off("group-user-typing");
  };
}, [socket]);
```

### Step 4: Add Background Customization

**File**: `utils/chatBackgrounds.ts`

```typescript
export const solidColors = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#1e3a5f",
  "#2d132c",
  "#1f1f1f",
  "#27374d",
  "#1b262c",
  "#14274e",
  "#1c1c1c",
];

export const gradients = [
  { from: "#667eea", to: "#764ba2", name: "Purple Haze" },
  { from: "#f093fb", to: "#f5576c", name: "Pink Sunset" },
  { from: "#4facfe", to: "#00f2fe", name: "Ocean Blue" },
  { from: "#43e97b", to: "#38f9d7", name: "Fresh Mint" },
  { from: "#fa709a", to: "#fee140", name: "Warm Flame" },
  { from: "#30cfd0", to: "#330867", name: "Deep Ocean" },
  { from: "#a8edea", to: "#fed6e3", name: "Soft Rainbow" },
  { from: "#ff9a9e", to: "#fecfef", name: "Cotton Candy" },
];

export const wallpapers = [
  "/wallpapers/abstract-waves.jpg",
  "/wallpapers/geometric-dark.jpg",
  "/wallpapers/minimal-gradient.jpg",
  "/wallpapers/tech-grid.jpg",
  "/wallpapers/space-nebula.jpg",
];

export interface ChatBackground {
  type: "solid" | "gradient" | "image" | "wallpaper";
  value: string | { from: string; to: string };
  opacity: number;
  blur: number;
}

export function applyChatBackground(
  background: ChatBackground
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
  };

  switch (background.type) {
    case "solid":
      return {
        ...base,
        background: background.value as string,
        opacity: background.opacity,
      };

    case "gradient":
      const { from, to } = background.value as { from: string; to: string };
      return {
        ...base,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        opacity: background.opacity,
      };

    case "image":
    case "wallpaper":
      return {
        ...base,
        backgroundImage: `url(${background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: `blur(${background.blur}px)`,
        opacity: background.opacity,
      };

    default:
      return base;
  }
}

// Local storage helpers
export function saveChatBackground(chatId: string, background: ChatBackground) {
  localStorage.setItem(`chat-bg-${chatId}`, JSON.stringify(background));
}

export function loadChatBackground(chatId: string): ChatBackground | null {
  const stored = localStorage.getItem(`chat-bg-${chatId}`);
  return stored ? JSON.parse(stored) : null;
}
```

### Step 5: Update Sidebar

Add group creation button and group list:

```typescript
// In SidebarV3.tsx
<div className="p-4">
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => setShowCreateGroup(true)}
    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
  >
    <Users className="w-5 h-5" />
    Create New Group
  </motion.button>
</div>;

{
  /* Personal Chats */
}
<section>
  <h3 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
    Personal Chats
  </h3>
  {personalChats.map((chat) => (
    <ChatTile key={chat.address} {...chat} />
  ))}
</section>;

{
  /* Groups */
}
<section className="mt-6">
  <h3 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
    <span>Groups</span>
    <span className="text-blue-400">{userGroups.length}</span>
  </h3>
  {userGroups.map((group) => (
    <GroupTile key={group.groupId} {...group} />
  ))}
</section>;
```

---

## 🎨 **ANIMATION REQUIREMENTS**

### Message Status Tick Animations (GSAP)

```typescript
// When status changes from sent → delivered
gsap
  .timeline()
  .to(".tick-1", { scale: 1.3, duration: 0.2 })
  .to(".tick-1", { scale: 1, duration: 0.2 })
  .to(".tick-2", { scale: 0, x: -10, opacity: 0, duration: 0 })
  .to(".tick-2", {
    scale: 1,
    x: 0,
    opacity: 1,
    duration: 0.3,
    ease: "back.out(1.7)",
  });

// When status changes from delivered → read
gsap.to([".tick-1", ".tick-2"], {
  fill: "#3b82f6", // blue
  duration: 0.5,
  ease: "power2.out",
});
```

### Background Change Animation (GSAP)

```typescript
gsap
  .timeline()
  .to(".chat-background-overlay", {
    opacity: 0,
    duration: 0.3,
  })
  .set(".chat-background", {
    background: newBackground,
  })
  .to(".chat-background-overlay", {
    opacity: 1,
    duration: 0.3,
  });
```

### Group Creation Success (Framer Motion)

```typescript
<motion.div
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: "spring", damping: 10 }}
>
  <CheckCircle className="w-16 h-16 text-green-500" />
</motion.div>
```

---

## 🧪 **TESTING CHECKLIST**

### Group Chat

- [ ] Create group with 2+ members
- [ ] Send message in group
- [ ] Verify all members receive message
- [ ] Add new member to group
- [ ] Remove member from group
- [ ] Verify admin controls work
- [ ] Check group typing indicator shows multiple users
- [ ] Verify read receipts show "X/Y read"

### Message Status

- [ ] Send private message → verify single tick
- [ ] Recipient comes online → verify double tick
- [ ] Recipient reads message → verify blue ticks
- [ ] Send group message → verify ticks
- [ ] All members read → verify all blue

### Online Status

- [ ] User goes online → verify green dot
- [ ] User goes offline → verify gray dot + last seen
- [ ] Multiple tabs → verify status syncs

### Typing Indicators

- [ ] Type in personal chat → verify "typing..."
- [ ] Type in group → verify "User1 is typing..."
- [ ] Multiple users type → verify "User1, User2 are typing..."

### Background Customization

- [ ] Select solid color → verify applies
- [ ] Select gradient → verify applies
- [ ] Upload image → verify applies with blur
- [ ] Switch chats → verify backgrounds persist per chat

---

## 📊 **PERFORMANCE OPTIMIZATION**

1. **Debounce Typing Indicators**: Only send after 300ms of typing
2. **Throttle Status Updates**: Max 1 update per 5 seconds
3. **Message Pagination**: Load 50 messages at a time
4. **Virtual Scrolling**: For groups with 100+ messages
5. **WebSocket Reconnection**: Auto-reconnect with exponential backoff
6. **Memoize Components**: Use React.memo for ChatTile, GroupTile
7. **Lazy Load Images**: Use Intersection Observer for message images

---

## 🚀 **DEPLOYMENT**

```bash
# 1. Build Frontend
npm run build

# 2. Start WebSocket Server (PM2)
pm2 start server/server-v2.js --name chatapp-ws

# 3. Deploy Smart Contract
npx hardhat run scripts/deploy-v5.js --network celo

# 4. Update Environment Variables
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

---

## 📚 **API REFERENCE**

### Smart Contract Events to Listen

```solidity
GroupCreated(groupId, creator, name, timestamp)
GroupMessageSent(groupId, sender, messageIndex, timestamp, txHash)
MemberAdded(groupId, member, addedBy)
MemberRemoved(groupId, member, removedBy)
GroupMessageRead(groupId, messageIndex, reader)
MessageDelivered(chatId, messageIndex, recipient)
MessageRead(chatId, messageIndex, reader)
UserOnlineStatusChanged(user, isOnline)
```

### WebSocket Events to Handle

```typescript
// Incoming
"user-online", "user-offline", "user-status-changed";
"receive-message", "message-delivered", "message-read-receipt";
("user-typing");
"receive-group-message", "group-message-read-receipt";
("group-user-typing");
"group-member-added", "group-member-removed";
"added-to-group", "removed-from-group";

// Outgoing
"register", "set-online-status";
"new-message", "message-read";
"typing-start", "typing-stop";
"join-group", "leave-group";
"group-message", "group-message-read";
"group-typing-start", "group-typing-stop";
```

---

## ✅ **SUMMARY**

**Completed**:

- ✅ Smart contract with full group + status features
- ✅ Enhanced WebSocket server with all events
- ✅ Group creation modal with animations

**Remaining** (Next Implementation):

- Group chat window component
- Background selector modal
- Message status tick component
- Enhanced sidebar with groups
- Online status indicator
- Typing indicator component
- Web3 context integration
- Full testing & deployment

**Estimated Time**: 4-6 hours for remaining components

All foundational architecture is complete! The remaining work is primarily UI components that follow the established patterns.
