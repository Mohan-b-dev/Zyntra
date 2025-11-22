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
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/utils/contract";

interface Message {
  sender: string;
  text: string;
  timestamp: bigint;
}

interface User {
  username: string;
  createdAt: bigint;
  isRegistered: boolean;
}

interface Web3ContextType {
  account: string | null;
  contract: Contract | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  sendMessage: (text: string) => Promise<ethers.TransactionReceipt | null>;
  messages: Message[];
  isLoadingMessages: boolean;
  refreshMessages: () => Promise<void>;
  currentUser: User | null;
  isUserRegistered: boolean;
  isCheckingRegistration: boolean;
  registerUser: (username: string) => Promise<boolean>;
  checkUserRegistration: () => Promise<void>;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

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
          // Try to switch to Celo Sepolia
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa044c" }], // 11142220 in hex (correct)
          });
        } catch (switchError: any) {
          // Network doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa044c", // 11142220 in hex (correct)
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
    setMessages([]);
    setCurrentUser(null);
    setIsUserRegistered(false);
    localStorage.removeItem("walletConnected");
  };

  const checkUserRegistration = useCallback(async () => {
    if (!contract || !account) return;

    setIsCheckingRegistration(true);
    try {
      const registered = await contract.isUserRegistered(account);
      setIsUserRegistered(registered);

      if (registered) {
        const user = await contract.getUser(account);
        setCurrentUser({
          username: user.username,
          createdAt: user.createdAt,
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

  const refreshMessages = useCallback(async () => {
    if (!contract) return;

    setIsLoadingMessages(true);
    try {
      const fetchedMessages = await contract.getMessages();
      setMessages(
        fetchedMessages.map((msg: any) => ({
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
        }))
      );
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [contract]);

  const registerUser = async (username: string): Promise<boolean> => {
    if (!contract || !account) {
      throw new Error("Wallet not connected");
    }

    if (!username.trim()) {
      throw new Error("Username cannot be empty");
    }

    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }

    if (username.length > 20) {
      throw new Error("Username must be less than 20 characters");
    }

    try {
      const tx = await contract.registerUser(username);
      await tx.wait();

      await checkUserRegistration();
      return true;
    } catch (err: any) {
      console.error("Error registering user:", err);

      if (err.message?.includes("UserAlreadyRegistered")) {
        throw new Error("This wallet is already registered");
      } else if (err.message?.includes("UsernameTooShort")) {
        throw new Error("Username is too short (min 3 characters)");
      } else if (err.message?.includes("UsernameTooLong")) {
        throw new Error("Username is too long (max 20 characters)");
      } else if (err.message?.includes("UsernameInvalid")) {
        throw new Error("Username contains invalid characters");
      }

      throw new Error(err.message || "Failed to register user");
    }
  };

  const sendMessage = async (
    text: string
  ): Promise<ethers.TransactionReceipt | null> => {
    if (!contract || !account) {
      throw new Error("Wallet not connected");
    }

    if (!text.trim()) {
      throw new Error("Message cannot be empty");
    }

    if (text.length > 250) {
      throw new Error("Message too long (max 250 characters)");
    }

    try {
      const optimisticMessage: Message = {
        sender: account,
        text: text,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      const tx = await contract.sendMessage(text);
      const receipt = await tx.wait();

      await refreshMessages();

      return receipt;
    } catch (err: any) {
      setMessages((prev) =>
        prev.filter((msg) => !(msg.sender === account && msg.text === text))
      );

      if (err.message.includes("UserNotRegistered")) {
        throw new Error("You must register a username first");
      } else if (err.message.includes("RateLimitExceeded")) {
        throw new Error("Please wait 3 seconds between messages");
      } else if (err.message.includes("MessageTooLong")) {
        throw new Error("Message is too long (max 250 characters)");
      } else if (err.message.includes("MessageEmpty")) {
        throw new Error("Message cannot be empty");
      } else if (err.message.includes("user rejected")) {
        throw new Error("Transaction rejected by user");
      } else {
        throw new Error(err.message || "Failed to send message");
      }
    }
  };

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

  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    if (wasConnected === "true") {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    if (contract && account) {
      checkUserRegistration();
    }
  }, [contract, account, checkUserRegistration]);

  useEffect(() => {
    if (contract) {
      refreshMessages();

      const onNewMessage = (
        sender: string,
        text: string,
        timestamp: bigint
      ) => {
        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.sender === sender &&
              msg.text === text &&
              msg.timestamp === timestamp
          );
          if (exists) return prev;
          return [...prev, { sender, text, timestamp }];
        });
      };

      const onUserRegistered = (
        user: string,
        username: string,
        timestamp: bigint
      ) => {
        if (user.toLowerCase() === account?.toLowerCase()) {
          checkUserRegistration();
        }
      };

      contract.on("NewMessage", onNewMessage);
      contract.on("UserRegistered", onUserRegistered);

      return () => {
        contract.off("NewMessage", onNewMessage);
        contract.off("UserRegistered", onUserRegistered);
      };
    }
  }, [contract, account, checkUserRegistration, refreshMessages]);

  const value: Web3ContextType = {
    account,
    contract,
    provider,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    sendMessage,
    messages,
    isLoadingMessages,
    refreshMessages,
    currentUser,
    isUserRegistered,
    isCheckingRegistration,
    registerUser,
    checkUserRegistration,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
