"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";

interface SendBoxProps {
  onMessageSent?: () => void;
}

export default function SendBox({ onMessageSent }: SendBoxProps) {
  const { sendMessage, account, isUserRegistered } = useWeb3();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gasUsed, setGasUsed] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLength = 250;
  const remainingChars = maxLength - message.length;
  const maxRetries = 3;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Message cannot be empty");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isSending || !account) return;

    if (!isUserRegistered) {
      setError("Please register a username first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);
    setGasUsed(null);

    let currentRetry = 0;

    const attemptSend = async (): Promise<void> => {
      try {
        const receipt = await sendMessage(message.trim());

        if (receipt) {
          setGasUsed(receipt.gasUsed.toString());
          setSuccess(true);
          setMessage("");
          setRetryCount(0);

          setTimeout(() => {
            setSuccess(false);
            setGasUsed(null);
          }, 3000);

          if (onMessageSent) {
            onMessageSent();
          }
        }
      } catch (err: any) {
        // Handle RPC errors with retry
        if (
          (err.message?.includes("network") ||
            err.message?.includes("timeout") ||
            err.message?.includes("503")) &&
          currentRetry < maxRetries
        ) {
          currentRetry++;
          setRetryCount(currentRetry);
          setError(
            `Network error. Retrying... (${currentRetry}/${maxRetries})`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 2000 * currentRetry)
          );
          return attemptSend();
        }

        // Handle rate limit error
        if (
          err.message?.includes("RateLimitExceeded") ||
          err.message?.includes("wait 3 seconds")
        ) {
          setError("Please wait 3 seconds between messages");
        } else if (err.message?.includes("UserNotRegistered")) {
          setError("You must register a username first");
        } else {
          setError(err.message || "Failed to send message");
        }

        setTimeout(() => setError(null), 5000);
        setRetryCount(0);
      } finally {
        setIsSending(false);
      }
    };

    await attemptSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!account) {
    return (
      <div className="bg-gray-800/40 backdrop-blur rounded-2xl p-6 border border-gray-700/50 text-center">
        <p className="text-gray-400">Connect your wallet to send messages</p>
      </div>
    );
  }

  if (!isUserRegistered) {
    return (
      <div className="bg-gray-800/40 backdrop-blur rounded-2xl p-6 border border-gray-700/50 text-center">
        <p className="text-gray-400">Complete registration to send messages</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 backdrop-blur rounded-2xl p-4 border border-gray-700/50 shadow-xl">
      {error && (
        <div className="mb-3 p-3 bg-red-600/20 border border-red-500/50 rounded-xl text-red-200 text-sm animate-fadeIn">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 bg-green-600/20 border border-green-500/50 rounded-xl text-green-200 text-sm animate-fadeIn">
          Message sent successfully! {gasUsed && `(Gas used: ${gasUsed})`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            maxLength={maxLength}
            rows={1}
            disabled={isSending}
            className="w-full bg-gray-900/50 text-gray-100 rounded-xl px-4 py-3 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700/50 placeholder-gray-500 transition-all duration-200 disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <div
            className={`absolute bottom-3 right-3 text-xs font-mono ${
              remainingChars < 50 ? "text-orange-400" : "text-gray-500"
            }`}
          >
            {remainingChars}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rate limit: 3 seconds</span>
            {retryCount > 0 && (
              <span className="text-yellow-400">
                • Retry {retryCount}/{maxRetries}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={
              !message.trim() ||
              isSending ||
              message.length > maxLength ||
              !isUserRegistered
            }
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {retryCount > 0 ? `Retrying...` : `Sending...`}
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
