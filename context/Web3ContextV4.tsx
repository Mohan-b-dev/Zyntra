"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { ethers, BrowserProvider, Contract } from "ethers";

// ChatDAppV4 deployed on Celo Sepolia - V4 with gas optimizations
const CONTRACT_ADDRESS = "0x5C801a1C423104A4e115725D7bb431f225CB0D15";
const CONTRACT_ABI: any[] = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_messageIndex",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_emoji",
        type: "string",
      },
    ],
    name: "addReaction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "ChatDoesNotExist",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_messageIndex",
        type: "uint256",
      },
    ],
    name: "deleteMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "InvalidMessageIndex",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPagination",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_messageIndex",
        type: "uint256",
      },
    ],
    name: "markMessageAsRead",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "MessageDoesNotExist",
    type: "error",
  },
  {
    inputs: [],
    name: "MessageEmpty",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "provided",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "max",
        type: "uint256",
      },
    ],
    name: "MessageTooLong",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "timeRemaining",
        type: "uint256",
      },
    ],
    name: "RateLimitExceeded",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_username",
        type: "string",
      },
      {
        internalType: "string",
        name: "_avatarUrl",
        type: "string",
      },
      {
        internalType: "string",
        name: "_status",
        type: "string",
      },
    ],
    name: "registerUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "string",
        name: "_content",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "_messageType",
        type: "uint8",
      },
    ],
    name: "sendPrivateMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "provided",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "max",
        type: "uint256",
      },
    ],
    name: "StatusTooLong",
    type: "error",
  },
  {
    inputs: [],
    name: "UnauthorizedAccess",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_avatarUrl",
        type: "string",
      },
      {
        internalType: "string",
        name: "_status",
        type: "string",
      },
    ],
    name: "updateProfile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "UserAlreadyRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "UserNotRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "UsernameInvalid",
    type: "error",
  },
  {
    inputs: [],
    name: "UsernameTaken",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "provided",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "max",
        type: "uint256",
      },
    ],
    name: "UsernameTooLong",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "provided",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "min",
        type: "uint256",
      },
    ],
    name: "UsernameTooShort",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "chatId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user1",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user2",
        type: "address",
      },
    ],
    name: "ChatStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "chatId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "messageIndex",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "deleter",
        type: "address",
      },
    ],
    name: "MessageDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "chatId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "messageIndex",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "reactor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "emoji",
        type: "string",
      },
    ],
    name: "MessageReacted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "chatId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "messageIndex",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
    ],
    name: "MessageRead",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "chatId",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "messageIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint48",
        name: "timestamp",
        type: "uint48",
      },
      {
        indexed: false,
        internalType: "string",
        name: "preview",
        type: "string",
      },
    ],
    name: "PrivateMessageSent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "username",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "avatarUrl",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "status",
        type: "string",
      },
    ],
    name: "ProfileUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "username",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint48",
        name: "timestamp",
        type: "uint48",
      },
    ],
    name: "UserRegistered",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_username",
        type: "string",
      },
    ],
    name: "getAddressByUsername",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user1",
        type: "address",
      },
      {
        internalType: "address",
        name: "_user2",
        type: "address",
      },
    ],
    name: "getChatId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
    ],
    name: "getChatMetadata",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "user1",
            type: "address",
          },
          {
            internalType: "address",
            name: "user2",
            type: "address",
          },
          {
            internalType: "uint48",
            name: "lastMessageTime",
            type: "uint48",
          },
          {
            internalType: "uint32",
            name: "messageCount",
            type: "uint32",
          },
          {
            internalType: "bool",
            name: "exists",
            type: "bool",
          },
        ],
        internalType: "struct ChatDAppV4.ChatMetadata",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_messageIndex",
        type: "uint256",
      },
    ],
    name: "getMessageReactions",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "reactor",
            type: "address",
          },
          {
            internalType: "uint48",
            name: "timestamp",
            type: "uint48",
          },
          {
            internalType: "string",
            name: "emoji",
            type: "string",
          },
        ],
        internalType: "struct ChatDAppV4.MessageReaction[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_otherUser",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_limit",
        type: "uint256",
      },
    ],
    name: "getPrivateMessages",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint48",
            name: "timestamp",
            type: "uint48",
          },
          {
            internalType: "uint8",
            name: "messageType",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "isRead",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "isDeleted",
            type: "bool",
          },
          {
            internalType: "string",
            name: "content",
            type: "string",
          },
        ],
        internalType: "struct ChatDAppV4.PrivateMessage[]",
        name: "messages",
        type: "tuple[]",
      },
      {
        internalType: "uint256",
        name: "total",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_limit",
        type: "uint256",
      },
    ],
    name: "getRegisteredUsers",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalUsers",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getUserProfile",
    outputs: [
      {
        internalType: "string",
        name: "username",
        type: "string",
      },
      {
        internalType: "string",
        name: "avatarUrl",
        type: "string",
      },
      {
        internalType: "string",
        name: "status",
        type: "string",
      },
      {
        internalType: "uint48",
        name: "createdAt",
        type: "uint48",
      },
      {
        internalType: "uint48",
        name: "lastSeen",
        type: "uint48",
      },
      {
        internalType: "bool",
        name: "isRegistered",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

interface UserProfile {
  username: string;
  avatarUrl: string;
  status: string;
  createdAt: bigint;
  lastSeen: bigint;
  isRegistered: boolean;
}

interface PrivateMessage {
  sender: string;
  content: string;
  timestamp: bigint;
  isRead: boolean;
  isDeleted: boolean;
  messageType: string;
}

interface ChatInfo {
  address: string;
  username: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface Toast {
  id: string;
  type: "message" | "private" | "system";
  sender?: string;
  preview: string;
  timestamp: number;
}

interface Web3ContextType {
  account: string | null;
  contract: Contract | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // User management
  currentUser: UserProfile | null;
  isUserRegistered: boolean;
  isCheckingRegistration: boolean;
  registerUser: (
    username: string,
    avatarUrl?: string,
    status?: string
  ) => Promise<boolean>;
  updateProfile: (avatarUrl: string, status: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<UserProfile[]>;
  getAllUsers: (offset: number, limit: number) => Promise<UserProfile[]>;

  // Private messaging
  selectedChat: string | null;
  setSelectedChat: (address: string | null) => void;
  userChats: ChatInfo[];
  isLoadingChats: boolean;
  privateMessages: PrivateMessage[];
  isLoadingMessages: boolean;
  sendPrivateMessage: (
    recipient: string,
    content: string,
    type?: string
  ) => Promise<boolean>;
  markMessageAsRead: (chatId: string, messageIndex: number) => Promise<boolean>;
  deleteMessage: (chatId: string, messageIndex: number) => Promise<boolean>;
  addReaction: (
    chatId: string,
    messageIndex: number,
    emoji: string
  ) => Promise<boolean>;
  loadChatMessages: (otherUser: string) => Promise<void>;

  // Utils
  refreshData: () => Promise<void>;

  // Toast notifications (V4)
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

  // Chat states
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [userChats, setUserChats] = useState<ChatInfo[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Toast notifications (V4)
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to use this app."
        );
      }

      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);

      if (accounts.length === 0) {
        throw new Error("No accounts found. Please unlock MetaMask.");
      }

      // Check and switch to Celo Sepolia network
      const CELO_SEPOLIA_CHAIN_ID = 11142220;
      const network = await browserProvider.getNetwork();

      if (network.chainId !== BigInt(CELO_SEPOLIA_CHAIN_ID)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa044c" }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa044c",
                    chainName: "Celo Sepolia Testnet",
                    nativeCurrency: {
                      name: "CELO",
                      symbol: "CELO",
                      decimals: 18,
                    },
                    rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
                    blockExplorerUrls: ["https://celo-sepolia.blockscout.com/"],
                  },
                ],
              });
            } catch (addError) {
              throw new Error("Failed to add Celo Sepolia network to MetaMask");
            }
          } else {
            throw switchError;
          }
        }
      }

      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();

      const contractInstance = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setProvider(browserProvider);
      setAccount(userAddress);
      setContract(contractInstance);

      localStorage.setItem("walletConnected", "true");
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setCurrentUser(null);
    setIsUserRegistered(false);
    setUserChats([]);
    setPrivateMessages([]);
    setSelectedChat(null);
    localStorage.removeItem("walletConnected");
  };

  const checkUserRegistration = useCallback(async () => {
    if (!contract || !account) return;

    setIsCheckingRegistration(true);
    try {
      // V4 contract returns tuple: (username, avatarUrl, status, createdAt, lastSeen, isRegistered)
      const [username, avatarUrl, status, createdAt, lastSeen, isRegistered] =
        await contract.getUserProfile(account);

      setIsUserRegistered(isRegistered);

      if (isRegistered) {
        setCurrentUser({
          username,
          avatarUrl,
          status,
          createdAt: BigInt(createdAt),
          lastSeen: BigInt(lastSeen),
          isRegistered,
        });
      } else {
        setCurrentUser(null);
      }
    } catch (err: any) {
      console.error("Error checking registration:", err);
      setError("Failed to check user registration");
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [contract, account]);

  const registerUser = async (
    username: string,
    avatarUrl: string = "",
    status: string = "Hey there! I'm using ChatDApp"
  ): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setError(null);
      // V4 contract takes all 3 parameters in registerUser
      const tx = await contract.registerUser(username, avatarUrl, status);
      await tx.wait();

      await checkUserRegistration();
      return true;
    } catch (err: any) {
      console.error("Error registering user:", err);
      if (err.message.includes("UserAlreadyRegistered")) {
        setError("This wallet is already registered");
      } else if (err.message.includes("UsernameTaken")) {
        setError("Username already taken");
      } else if (err.message.includes("UsernameTooShort")) {
        setError("Username too short (min 3 characters)");
      } else if (err.message.includes("UsernameTooLong")) {
        setError("Username too long (max 20 characters)");
      } else {
        setError(err.message || "Failed to register user");
      }
      return false;
    }
  };

  const updateProfile = async (
    avatarUrl: string,
    status: string
  ): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setError(null);
      const tx = await contract.updateProfile(avatarUrl, status);
      await tx.wait();
      await checkUserRegistration();
      return true;
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
      return false;
    }
  };

  const getAllUsers = useCallback(
    async (offset: number = 0, limit: number = 50): Promise<UserProfile[]> => {
      if (!contract) return [];

      try {
        const userAddresses = await contract.getRegisteredUsers(offset, limit);
        const users: UserProfile[] = [];

        for (const address of userAddresses) {
          if (address !== account) {
            // Exclude current user
            // V4 contract returns tuple: (username, avatarUrl, status, createdAt, lastSeen, isRegistered)
            const [
              username,
              avatarUrl,
              status,
              createdAt,
              lastSeen,
              isRegistered,
            ] = await contract.getUserProfile(address);
            users.push({
              username,
              avatarUrl,
              status,
              createdAt: BigInt(createdAt),
              lastSeen: BigInt(lastSeen),
              isRegistered,
            });
          }
        }

        return users;
      } catch (err: any) {
        console.error("Error getting users:", err);
        return [];
      }
    },
    [contract, account]
  );

  const searchUsers = async (query: string): Promise<UserProfile[]> => {
    const allUsers = await getAllUsers(0, 100);
    return allUsers.filter((user) =>
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  };

  const loadUserChats = useCallback(async () => {
    if (!contract || !account) return;

    setIsLoadingChats(true);
    try {
      // GAS OPTIMIZED: Get all users at once
      const allUsers = await getAllUsers(0, 100);
      const chatsWithMessages: ChatInfo[] = [];

      // Use Promise.all for parallel calls (faster)
      const chatPromises = allUsers.map(async (user) => {
        try {
          // Use getChatId directly (cheaper than getAddressByUsername)
          const userAddress = await contract.getAddressByUsername(
            user.username
          );

          // Get message count
          const result = await contract.getPrivateMessages(userAddress, 0, 1);
          const messages = Array.isArray(result) ? result[0] : result;
          const total = Array.isArray(result) ? result[1] : 0;

          if (Number(total) > 0 && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];

            return {
              address: userAddress,
              username: user.username,
              avatarUrl: user.avatarUrl,
              lastMessage: lastMsg.isDeleted
                ? "This message was deleted"
                : lastMsg.content,
              lastMessageTime: Number(lastMsg.timestamp),
              unreadCount: 0,
            };
          }
          return null;
        } catch (err) {
          console.error(`Error loading chat for ${user.username}:`, err);
          return null;
        }
      });

      const results = await Promise.all(chatPromises);

      // Filter out nulls and sort
      const validChats = results.filter(
        (chat): chat is ChatInfo => chat !== null
      );
      validChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      setUserChats(validChats);
    } catch (err: any) {
      console.error("Error loading chats:", err);
    } finally {
      setIsLoadingChats(false);
    }
  }, [contract, account, getAllUsers]);

  const loadChatMessages = useCallback(
    async (otherUser: string) => {
      if (!contract) return;

      setIsLoadingMessages(true);
      try {
        // V4 returns tuple: [messages, total]
        const result = await contract.getPrivateMessages(otherUser, 0, 100);

        // Handle the tuple return [messages, total]
        const messages = Array.isArray(result) ? result[0] : result;

        // Convert messageType from uint8 to string and format timestamps
        const formattedMessages = messages.map((msg: any) => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: BigInt(msg.timestamp), // Keep as bigint for consistency
          isRead: msg.isRead,
          isDeleted: msg.isDeleted,
          messageType:
            msg.messageType === 1
              ? "image"
              : msg.messageType === 2
              ? "file"
              : "text",
        }));

        setPrivateMessages(formattedMessages);
      } catch (err: any) {
        console.error("Error loading messages:", err);
        setError("Failed to load messages");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [contract]
  );

  const sendPrivateMessage = async (
    recipient: string,
    content: string,
    messageType: string = "text"
  ): Promise<boolean> => {
    if (!contract || !account) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setError(null);

      // OPTIMISTIC UI: Add message immediately before blockchain confirmation
      const optimisticMessage = {
        sender: account,
        content: content,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        isRead: false,
        isDeleted: false,
        messageType: messageType,
        isPending: true, // Flag for optimistic message
      };

      // Add to UI immediately
      if (selectedChat === recipient) {
        setPrivateMessages((prev) => [...prev, optimisticMessage]);
      }

      // Convert messageType string to uint8: 0=text, 1=image, 2=file
      let messageTypeInt: number = 0;
      if (messageType === "image") messageTypeInt = 1;
      else if (messageType === "file") messageTypeInt = 2;

      // Send to blockchain
      const tx = await contract.sendPrivateMessage(
        recipient,
        content,
        messageTypeInt
      );

      // Wait for confirmation in background, don't block UI
      tx.wait()
        .then(() => {
          // Reload to get actual data with correct timestamp
          if (selectedChat === recipient) {
            loadChatMessages(recipient);
          }
          loadUserChats();
        })
        .catch((err: any) => {
          console.error("Transaction failed:", err);
          // Remove optimistic message on failure
          setPrivateMessages((prev) =>
            prev.filter((msg: any) => !msg.isPending)
          );
          setError("Message failed to send");
        });

      return true;
    } catch (err: any) {
      console.error("Error sending message:", err);

      // Remove optimistic message on error
      setPrivateMessages((prev: any[]) =>
        prev.filter((msg: any) => !msg.isPending)
      );

      if (err.message.includes("RateLimitExceeded")) {
        setError("Please wait before sending another message");
      } else if (err.message.includes("MessageTooLong")) {
        setError("Message too long (max 500 characters)");
      } else if (err.message.includes("MessageEmpty")) {
        setError("Message cannot be empty");
      } else if (err.message.includes("UserNotRegistered")) {
        setError("Recipient is not registered");
      } else {
        setError(err.message || "Failed to send message");
      }
      return false;
    }
  };

  const markMessageAsRead = async (
    chatId: string,
    messageIndex: number
  ): Promise<boolean> => {
    if (!contract) return false;

    try {
      const tx = await contract.markMessageAsRead(chatId, messageIndex);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error marking message as read:", err);
      return false;
    }
  };

  const deleteMessage = async (
    chatId: string,
    messageIndex: number
  ): Promise<boolean> => {
    if (!contract) return false;

    try {
      const tx = await contract.deleteMessage(chatId, messageIndex);
      await tx.wait();

      // Reload messages
      if (selectedChat) {
        await loadChatMessages(selectedChat);
      }
      return true;
    } catch (err: any) {
      console.error("Error deleting message:", err);
      setError(err.message || "Failed to delete message");
      return false;
    }
  };

  const addReaction = async (
    chatId: string,
    messageIndex: number,
    emoji: string
  ): Promise<boolean> => {
    if (!contract) return false;

    try {
      const tx = await contract.addReaction(chatId, messageIndex, emoji);
      await tx.wait();

      // Reload messages
      if (selectedChat) {
        await loadChatMessages(selectedChat);
      }
      return true;
    } catch (err: any) {
      console.error("Error adding reaction:", err);
      return false;
    }
  };

  const refreshData = async () => {
    await checkUserRegistration();
    await loadUserChats();
    if (selectedChat) {
      await loadChatMessages(selectedChat);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    if (wasConnected === "true") {
      connectWallet();
    }
  }, []);

  // Check registration when connected
  useEffect(() => {
    if (contract && account) {
      checkUserRegistration();
    }
  }, [contract, account, checkUserRegistration]);

  // Load chats when registered
  useEffect(() => {
    if (isUserRegistered) {
      loadUserChats();
    }
  }, [isUserRegistered, loadUserChats]);

  // Load messages when chat selected
  useEffect(() => {
    if (selectedChat && contract) {
      loadChatMessages(selectedChat);
    }
  }, [selectedChat, contract]);

  // Account/network change listeners
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [account]);

  // POLLING: Check for new messages every 5 seconds (since HTTP RPC doesn't support events)
  useEffect(() => {
    if (!contract || !account || !isUserRegistered) return;

    console.log("Starting message polling...");

    // Initial load
    loadUserChats();

    // Poll every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        // Reload chat list to catch new messages
        await loadUserChats();

        // If viewing a chat, reload its messages
        if (selectedChat) {
          await loadChatMessages(selectedChat);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // 5 seconds

    return () => {
      console.log("Stopping message polling...");
      clearInterval(pollInterval);
    };
  }, [
    contract,
    account,
    isUserRegistered,
    selectedChat,
    loadUserChats,
    loadChatMessages,
  ]);

  // EVENT LISTENER: Try to listen for events (works with WebSocket providers)
  useEffect(() => {
    if (!contract || !account) return;

    console.log("Setting up event listener...");

    const handleNewMessage = async (
      chatId: string,
      sender: string,
      recipient: string,
      messageIndex: bigint,
      timestamp: bigint,
      preview: string
    ) => {
      const senderLower = sender.toLowerCase();
      const recipientLower = recipient.toLowerCase();
      const accountLower = account.toLowerCase();

      console.log("🔔 New message event received:", {
        sender: sender.slice(0, 10),
        recipient: recipient.slice(0, 10),
        preview,
      });

      // Check if this message is for current user (either sent or received)
      const isForCurrentUser =
        senderLower === accountLower || recipientLower === accountLower;

      if (!isForCurrentUser) return;

      // If we're the receiver and not currently viewing this chat, show popup
      if (
        recipientLower === accountLower &&
        selectedChat?.toLowerCase() !== senderLower
      ) {
        console.log("📬 Showing notification for new message");
        // Get sender username for the notification
        try {
          const [username] = await contract.getUserProfile(sender);
          addToast({
            type: "private",
            sender: username || sender.slice(0, 10),
            preview: preview || "New message",
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("Error getting sender profile:", err);
          addToast({
            type: "private",
            sender: sender.slice(0, 10),
            preview: preview || "New message",
            timestamp: Date.now(),
          });
        }
      }

      // Reload messages if we're viewing this chat
      const otherUser = senderLower === accountLower ? recipient : sender;
      if (selectedChat?.toLowerCase() === otherUser.toLowerCase()) {
        console.log("💬 Reloading messages for active chat");
        await loadChatMessages(otherUser);
      }

      // Always reload chat list to update sidebar
      console.log("📝 Reloading sidebar");
      await loadUserChats();
    };

    // Try to listen for events (may not work with HTTP RPC)
    try {
      const filter = contract.filters.PrivateMessageSent();
      contract.on(filter, handleNewMessage);
      console.log("✅ Event listener active");

      return () => {
        console.log("🔴 Removing event listener");
        contract.off(filter, handleNewMessage);
      };
    } catch (err) {
      console.warn(
        "⚠️ Event listener not supported (using polling instead):",
        err
      );
      return undefined;
    }
  }, [
    contract,
    account,
    selectedChat,
    addToast,
    loadChatMessages,
    loadUserChats,
  ]);

  return (
    <Web3Context.Provider
      value={{
        account,
        contract,
        provider,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        currentUser,
        isUserRegistered,
        isCheckingRegistration,
        registerUser,
        updateProfile,
        searchUsers,
        getAllUsers,
        selectedChat,
        setSelectedChat,
        userChats,
        isLoadingChats,
        privateMessages,
        isLoadingMessages,
        sendPrivateMessage,
        markMessageAsRead,
        deleteMessage,
        addReaction,
        loadChatMessages,
        refreshData,
        // Toast notifications (V4)
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
