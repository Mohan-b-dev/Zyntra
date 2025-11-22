# Quick Testing Guide - Communication Bridge

## 🚀 Your app is now running on http://localhost:3001

## ✅ What Was Fixed

1. **Comprehensive Debug Logging** - Every blockchain operation now logs detailed information
2. **Transaction Tracking** - All transactions show hash, confirmation, block number, and gas used
3. **Error Handling** - All contract errors are caught and displayed with helpful messages
4. **Registration Checks** - App now verifies user is registered before sending messages
5. **Provider Status** - Clear indication of HTTP RPC with 5-second polling

## 🧪 Testing Steps

### 1. Connect Wallet & Check Console

```
Expected logs:
🔗 [CONNECT] Starting wallet connection...
✅ [CONNECT] Wallet connected: 0x123...
🌐 [CONNECT] Current network: Celo Sepolia
✅ [CONNECT] Contract verified. Total users: X
🎉 [CONNECT] Connection complete! Provider type: HTTP RPC
ℹ️ [CONNECT] Using polling for updates (5s intervals)
⚠️ [CONNECT] WebSocket events not supported with current provider
```

**What to check**:

- ✅ Contract address matches: `0x5C801a1C423104A4e115725D7bb431f225CB0D15`
- ✅ Total users is a number (not error)
- ✅ No red errors in console

---

### 2. Register User (if needed)

```
Expected logs:
📝 [REGISTER] Attempting to register user...
   Username: YourUsername
🔄 [REGISTER] Sending transaction...
✅ [REGISTER] Transaction submitted: 0xabc123...
⏳ [REGISTER] Waiting for confirmation...
✅ [REGISTER] Registration confirmed!
📦 [REGISTER] Block number: 12345678
⛽ [REGISTER] Gas used: 123456
```

**What to check**:

- ✅ Transaction hash appears
- ✅ Registration confirms within 5-10 seconds
- ✅ Gas used is reasonable (< 200,000)

---

### 3. Send a Message

```
Expected logs:
📤 [SEND_MSG] Preparing to send message to 0x456...
📤 [SEND_MSG] Content: "Hello world"
📤 [SEND_MSG] Type: text
✅ [SEND_MSG] Pre-flight checks passed
💬 [SEND_MSG] Adding optimistic message to UI
🔄 [SEND_MSG] Sending transaction to blockchain...
✅ [SEND_MSG] Transaction submitted!
📍 [SEND_MSG] Transaction hash: 0xdef456...
⏳ [SEND_MSG] Waiting for confirmation...
✅ [SEND_MSG] Transaction confirmed!
📦 [SEND_MSG] Block number: 12345679
⛽ [SEND_MSG] Gas used: 98765
🔄 [SEND_MSG] Reloading messages to get blockchain data
🔄 [SEND_MSG] Reloading sidebar
```

**What to check**:

- ✅ Message appears immediately in UI (optimistic)
- ✅ Transaction hash logged
- ✅ Confirmation within 5-10 seconds
- ✅ Message stays after confirmation (not removed)
- ✅ Copy transaction hash and verify on Celo Sepolia explorer

**Verify on blockchain**:

1. Copy the transaction hash from console
2. Go to https://celo-sepolia.blockscout.com/
3. Paste the hash and verify transaction succeeded

---

### 4. Verify Message Receiving

```
Expected logs (every 5 seconds):
🔄 [POLLING] Fetching updates...
📋 [LOAD_CHATS] Loading user chats...
📋 [LOAD_CHATS] Found X registered users
✅ [LOAD_CHATS] Loaded X chats with messages
📥 [LOAD_MESSAGES] Loading messages with 0x456...
✅ [LOAD_MESSAGES] Received 5 messages (total: 5)
✅ [LOAD_MESSAGES] Formatted 5 messages for display
✅ [POLLING] Update complete
```

**What to check**:

- ✅ Polling happens every ~5 seconds
- ✅ Messages load successfully
- ✅ Message count matches what's in chat window
- ✅ No errors during polling

---

### 5. Test Error Cases

#### A. Send message without registration

```
Expected:
❌ [SEND_MSG] User not registered
```

**Result**: Should show error "You must register before sending messages"

#### B. Send empty message

```
Expected:
❌ [SEND_MSG] Error sending message: MessageEmpty
```

**Result**: Should show error "Message cannot be empty"

#### C. Send very long message (> 500 chars)

```
Expected:
❌ [SEND_MSG] Error sending message: MessageTooLong
```

**Result**: Should show error "Message too long (max 500 characters)"

---

## 🔍 Troubleshooting

### Problem: Messages send but don't appear

**Check**:

1. Look for transaction hash in console
2. Verify transaction on Celo Sepolia explorer
3. Check if polling is working (logs every 5s)
4. Verify `✅ [LOAD_MESSAGES] Received X messages` shows correct count

**Solution**: If transaction succeeded but messages don't load:

- Check filtering logic in `useFilteredMessages`
- Verify `selectedChat` matches message recipient/sender
- Check browser console for filtering logs

---

### Problem: "Contract not initialized" errors

**Check**:

```
❌ [SEND_MSG] Contract or account not initialized
```

**Solution**:

1. Disconnect wallet
2. Reconnect wallet
3. Verify you see: `✅ [CONNECT] Contract verified. Total users: X`
4. Try sending again

---

### Problem: Transaction fails immediately

**Check console for**:

```
❌ [SEND_MSG] Error details: {
  code: 4001,
  reason: "User rejected",
  message: "..."
}
```

**Common codes**:

- `4001` - User rejected transaction in MetaMask
- `-32603` - Internal JSON-RPC error (network issue)
- `INSUFFICIENT_FUNDS` - Not enough CELO for gas

**Solution**:

- If code 4001: Approve transaction in MetaMask
- If insufficient funds: Get CELO from Celo Sepolia faucet
- If network error: Check MetaMask is connected to Celo Sepolia

---

### Problem: Polling stops or errors

**Check**:

```
❌ [POLLING] Error during polling: ...
```

**Solution**:

1. Check network connection
2. Verify MetaMask is still connected
3. Refresh page to restart polling

---

## 📊 Performance Checks

### Normal Operation

- **Polling**: Every 5 seconds
- **Transaction Time**: 5-10 seconds for confirmation
- **Message Loading**: < 2 seconds for 100 messages
- **Gas Usage**:
  - Registration: ~150,000 gas
  - Send Message: ~80,000-120,000 gas

### Red Flags

- ❌ Polling stops
- ❌ Transactions take > 30 seconds
- ❌ Gas usage > 300,000
- ❌ Constant errors in console

---

## 🎯 Success Criteria

Your communication bridge is working correctly if:

✅ **Connection**

- Contract verifies on connect
- Total users appears
- Provider type shown

✅ **Sending**

- Transaction hash appears
- Confirmation within 10 seconds
- Message appears in chat
- Sidebar updates

✅ **Receiving**

- Polling updates every 5s
- New messages appear within 5s
- Sidebar shows correct last message
- Message count matches

✅ **Errors**

- Helpful error messages
- Failed transactions logged with details
- No silent failures

---

## 📝 Reporting Issues

If you find a problem, include:

1. **Console logs** showing the full sequence
2. **Transaction hash** if available
3. **Error details** (code, reason, message)
4. **Expected vs actual** behavior

Example:

```
ISSUE: Message sends but doesn't appear in chat

LOGS:
✅ [SEND_MSG] Transaction confirmed!
📍 [SEND_MSG] Transaction hash: 0xabc123...
🔄 [SEND_MSG] Reloading messages to get blockchain data
📥 [LOAD_MESSAGES] Loading messages with 0x456...
✅ [LOAD_MESSAGES] Received 5 messages (total: 5)
✅ [LOAD_MESSAGES] Formatted 5 messages for display

ACTUAL: Chat shows 4 messages instead of 5
EXPECTED: Chat should show all 5 messages
```

---

## 🚀 Next Steps

Once you verify everything works:

1. **Test with multiple users** - Send messages between different accounts
2. **Test edge cases** - Empty messages, long messages, rapid sending
3. **Monitor gas usage** - Optimize if needed
4. **Consider WebSocket** - For real-time updates without polling (requires different RPC provider)

---

## 📚 Documentation

For detailed debugging information, see:

- `COMMUNICATION_BRIDGE_FIX.md` - Complete logging system documentation
- `CHAT_RENDERING_FIX.md` - UI rendering fixes from previous iteration

---

**Your app is ready for testing! 🎉**

Open http://localhost:3001 and follow the steps above to verify everything works correctly.
