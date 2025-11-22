// Example Web3ContextV4.tsx - Key additions to integrate everything
// Copy your existing Web3ContextV3.tsx and add these sections:

// 1. Add imports at top
import { useChatEvents } from "@/hooks/useChatEvents";
import { Toast } from "@/components/PopupToast";

// 2. Update CONTRACT_ADDRESS and ABI
const CONTRACT_ADDRESS = "YOUR_V4_CONTRACT_ADDRESS_HERE"; // Update after deployment
const CONTRACT_ABI: any[] = [
  // Paste V4 ABI here - Key difference: PrivateMessageSent event now has "preview" field
  // ... rest of ABI
];

// 3. Add to Web3ContextType interface
interface Web3ContextType {
  // ... existing fields ...

  // New V4 fields
  toasts: Toast[];
  removeToast: (id: string) => void;
}

// 4. Add to Web3Provider component state
export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  // ... existing state ...

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Profile cache for performance
  const profileCacheRef = useRef<Map<string, UserProfile>>(new Map());

  const getCachedProfile = async (
    address: string
  ): Promise<UserProfile | null> => {
    if (profileCacheRef.current.has(address)) {
      return profileCacheRef.current.get(address)!;
    }

    if (contract) {
      try {
        const profile = await contract.getUserProfile(address);
        const userProfile: UserProfile = {
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          status: profile.status,
          createdAt: profile.createdAt,
          lastSeen: profile.lastSeen,
          isRegistered: profile.isRegistered,
        };
        profileCacheRef.current.set(address, userProfile);
        return userProfile;
      } catch (err) {
        return null;
      }
    }
    return null;
  };

  // 5. Setup WebSocket event listeners
  useChatEvents({
    contractAddress: CONTRACT_ADDRESS,
    contractABI: CONTRACT_ABI,
    enabled: !!account && isUserRegistered,

    onPrivateMessage: useCallback(
      async (event) => {
        console.log("📨 Private message event:", event);

        // Only show toast if message is for current user and not from current user
        if (
          event.recipient.toLowerCase() === account?.toLowerCase() &&
          event.sender.toLowerCase() !== account?.toLowerCase()
        ) {
          // Get sender profile for notification
          const senderProfile = await getCachedProfile(event.sender);

          addToast({
            type: "private",
            sender: senderProfile?.username || event.sender.slice(0, 8),
            preview: event.preview || "New message",
            timestamp: Date.now(),
          });
        }

        // Refresh messages if in active chat with sender
        if (
          selectedChat?.toLowerCase() === event.sender.toLowerCase() ||
          selectedChat?.toLowerCase() === event.recipient.toLowerCase()
        ) {
          loadChatMessages(
            event.sender.toLowerCase() === account?.toLowerCase()
              ? event.recipient
              : event.sender
          );
        }

        // Refresh chat list
        loadUserChats();
      },
      [account, selectedChat, loadChatMessages, loadUserChats, addToast]
    ),

    onMessageRead: useCallback(
      (event) => {
        console.log("✓✓ Message read event:", event);

        // Update UI if in active chat
        if (selectedChat) {
          loadChatMessages(selectedChat);
        }
      },
      [selectedChat, loadChatMessages]
    ),

    onMessageDeleted: useCallback(
      (event) => {
        console.log("🗑️ Message deleted event:", event);

        // Update UI
        if (selectedChat) {
          loadChatMessages(selectedChat);
        }

        addToast({
          type: "system",
          preview: "A message was deleted",
          timestamp: Date.now(),
        });
      },
      [selectedChat, loadChatMessages, addToast]
    ),

    onMessageReacted: useCallback(
      async (event) => {
        console.log("❤️ Message reacted event:", event);

        // Get reactor profile
        const reactorProfile = await getCachedProfile(event.reactor);

        // Show toast if reaction is on our message
        if (selectedChat) {
          addToast({
            type: "system",
            sender: reactorProfile?.username || "Someone",
            preview: `Reacted with ${event.emoji}`,
            timestamp: Date.now(),
          });
        }

        // Update UI
        if (selectedChat) {
          loadChatMessages(selectedChat);
        }
      },
      [selectedChat, loadChatMessages, addToast]
    ),

    onUserRegistered: useCallback(
      (event) => {
        console.log("👤 User registered event:", event);

        addToast({
          type: "system",
          preview: `${event.username} joined ChatDApp!`,
          timestamp: Date.now(),
        });

        // Clear profile cache for this address
        profileCacheRef.current.delete(event.user);

        // Refresh user list
        loadUserChats();
      },
      [loadUserChats, addToast]
    ),
  });

  // 6. Update context value to include new fields
  const value: Web3ContextType = {
    // ... all existing fields ...

    // New V4 fields
    toasts,
    removeToast,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

// That's it! The rest of the file remains the same as V3
// Just update:
// 1. CONTRACT_ADDRESS
// 2. CONTRACT_ABI (with "preview" field in PrivateMessageSent event)
// 3. Add toast state
// 4. Add useChatEvents with handlers
// 5. Expose toasts and removeToast in context
