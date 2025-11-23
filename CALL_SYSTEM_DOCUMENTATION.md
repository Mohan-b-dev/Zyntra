# WhatsApp-Like Call System Documentation

## Overview

The call system now implements WhatsApp-like behavior with three distinct popup scenarios based on user context, eliminating race conditions and duplicate popups.

## Architecture

### Two-Layer System

1. **Call Controller (`useCallController.ts`)** - UI Logic

   - Manages popup variants (in-chat vs global-banner)
   - Handles ringtone playback
   - Implements timeout mechanism (30s)
   - Debounces duplicate calls
   - Shows OS notifications
   - Determines context-aware popup behavior

2. **WebRTC Hook (`useWebRTCEnhanced.ts`)** - Connection Logic
   - Manages actual call connection
   - Handles media streams (audio/video)
   - WebRTC signaling (offer/answer/ICE)
   - Call state management during active call

## Three Popup Scenarios

### Case A: In Caller's Chat

**Condition**: User is focused on the caller's chat window

```typescript
if (currentChat === caller && isChatFocused) return "in-chat";
```

**Behavior**:

- Shows `InChatCallPopup` below chat header
- Compact popup with Accept/Reject buttons
- No navigation needed

### Case B: In Different Chat

**Condition**: User is focused on a different chat

```typescript
if (currentChat && isChatFocused) return "in-chat";
```

**Behavior**:

- Shows `InChatCallPopup` in current chat
- On accept, navigates to caller's chat
- Maintains context while switching

### Case C: App Not Focused

**Condition**: User is not in the app or not focused on any chat

```typescript
if (!isAppFocused) return "global-banner";
```

**Behavior**:

- Shows `IncomingCallBanner` as global overlay
- OS notification sent
- Most prominent UI

## Component Structure

### Call Controller Hook

```typescript
const callController = useCallController({
  socket: webSocket?.socket || null,
  userAddress: account,
  currentChatAddress: selectedChat,
  isChatFocused,
  isAppFocused,
});
```

**State Machine**:

- `idle` - No call activity
- `ringing` - Incoming call (popup phase)
- `calling` - Outgoing call (waiting for answer)
- `connecting` - WebRTC connection establishing
- `connected` - Active call
- `ended` - Call terminated

**Key Methods**:

- `startCall(address, type, name)` - Initiate outgoing call
- `acceptCall()` - Accept incoming call
- `rejectCall()` - Reject incoming call
- `endCall()` - Terminate active call

### Integration with WebRTC

```typescript
// Controller handles UI
const callController = useCallController({...});

// WebRTC handles connection
const {
  callState: webrtcCallState,
  startCall: webrtcStartCall,
  answerCall: webrtcAnswerCall,
  ...
} = useWebRTCEnhanced({...});

// On call button click
onClick={() => {
  callController.startCall(address, "video", name);
  webrtcStartCall(address, "video");
}}

// On accept
onAccept={() => {
  callController.acceptCall();
  webrtcAnswerCall();
}}
```

## Ringtone Management

### Auto-Start/Stop

- Starts automatically on incoming call
- Stops on accept, reject, or timeout
- 30-second timeout for missed calls
- Uses generated WAV audio (sine wave)

### Cleanup Paths

All exit scenarios properly stop ringtone:

1. User accepts call → `acceptCall()` → `stopRingtone()`
2. User rejects call → `rejectCall()` → `stopRingtone()`
3. Caller cancels → `handleCallCancel()` → `stopRingtone()`
4. Call times out → `handleCallTimeout()` → `stopRingtone()`
5. Component unmounts → `useEffect cleanup` → `stopRingtone()`

## Debouncing & Race Condition Prevention

### Duplicate Call Prevention

```typescript
const callIdDebounceRef = useRef<Map<string, number>>(new Map());

// Ignore duplicate calls within 1 second
const lastTime = callIdDebounceRef.current.get(data.callId);
if (lastTime && now - lastTime < 1000) {
  console.log("⚠️ Duplicate call-offer ignored");
  return;
}
```

### Busy Signal

```typescript
// If already in a call, send busy
if (state.callState !== "idle") {
  socket?.emit("call-busy", { callId, caller });
  return;
}
```

## Focus Tracking

### Window Focus

```typescript
const [isAppFocused, setIsAppFocused] = useState(true);

useEffect(() => {
  const handleFocus = () => setIsAppFocused(true);
  const handleBlur = () => setIsAppFocused(false);

  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);

  return () => {
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("blur", handleBlur);
  };
}, []);
```

### Chat Focus

```typescript
const [isChatFocused, setIsChatFocused] = useState(false);

// Set when user clicks on chat or message input
```

## Components

### InChatCallPopup

**Location**: Below chat header
**Z-Index**: 80
**Features**:

- Caller avatar with pulse animation
- Caller name and address
- Accept/Reject buttons (green/red)
- Slide-in animation

### IncomingCallBanner

**Location**: Top of screen (global overlay)
**Z-Index**: 9999
**Features**:

- Full-width banner
- Caller info with avatar
- Accept/Reject buttons
- Prominent styling for visibility

### CallScreenV2

**Location**: Full-screen overlay
**Z-Index**: 100
**Features**:

- Video streams (local & remote)
- Call controls (mute, video, speaker)
- Call timer
- End call button
- Reconnection indicator

## WebSocket Events

### Incoming

- `incoming-call` - Controller listens, determines popup variant
- `call-cancel` - Controller handles, stops ringtone
- `call-busy` - Controller handles, shows toast
- `call-accept` - WebRTC handles
- `call-reject` - WebRTC handles

### Outgoing

- `call-offer` - WebRTC emits on startCall
- `call-answer` - WebRTC emits on acceptCall
- `call-reject` - Both emit on rejectCall
- `call-timeout` - Controller emits after 30s
- `call-busy` - Controller emits if already in call

## Timeout Mechanism

### 30-Second Timeout

```typescript
callTimeoutRef.current = setTimeout(() => {
  handleCallTimeout(data.callId);
}, 30000);
```

### Cleanup

```typescript
const clearCallTimeout = () => {
  if (callTimeoutRef.current) {
    clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = null;
  }
};
```

### Missed Call Logging

```typescript
// TODO: Implement storage
if (state.callInfo) {
  console.log("📝 Logging missed call from:", state.callInfo.peer);
  // Add to missed calls list
}
```

## OS Notifications

### Permission Check

```typescript
if (
  !isAppFocused &&
  "Notification" in window &&
  Notification.permission === "granted"
) {
  new Notification("Incoming Call", {
    body: `${callerName || caller} is calling...`,
    icon: "/icon.png",
    tag: callId,
  });
}
```

### Request Permission

Add to app initialization:

```typescript
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
```

## Testing Scenarios

### Test Case 1: In-Chat Popup

1. Open caller's chat
2. Receive call from that user
3. **Expected**: InChatCallPopup appears below header

### Test Case 2: In-Chat with Navigation

1. Open different chat (User B)
2. Receive call from User A
3. **Expected**: InChatCallPopup appears
4. Click Accept
5. **Expected**: Navigates to User A's chat + call connects

### Test Case 3: Global Banner

1. Blur window or close chat
2. Receive call
3. **Expected**: IncomingCallBanner at top + OS notification

### Test Case 4: Duplicate Prevention

1. Receive call
2. Server sends duplicate `incoming-call` within 1s
3. **Expected**: Only one popup, second ignored

### Test Case 5: Busy Signal

1. In active call with User A
2. Receive call from User B
3. **Expected**: No popup, User B gets busy signal

### Test Case 6: Timeout

1. Receive call
2. Don't answer for 30 seconds
3. **Expected**: Popup closes, ringtone stops, missed call logged

## Server-Side Requirements

### Call Timeout Handler (TODO)

```javascript
socket.on("call-timeout", ({ callId }) => {
  const caller = findUserByCallId(callId);
  if (caller) {
    io.to(caller.socketId).emit("call-timeout", { callId });
  }
});
```

### Missed Call Storage (TODO)

```javascript
// Store missed calls in database
await db.missedCalls.insert({
  callId,
  caller,
  callee,
  timestamp: Date.now(),
  type: "voice" | "video",
});
```

## Future Enhancements

1. **Missed Call Badge**: Show unread count on chat list
2. **Call History**: Display in chat timeline
3. **Custom Ringtones**: Per-user ringtone selection
4. **Group Calls**: Multi-participant support
5. **Picture-in-Picture**: Minimize call to corner
6. **Screen Sharing**: Share screen during video call
7. **Call Recording**: Record conversations (with consent)
8. **Call Statistics**: Track call quality metrics

## Debugging

### Enable Verbose Logging

All console logs use emoji prefixes:

- 📞 Incoming call
- 🔵 Voice call
- 🟣 Video call
- 🎯 Popup variant determination
- 🌍 Global banner
- 💬 In-chat popup
- ⚠️ Warnings
- ❌ Cancellations
- 📵 Busy/Timeout
- 📝 Logging
- ⏱️ Timeouts

### Check State

```typescript
console.log("Call Controller State:", {
  callState: callController.callState,
  popupVariant: callController.popupVariant,
  callInfo: callController.callInfo,
});

console.log("WebRTC State:", {
  callState: webrtcCallState,
  callInfo: webrtcCallInfo,
});
```

## Performance Considerations

- **Ringtone**: Audio generated once and reused
- **Debouncing**: Prevents duplicate processing
- **Cleanup**: All timeouts and listeners properly cleaned up
- **State Updates**: Batched in single setState calls
- **Memory**: Map for debouncing auto-clears old entries

## Security Considerations

- **Address Normalization**: All addresses lowercase
- **Call ID Validation**: Prevents replay attacks
- **Busy Signal**: Prevents call hijacking
- **Permission Check**: OS notifications require user consent

## Known Issues

None currently - all TypeScript errors resolved.

## Version History

- **v1.0.0** (Current) - WhatsApp-like three-scenario popup system
- **v0.9.0** - Removed duplicate modal, single banner
- **v0.8.0** - Added heartbeat system
- **v0.7.0** - Fixed presence detection
- **v0.6.0** - Initial call functionality
