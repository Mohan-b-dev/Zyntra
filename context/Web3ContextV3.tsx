"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { ethers, BrowserProvider, Contract } from "ethers";

// ChatDAppV3 deployed on Celo Sepolia
const CONTRACT_ADDRESS = "0x1a2B25a6DBbbF3b3d0767aEeDa4E92597E7e1C08";
const CONTRACT_ABI: any[] = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_chatId",
        type: "bytes32",
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
        internalType: "bytes32",
        name: "_chatId",
        type: "bytes32",
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
    name: "InvalidRecipient",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_chatId",
        type: "bytes32",
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
    inputs: [],
    name: "NotMessageSender",
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
    inputs: [],
    name: "SelfMessageNotAllowed",
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
    name: "StatusTooLong",
    type: "error",
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
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
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
    inputs: [
      {
        internalType: "string",
        name: "_username",
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
        internalType: "string",
        name: "_messageType",
        type: "string",
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
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
    ],
    name: "startPrivateChat",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "updateLastSeen",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "UserRegistered",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "chatMetadata",
    outputs: [
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
        internalType: "uint256",
        name: "messageCount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastMessageTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "exists",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
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
            internalType: "uint256",
            name: "messageCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lastMessageTime",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "exists",
            type: "bool",
          },
        ],
        internalType: "struct ChatDAppV3.ChatMetadata",
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
    ],
    name: "getMessageCount",
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
        internalType: "bytes32",
        name: "_chatId",
        type: "bytes32",
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
            internalType: "string",
            name: "emoji",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        internalType: "struct ChatDAppV3.MessageReaction[]",
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
            internalType: "string",
            name: "content",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
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
            name: "messageType",
            type: "string",
          },
        ],
        internalType: "struct ChatDAppV3.PrivateMessage[]",
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
        components: [
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
            internalType: "uint256",
            name: "createdAt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lastSeen",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isRegistered",
            type: "bool",
          },
        ],
        internalType: "struct ChatDAppV3.UserProfile",
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
        name: "_user",
        type: "address",
      },
    ],
    name: "isUserRegistered",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastMessageTime",
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
    inputs: [],
    name: "MAX_MESSAGE_LENGTH",
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
    inputs: [],
    name: "MAX_STATUS_LENGTH",
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
    inputs: [],
    name: "MAX_USERNAME_LENGTH",
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
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "messageReactions",
    outputs: [
      {
        internalType: "address",
        name: "reactor",
        type: "address",
      },
      {
        internalType: "string",
        name: "emoji",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_USERNAME_LENGTH",
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
    inputs: [],
    name: "PAGINATION_LIMIT",
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
    inputs: [],
    name: "RATE_LIMIT",
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
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "readReceipts",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "registeredUsers",
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
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "usernameToAddress",
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
        name: "",
        type: "address",
      },
    ],
    name: "users",
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
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastSeen",
        type: "uint256",
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
      const registered = await contract.isUserRegistered(account);
      setIsUserRegistered(registered);

      if (registered) {
        const user = await contract.getUserProfile(account);
        setCurrentUser({
          username: user.username,
          avatarUrl: user.avatarUrl,
          status: user.status,
          createdAt: user.createdAt,
          lastSeen: user.lastSeen,
          isRegistered: user.isRegistered,
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
      const tx = await contract.registerUser(username);
      await tx.wait();

      // Update profile if avatar or status provided
      if (avatarUrl || status !== "Hey there! I'm using ChatDApp") {
        const updateTx = await contract.updateProfile(avatarUrl, status);
        await updateTx.wait();
      }

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

  const getAllUsers = async (
    offset: number = 0,
    limit: number = 50
  ): Promise<UserProfile[]> => {
    if (!contract) return [];

    try {
      const userAddresses = await contract.getRegisteredUsers(offset, limit);
      const users: UserProfile[] = [];

      for (const address of userAddresses) {
        if (address !== account) {
          // Exclude current user
          const profile = await contract.getUserProfile(address);
          users.push({
            username: profile.username,
            avatarUrl: profile.avatarUrl,
            status: profile.status,
            createdAt: profile.createdAt,
            lastSeen: profile.lastSeen,
            isRegistered: profile.isRegistered,
          });
        }
      }

      return users;
    } catch (err: any) {
      console.error("Error getting users:", err);
      return [];
    }
  };

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
      // Get all registered users and check for existing chats
      const allUsers = await getAllUsers(0, 100);
      const chatsWithMessages: ChatInfo[] = [];

      for (const user of allUsers) {
        const userAddress = await contract.getAddressByUsername(user.username);
        const messageCount = await contract.getMessageCount(userAddress);

        if (messageCount > 0) {
          // Get last message
          const messages = await contract.getPrivateMessages(
            userAddress,
            messageCount - 1,
            1
          );
          const lastMsg = messages[0];

          chatsWithMessages.push({
            address: userAddress,
            username: user.username,
            avatarUrl: user.avatarUrl,
            lastMessage: lastMsg.isDeleted
              ? "This message was deleted"
              : lastMsg.content,
            lastMessageTime: Number(lastMsg.timestamp),
            unreadCount: 0, // TODO: Implement proper unread counting
          });
        }
      }

      // Sort by last message time
      chatsWithMessages.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      setUserChats(chatsWithMessages);
    } catch (err: any) {
      console.error("Error loading chats:", err);
    } finally {
      setIsLoadingChats(false);
    }
  }, [contract, account]);

  const loadChatMessages = async (otherUser: string) => {
    if (!contract) return;

    setIsLoadingMessages(true);
    try {
      const messages = await contract.getPrivateMessages(otherUser, 0, 100);
      setPrivateMessages(messages);
    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendPrivateMessage = async (
    recipient: string,
    content: string,
    messageType: string = "text"
  ): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setError(null);
      const tx = await contract.sendPrivateMessage(
        recipient,
        content,
        messageType
      );
      await tx.wait();

      // Reload messages and chats
      if (selectedChat === recipient) {
        await loadChatMessages(recipient);
      }
      await loadUserChats();

      return true;
    } catch (err: any) {
      console.error("Error sending message:", err);
      if (err.message.includes("RateLimitExceeded")) {
        setError("Please wait before sending another message");
      } else if (err.message.includes("MessageTooLong")) {
        setError("Message too long (max 500 characters)");
      } else if (err.message.includes("MessageEmpty")) {
        setError("Message cannot be empty");
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
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
