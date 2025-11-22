import { useState, useEffect } from "react";

export interface ChatBackground {
  type: "color" | "gradient" | "image" | "wallpaper";
  value: string;
  opacity?: number;
  blur?: number;
}

const DEFAULT_BACKGROUND: ChatBackground = {
  type: "gradient",
  value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  opacity: 0.3,
  blur: 0,
};

export function useChatBackground(chatId: string | null) {
  const [background, setBackground] =
    useState<ChatBackground>(DEFAULT_BACKGROUND);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load background from localStorage on mount or when chatId changes
  useEffect(() => {
    if (!chatId) {
      setBackground(DEFAULT_BACKGROUND);
      setIsLoaded(true);
      return;
    }

    const storageKey = `chat-bg-${chatId}`;
    const savedBackground = localStorage.getItem(storageKey);

    if (savedBackground) {
      try {
        const parsed = JSON.parse(savedBackground) as ChatBackground;
        setBackground(parsed);
      } catch (error) {
        console.error("Failed to parse saved background:", error);
        setBackground(DEFAULT_BACKGROUND);
      }
    } else {
      setBackground(DEFAULT_BACKGROUND);
    }

    setIsLoaded(true);
  }, [chatId]);

  // Save background to localStorage
  const saveBackground = (newBackground: ChatBackground) => {
    if (!chatId) return;

    const storageKey = `chat-bg-${chatId}`;
    localStorage.setItem(storageKey, JSON.stringify(newBackground));
    setBackground(newBackground);
  };

  // Apply background with transition
  const applyBackground = (newBackground: ChatBackground) => {
    saveBackground(newBackground);
  };

  // Reset to default background
  const resetBackground = () => {
    if (!chatId) return;

    const storageKey = `chat-bg-${chatId}`;
    localStorage.removeItem(storageKey);
    setBackground(DEFAULT_BACKGROUND);
  };

  // Get CSS styles for the background element
  const getBackgroundStyles = (): React.CSSProperties => {
    const { type, value, opacity = 1, blur = 0 } = background;
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      zIndex: 0,
      transition: "all 0.5s ease-in-out",
    };

    switch (type) {
      case "color":
        return {
          ...baseStyle,
          backgroundColor: value,
          opacity,
        };
      case "gradient":
        return {
          ...baseStyle,
          background: value,
          opacity,
        };
      case "image":
      case "wallpaper":
        return {
          ...baseStyle,
          backgroundImage: `url(${value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: `blur(${blur}px)`,
          opacity,
        };
      default:
        return baseStyle;
    }
  };

  // Get all saved backgrounds (for managing multiple chats)
  const getAllBackgrounds = (): Record<string, ChatBackground> => {
    const backgrounds: Record<string, ChatBackground> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("chat-bg-")) {
        const chatId = key.replace("chat-bg-", "");
        const value = localStorage.getItem(key);
        if (value) {
          try {
            backgrounds[chatId] = JSON.parse(value);
          } catch (error) {
            console.error(`Failed to parse background for ${chatId}:`, error);
          }
        }
      }
    }

    return backgrounds;
  };

  // Clear all backgrounds
  const clearAllBackgrounds = () => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith("chat-bg-")
    );
    keys.forEach((key) => localStorage.removeItem(key));
    setBackground(DEFAULT_BACKGROUND);
  };

  return {
    background,
    isLoaded,
    setBackground: applyBackground,
    resetBackground,
    getBackgroundStyles,
    getAllBackgrounds,
    clearAllBackgrounds,
  };
}

// Hook for managing global background preferences
export function useGlobalBackgroundPreferences() {
  const [preferences, setPreferences] = useState({
    enableBackgrounds: true,
    defaultOpacity: 0.8,
    defaultBlur: 0,
    syncAcrossDevices: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("background-preferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load background preferences:", error);
      }
    }
  }, []);

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    localStorage.setItem(
      "background-preferences",
      JSON.stringify(newPreferences)
    );
  };

  return {
    preferences,
    updatePreferences,
  };
}
