# ChatDApp v3.0 - WhatsApp-like Features Setup Guide

## 🎉 What's New in v3.0

### Major Features Added:

1. **User Profiles** - Username, avatar, custom status
2. **Private 1-to-1 Chats** - Direct messaging between users
3. **Message Management** - Read receipts, delete messages, reactions
4. **WhatsApp-like UI** - Sidebar, chat window, contacts list
5. **User Discovery** - Search and find users to chat with
6. **Pagination** - Efficient message and user loading

## 📋 Prerequisites

- MetaMask installed
- Test CELO tokens (from https://faucet.celo.org)
- Your previous deployment address: `0xB17EB8E739504181c81447b5b29a436C6D9C675f` (v2)

## 🚀 Deployment Steps

### Step 1: Compile New Contract

1. Open **Remix IDE**: https://remix.ethereum.org/
2. Create new file: `ChatDAppV3.sol`
3. Copy the contract from: `contracts/ChatDAppV3.sol`
4. **Compiler Settings:**
   - Solidity Version: `0.8.19+`
   - Optimization: **ENABLED** with `200` runs
   - EVM Version: `paris`
5. Click **Compile ChatDAppV3.sol**

### Step 2: Deploy to Celo Sepolia

1. **Environment**: Select "Injected Provider - MetaMask"
2. **Network**: Ensure MetaMask is on **Celo Sepolia**
   - Chain ID: `11142220`
   - RPC: `https://forno.celo-sepolia.celo-testnet.org`
3. **Deploy**: Click "Deploy" button
4. **Confirm** transaction in MetaMask
5. **Copy** the deployed contract address

### Step 3: Extract Contract ABI

1. In Remix, go to **Compile** tab
2. Scroll down to "Compilation Details"
3. Click "ABI" button to copy
4. Save this ABI - you'll need it in Step 4

### Step 4: Update Frontend Configuration

#### A. Update Web3ContextV3.tsx

Open `context/Web3ContextV3.tsx` and update:

**Line 12-13:**

```typescript
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_ADDRESS_HERE"; // Replace with your contract address
const CONTRACT_ABI: any[] = [
  /* PASTE ABI HERE */
];
```

**Example:**

```typescript
const CONTRACT_ADDRESS = "0xYOUR_NEW_CONTRACT_ADDRESS";
const CONTRACT_ABI = [
  {
    inputs: [],
    name: "MessageEmpty",
    type: "error",
  },
  // ... rest of ABI
];
```

#### B. Update Layout to Use v3 Context

Open `app/layout.tsx` and change the import:

```typescript
// OLD:
import { Web3Provider } from "@/context/Web3Context";

// NEW:
import { Web3Provider } from "@/context/Web3ContextV3";
```

#### C. Update Main Page

Open `app/page.tsx` and replace entire content with the v3 page:

```typescript
// Copy everything from app/v3page.tsx to app/page.tsx
```

Or simply:

```bash
# In PowerShell
Copy-Item app\v3page.tsx app\page.tsx -Force
```

### Step 5: Start Development Server

```powershell
npm run dev
```

Visit: `http://localhost:3001`

## 🎯 Testing the New Features

### Test Flow:

1. **Connect Wallet**

   - Click "Connect Wallet"
   - Approve network switch to Celo Sepolia
   - MetaMask should show correct network

2. **Register Profile**

   - Enter username (3-20 characters)
   - Add avatar URL (optional)
   - Set status message
   - Click "Create Profile"
   - Confirm transaction in MetaMask

3. **Find Contacts**

   - Click "+" icon in sidebar
   - Search for users
   - Click on user to start chat

4. **Send Private Messages**

   - Type message in chat window
   - Click send button
   - Message appears in chat
   - Check read receipts (✓ or ✓✓)

5. **Update Profile**
   - Click settings icon in sidebar
   - Update avatar URL or status
   - Click "Update Profile"

## 📱 UI Components Overview

### Created Components:

1. **Sidebar.tsx** - Chat list with search
2. **ChatWindow.tsx** - Message display and sending
3. **ContactsList.tsx** - User discovery modal
4. **ProfileModal.tsx** - Profile editing
5. **RegistrationModal.tsx** - Initial signup

### Features:

- ✅ Dark theme by default
- ✅ Responsive (mobile & desktop)
- ✅ Real-time message updates
- ✅ Message timestamps & grouping
- ✅ Unread message counts
- ✅ Avatar support
- ✅ Status messages
- ✅ Search functionality

## 🔧 Smart Contract Functions

### User Management:

- `registerUser(username)` - Create account
- `updateProfile(avatarUrl, status)` - Update profile
- `getUserProfile(address)` - Get user info
- `getAddressByUsername(username)` - Username lookup
- `getRegisteredUsers(offset, limit)` - Pagination

### Private Messaging:

- `sendPrivateMessage(recipient, content, type)` - Send message
- `getPrivateMessages(otherUser, offset, limit)` - Get messages
- `markMessageAsRead(chatId, messageIndex)` - Mark read
- `deleteMessage(chatId, messageIndex)` - Delete message
- `addReaction(chatId, messageIndex, emoji)` - Add reaction
- `getChatId(user1, user2)` - Get chat identifier

## 🎨 Customization

### Colors:

Edit `tailwind.config.ts` to change theme colors.

### Icons:

Using `lucide-react` library. Replace icons in components.

### Network:

To change network, update chain ID in `Web3ContextV3.tsx`:

```typescript
const CELO_SEPOLIA_CHAIN_ID = 11142220; // Change this
```

## 🐛 Troubleshooting

### Issue: "Contract not initialized"

**Solution**: Make sure CONTRACT_ADDRESS and CONTRACT_ABI are updated in Web3ContextV3.tsx

### Issue: Messages not loading

**Solution**: Check MetaMask is on Celo Sepolia network

### Issue: "User not registered" error

**Solution**: Complete registration first by filling profile form

### Issue: Can't find users

**Solution**: Other users must register first. Test with multiple wallets.

## 📊 Gas Optimization Features

The v3 contract includes:

- ✅ `calldata` instead of `memory` for strings
- ✅ `unchecked` math for loops
- ✅ Efficient pagination (max 50 items)
- ✅ Deterministic chatId generation
- ✅ Minimal storage patterns

## 🔐 Security Features

- Username uniqueness validation
- Rate limiting (1 second between messages)
- Message length limits (500 chars)
- Status length limits (100 chars)
- Self-message prevention
- Sender verification for deletions

## 📈 Next Steps

1. **Deploy Contract** - Follow steps above
2. **Update Frontend** - Configure CONTRACT_ADDRESS and ABI
3. **Test Features** - Register, chat, update profile
4. **Invite Users** - Share app with friends
5. **Monitor Gas** - Check transaction costs

## 🎊 Migration from v2

If you have v2 deployed at `0xB17EB8E739504181c81447b5b29a436C6D9C675f`:

**Option 1: Fresh Start (Recommended)**

- Deploy v3 as new contract
- All users re-register
- Start with clean slate

**Option 2: Parallel Deployment**

- Keep v2 running
- Deploy v3 separately
- Run both versions

**Note**: v2 and v3 are **NOT** compatible. They use different storage structures.

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify MetaMask network settings
3. Ensure contract is deployed and verified
4. Check transaction history on block explorer

## 🌟 Features Comparison

| Feature           | v1  | v2  | v3  |
| ----------------- | --- | --- | --- |
| Public Chat       | ✅  | ✅  | ❌  |
| User Registration | ❌  | ✅  | ✅  |
| User Profiles     | ❌  | ❌  | ✅  |
| Private Chats     | ❌  | ❌  | ✅  |
| Message Reactions | ❌  | ❌  | ✅  |
| Delete Messages   | ❌  | ❌  | ✅  |
| Read Receipts     | ❌  | ❌  | ✅  |
| User Search       | ❌  | ❌  | ✅  |
| WhatsApp UI       | ❌  | ❌  | ✅  |

---

**Ready to deploy? Start with Step 1! 🚀**
