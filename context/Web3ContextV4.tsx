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

export interface PrivateMessage {
  sender: string;
  recipient: string; // Added to track message recipient
  content: string;
  timestamp: bigint;
  isRead: boolean;
  isDeleted: boolean;
  messageType: string;
  deliveryStatus?: "sending" | "sent" | "delivered" | "read"; // WhatsApp-style delivery lifecycle
  messageId?: string;
  txHash?: string; // Transaction hash for tracking
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
  ) => Promise<{ success: boolean; txHash?: string }>;
  markMessageAsRead: (chatId: string, messageIndex: number) => Promise<boolean>;
  deleteMessage: (chatId: string, messageIndex: number) => Promise<boolean>;
  addReaction: (
    chatId: string,
    messageIndex: number,
    emoji: string
  ) => Promise<boolean>;
  loadChatMessages: (otherUser: string) => Promise<void>;
  updateMessageStatus: (
    txHash: string,
    status: "sending" | "sent" | "delivered" | "read"
  ) => void;

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
      console.log("🔗 [CONNECT] Starting wallet connection...");

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

      console.log(
        "✅ [CONNECT] Wallet connected:",
        accounts[0].slice(0, 10) + "..."
      );

      // Check and switch to Celo Sepolia network
      const CELO_SEPOLIA_CHAIN_ID = 11142220;
      const network = await browserProvider.getNetwork();

      console.log("🌐 [CONNECT] Current network:", {
        chainId: network.chainId.toString(),
        name: network.name,
      });

      if (network.chainId !== BigInt(CELO_SEPOLIA_CHAIN_ID)) {
        console.log("⚠️ [CONNECT] Wrong network. Switching to Celo Sepolia...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa044c" }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            console.log("➕ [CONNECT] Adding Celo Sepolia to MetaMask...");
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
        console.log("✅ [CONNECT] Network switched to Celo Sepolia");
      }

      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();

      console.log("📝 [CONNECT] Creating contract instance...");
      console.log("📍 [CONNECT] Contract Address:", CONTRACT_ADDRESS);
      console.log("👤 [CONNECT] User Address:", userAddress);

      const contractInstance = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Verify contract connection
      try {
        const totalUsers = await contractInstance.getTotalUsers();
        console.log(
          "✅ [CONNECT] Contract verified. Total users:",
          totalUsers.toString()
        );
      } catch (verifyError) {
        console.error(
          "❌ [CONNECT] Contract verification failed:",
          verifyError
        );
        throw new Error(
          "Failed to verify contract connection. Check contract address."
        );
      }

      setProvider(browserProvider);
      setAccount(userAddress);
      setContract(contractInstance);

      console.log("🎉 [CONNECT] Connection complete! Provider type: HTTP RPC");
      console.log("ℹ️ [CONNECT] Using polling for updates (5s intervals)");
      console.log(
        "⚠️ [CONNECT] WebSocket events not supported with current provider"
      );

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
      console.error("❌ [REGISTER] Contract not initialized");
      setError("Contract not initialized");
      return false;
    }

    console.log("📝 [REGISTER] Attempting to register user...");
    console.log("   Username:", username);
    console.log("   Avatar URL:", avatarUrl || "(none)");
    console.log("   Status:", status);

    try {
      setError(null);

      console.log("🔄 [REGISTER] Sending transaction...");
      // V4 contract takes all 3 parameters in registerUser
      const tx = await contract.registerUser(username, avatarUrl, status);

      console.log("✅ [REGISTER] Transaction submitted:", tx.hash);
      console.log("⏳ [REGISTER] Waiting for confirmation...");

      const receipt = await tx.wait();

      console.log("✅ [REGISTER] Registration confirmed!");
      console.log("📦 [REGISTER] Block number:", receipt.blockNumber);
      console.log("⛽ [REGISTER] Gas used:", receipt.gasUsed.toString());

      await checkUserRegistration();
      return true;
    } catch (err: any) {
      console.error("❌ [REGISTER] Registration failed:", err);
      console.error("❌ [REGISTER] Error details:", {
        code: err.code,
        reason: err.reason,
        message: err.message,
      });

      if (err.message.includes("UserAlreadyRegistered")) {
        setError("This wallet is already registered");
      } else if (err.message.includes("UsernameTaken")) {
        setError("Username already taken");
      } else if (err.message.includes("UsernameTooShort")) {
        setError("Username too short (min 3 characters)");
      } else if (err.message.includes("UsernameTooLong")) {
        setError("Username too long (max 20 characters)");
      } else {
        setError(err.reason || err.message || "Failed to register user");
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
        // First check total users count
        const totalUsers = await contract.getTotalUsers();
        const total = Number(totalUsers);

        if (total === 0) {
          console.log("No registered users yet");
          return [];
        }

        // Adjust limit if it exceeds remaining users
        const adjustedLimit = Math.min(limit, total - offset);

        if (adjustedLimit <= 0 || offset >= total) {
          console.log("No users in this range");
          return [];
        }

        const userAddresses = await contract.getRegisteredUsers(
          offset,
          adjustedLimit
        );
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
    if (!contract || !account) {
      console.warn("⚠️ [LOAD_CHATS] Contract or account not available");
      return;
    }

    console.log("📋 [LOAD_CHATS] Loading user chats...");
    setIsLoadingChats(true);
    try {
      // Get all users
      const allUsers = await getAllUsers(0, 100);
      console.log(`📋 [LOAD_CHATS] Found ${allUsers.length} registered users`);

      if (allUsers.length === 0) {
        console.log("No other users registered yet");
        setUserChats([]);
        setIsLoadingChats(false);
        return;
      }

      const chatsWithMessages: ChatInfo[] = [];

      // Check each user for messages
      for (const user of allUsers) {
        try {
          const userAddress = await contract.getAddressByUsername(
            user.username
          );

          // Get messages with this user
          const result = await contract.getPrivateMessages(userAddress, 0, 50);
          const messages = Array.isArray(result) ? result[0] : [];
          const total = Array.isArray(result) ? Number(result[1]) : 0;

          // Only add to chat list if there are messages
          if (total > 0 && messages.length > 0) {
            // Get the LAST message (most recent)
            const lastMsg = messages[messages.length - 1];

            chatsWithMessages.push({
              address: userAddress,
              username: user.username,
              avatarUrl: user.avatarUrl,
              lastMessage: lastMsg.isDeleted
                ? "🚫 This message was deleted"
                : lastMsg.content,
              lastMessageTime: Number(lastMsg.timestamp),
              unreadCount: 0, // TODO: Implement unread counting
            });
          }
        } catch (err) {
          console.error(`Error loading chat for ${user.username}:`, err);
        }
      }

      // Sort by most recent first
      chatsWithMessages.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      console.log(
        `✅ [LOAD_CHATS] Loaded ${chatsWithMessages.length} chats with messages`
      );
      setUserChats(chatsWithMessages);
    } catch (err: any) {
      console.error("❌ [LOAD_CHATS] Error loading chats:", err);
      console.error("❌ [LOAD_CHATS] Error details:", {
        code: err.code,
        reason: err.reason,
        message: err.message,
      });
      setUserChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [contract, account, getAllUsers]);

  const loadChatMessages = useCallback(
    async (otherUser: string, keepOptimistic: boolean = false) => {
      if (!contract || !account) {
        console.warn("⚠️ [LOAD_MESSAGES] Contract or account not available");
        console.warn("   Contract:", !!contract);
        console.warn("   Account:", account);
        return;
      }

      setIsLoadingMessages(true);
      console.log(
        `📥 [LOAD_MESSAGES] Loading messages with ${otherUser.slice(0, 10)}...`
      );
      console.log(`   Current account: ${account.slice(0, 10)}...`);
      console.log(`   Other user: ${otherUser.slice(0, 10)}...`);
      console.log(`   Keep optimistic: ${keepOptimistic}`);

      try {
        // V4 contract has PAGINATION_LIMIT = 50, so use limit of 50 instead of 100
        console.log(
          "🔄 [LOAD_MESSAGES] Calling contract.getPrivateMessages(offset=0, limit=50)..."
        );
        const result = await contract.getPrivateMessages(otherUser, 0, 50);

        // Handle the tuple return [messages, total]
        const messages = Array.isArray(result) ? result[0] : result;
        const total = Array.isArray(result) ? result[1] : messages.length;

        console.log(
          `✅ [LOAD_MESSAGES] Received ${
            messages.length
          } messages (total: ${total.toString()})`
        );

        if (messages.length === 0 && !keepOptimistic) {
          console.log("ℹ️ [LOAD_MESSAGES] No messages found for this chat");
          setPrivateMessages([]);
          setIsLoadingMessages(false);
          return;
        }

        // Convert messageType from uint8 to string and format timestamps
        // The contract returns messages between account and otherUser
        const formattedMessages = messages.map((msg: any, index: number) => {
          // Determine recipient based on sender
          const recipient =
            msg.sender.toLowerCase() === account.toLowerCase()
              ? otherUser
              : account;

          const formatted = {
            sender: msg.sender,
            recipient: recipient, // Add recipient field
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
            // Messages loaded from blockchain are already delivered
            // If marked as read in contract, set to "read", otherwise "delivered"
            deliveryStatus: (msg.isRead ? "read" : "delivered") as
              | "sending"
              | "sent"
              | "delivered"
              | "read",
            messageId: `blockchain-${msg.sender}-${msg.timestamp}`,
            txHash: `blockchain-${msg.sender}-${msg.timestamp}`, // Generate consistent ID for blockchain messages
          };

          console.log(`   Message ${index + 1}:`, {
            from: formatted.sender.slice(0, 10) + "...",
            to: formatted.recipient.slice(0, 10) + "...",
            content:
              formatted.content.slice(0, 30) +
              (formatted.content.length > 30 ? "..." : ""),
            time: new Date(
              Number(formatted.timestamp) * 1000
            ).toLocaleTimeString(),
            status: formatted.deliveryStatus,
          });

          return formatted;
        });

        console.log(
          `✅ [LOAD_MESSAGES] Formatted ${formattedMessages.length} messages for display`
        );
        console.log(`✅ [LOAD_MESSAGES] Setting privateMessages state...`);

        // If keepOptimistic, preserve optimistic messages that aren't in blockchain yet
        if (keepOptimistic) {
          setPrivateMessages((prev) => {
            // Find optimistic messages (very recent timestamps that aren't in formattedMessages)
            const now = BigInt(Math.floor(Date.now() / 1000));
            const optimisticMessages = prev.filter((msg) => {
              // Optimistic if timestamp is within last 60 seconds and not in blockchain data
              const isRecent = now - msg.timestamp < 60;
              const notInBlockchain = !formattedMessages.some(
                (bMsg: PrivateMessage) =>
                  bMsg.content === msg.content &&
                  bMsg.sender.toLowerCase() === msg.sender.toLowerCase()
              );
              return isRecent && notInBlockchain;
            });

            console.log(
              `ℹ️ [LOAD_MESSAGES] Keeping ${optimisticMessages.length} optimistic messages`
            );
            return [...formattedMessages, ...optimisticMessages];
          });
        } else {
          setPrivateMessages(formattedMessages);
        }

        console.log(`✅ [LOAD_MESSAGES] State updated successfully`);
      } catch (err: any) {
        console.error("❌ [LOAD_MESSAGES] Error loading messages:", err);
        console.error("❌ [LOAD_MESSAGES] Error details:", {
          code: err.code,
          reason: err.reason,
          message: err.message,
        });

        // Check for specific errors
        if (err.reason === "InvalidPagination()") {
          console.error(
            "❌ [LOAD_MESSAGES] InvalidPagination - contract limit is 50 messages per call"
          );
          setError("Failed to load messages: Pagination limit exceeded");
        } else {
          setError("Failed to load messages: " + (err.reason || err.message));
        }

        if (!keepOptimistic) {
          setPrivateMessages([]); // Clear messages on error only if not keeping optimistic
        }
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [contract, account]
  );

  const sendPrivateMessage = async (
    recipient: string,
    content: string,
    messageType: string = "text"
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!contract || !account) {
      console.error("❌ [SEND_MSG] Contract or account not initialized");
      setError("Contract not initialized");
      return { success: false };
    }

    console.log(
      `📤 [SEND_MSG] Preparing to send message to ${recipient.slice(0, 10)}...`
    );
    console.log(
      `📤 [SEND_MSG] Content: "${content.slice(0, 50)}${
        content.length > 50 ? "..." : ""
      }"`
    );
    console.log(`📤 [SEND_MSG] Type: ${messageType}`);

    try {
      setError(null);

      // Check if user is registered first
      if (!isUserRegistered) {
        console.error("❌ [SEND_MSG] User not registered");
        setError("You must register before sending messages");
        return { success: false };
      }

      // Verify recipient is a valid address
      if (
        !recipient ||
        recipient === "0x0000000000000000000000000000000000000000"
      ) {
        console.error("❌ [SEND_MSG] Invalid recipient address");
        setError("Invalid recipient address");
        return { success: false };
      }

      console.log("✅ [SEND_MSG] Pre-flight checks passed");

      // Convert messageType string to uint8: 0=text, 1=image, 2=file
      let messageTypeInt: number = 0;
      if (messageType === "image") messageTypeInt = 1;
      else if (messageType === "file") messageTypeInt = 2;

      console.log("🔄 [SEND_MSG] Sending transaction to blockchain...");

      // Send to blockchain
      const tx = await contract.sendPrivateMessage(
        recipient,
        content,
        messageTypeInt
      );

      console.log("✅ [SEND_MSG] Transaction submitted!");
      console.log("📍 [SEND_MSG] Transaction hash:", tx.hash);
      console.log("⏳ [SEND_MSG] Waiting for confirmation...");

      const messageId = tx.hash;
      console.log("🆔 [SEND_MSG] MessageId:", messageId);

      // OPTIMISTIC UI: Add message using tx hash as stable identifier
      const optimisticMessage: PrivateMessage = {
        sender: account,
        recipient: recipient,
        content: content,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        isRead: false,
        isDeleted: false,
        messageType: messageType,
        deliveryStatus: "sending",
        txHash: messageId,
        messageId,
      };

      if (selectedChat === recipient) {
        console.log("💬 [SEND_MSG] Adding optimistic message to UI");
        setPrivateMessages((prev) => [...prev, optimisticMessage]);
      }

      // Wait for confirmation in background, don't block UI
      tx.wait()
        .then((receipt: any) => {
          console.log("✅ [SEND_MSG] Transaction confirmed!");
          console.log("📦 [SEND_MSG] Block number:", receipt.blockNumber);
          console.log("⛽ [SEND_MSG] Gas used:", receipt.gasUsed.toString());

          // DON'T reload messages immediately - keep optimistic UI
          // Polling will update with blockchain data in ~10 seconds
          // This prevents the "message disappearing" effect
          console.log("ℹ️ [SEND_MSG] Message confirmed on blockchain");
          console.log(
            "ℹ️ [SEND_MSG] Polling will update with blockchain timestamp shortly"
          );

          console.log("🔄 [SEND_MSG] Reloading sidebar");
          loadUserChats();
        })
        .catch((err: any) => {
          console.error("❌ [SEND_MSG] Transaction failed:", err);
          console.error("❌ [SEND_MSG] Error details:", {
            code: err.code,
            reason: err.reason,
            message: err.message,
          });

          // Remove optimistic message on failure
          setPrivateMessages((prev) =>
            prev.filter(
              (msg: any) =>
                msg.txHash !== messageId &&
                (msg as any).messageId !== messageId
            )
          );
          setError("Message failed to send: " + (err.reason || err.message));
        });

      return { success: true, txHash: messageId };
    } catch (err: any) {
      console.error("❌ [SEND_MSG] Error sending message:", err);
      console.error("❌ [SEND_MSG] Error details:", {
        code: err.code,
        reason: err.reason,
        message: err.message,
        data: err.data,
      });

      // Parse custom contract errors
      if (err.message.includes("RateLimitExceeded")) {
        setError("Please wait before sending another message");
      } else if (err.message.includes("MessageTooLong")) {
        setError("Message too long (max 500 characters)");
      } else if (err.message.includes("MessageEmpty")) {
        setError("Message cannot be empty");
      } else if (err.message.includes("UserNotRegistered")) {
        setError("You or the recipient is not registered");
      } else if (err.reason) {
        setError("Failed to send: " + err.reason);
      } else {
        setError(err.message || "Failed to send message");
      }
      return { success: false };
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

  // Update message delivery status in local state (idempotent)
  const updateMessageStatus = useCallback(
    (identifier: string, status: "sending" | "sent" | "delivered" | "read") => {
      console.log(
        `📊 [STATUS] Updating message ${identifier.slice(
          0,
          10
        )}... to ${status}`
      );

      setPrivateMessages((prev) => {
        let updated = false;
        const newMessages = prev.map((msg) => {
          // Match by txHash or messageId
          if (msg.txHash === identifier || msg.messageId === identifier) {
            // Idempotency: Don't downgrade status
            const statusOrder = { sending: 0, sent: 1, delivered: 2, read: 3 };
            const currentStatus = msg.deliveryStatus || "sending";
            const currentLevel = statusOrder[currentStatus] || 0;
            const newLevel = statusOrder[status] || 0;

            if (newLevel > currentLevel) {
              updated = true;
              console.log(`  ✅ [STATUS] ${currentStatus} → ${status}`);
              return { ...msg, deliveryStatus: status };
            } else {
              console.log(
                `  ⏭️ [STATUS] Skipping downgrade: ${currentStatus} → ${status}`
              );
              return msg;
            }
          }
          return msg;
        });

        if (!updated) {
          console.log(
            `  ⚠️ [STATUS] Message not found: ${identifier.slice(0, 10)}`
          );
        }

        return newMessages;
      });
    },
    []
  );

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

  // Note: Messages are loaded in ChatWindowV2 component when chat is selected
  // to have better control over loading state and filtering

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

  // POLLING: Check for new messages every 10 seconds (reduced from 5s to prevent RPC overload)
  useEffect(() => {
    if (!contract || !account || !isUserRegistered) return;

    console.log("🔄 [POLLING] Starting message polling (10s intervals)...");

    // Initial load
    loadUserChats();

    // Poll every 10 seconds (reduced from 5s to prevent RPC rate limiting)
    const pollInterval = setInterval(async () => {
      try {
        console.log("🔄 [POLLING] Fetching updates...");

        // Reload chat list to catch new messages
        await loadUserChats();

        // If viewing a chat, reload its messages (keeping optimistic messages)
        if (selectedChat) {
          await loadChatMessages(selectedChat, true); // Keep optimistic messages
        }

        console.log("✅ [POLLING] Update complete");
      } catch (err: any) {
        console.error("❌ [POLLING] Error during polling:", err);
        // If we get rate limited, log it but don't crash
        if (err.code === -32002 || err.message?.includes("rate limit")) {
          console.warn(
            "⚠️ [POLLING] Rate limited by RPC, will retry next interval"
          );
        }
      }
    }, 10000); // 10 seconds (reduced from 5s)

    return () => {
      console.log("🛑 [POLLING] Stopping message polling");
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

  // EVENT LISTENER: DISABLED for HTTP RPC to prevent eth_newFilter errors
  // HTTP RPC providers don't support event listening, use polling instead
  useEffect(() => {
    if (!contract || !account) return;

    console.log("⚠️ [EVENTS] Event listener disabled for HTTP RPC provider");
    console.log("ℹ️ [EVENTS] Using polling (5s intervals) for updates instead");
    console.log("ℹ️ [EVENTS] This prevents 'eth_newFilter' RPC errors");

    // Don't try to set up event listeners with HTTP RPC
    // The polling mechanism handles all updates

    return undefined;
  }, [contract, account]);

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
        updateMessageStatus,
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
