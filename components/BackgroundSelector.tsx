import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  X,
  Check,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Upload,
} from "lucide-react";

interface ChatBackground {
  type: "color" | "gradient" | "image" | "wallpaper";
  value: string;
  opacity?: number;
  blur?: number;
}

interface BackgroundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentBackground?: ChatBackground;
  onApplyBackground: (background: ChatBackground) => void;
}

const SOLID_COLORS = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#533483",
  "#2d4263",
  "#1f4068",
  "#162447",
  "#1b262c",
  "#0f0e17",
  "#2c003e",
  "#1a1a1d",
  "#4e4e50",
  "#6f2232",
  "#1e3a8a",
  "#312e81",
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f77062 0%, #fe5196 100%)",
];

const WALLPAPERS = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800",
  "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800",
  "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800",
  "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
];

type TabType = "colors" | "gradients" | "images" | "wallpapers";

export default function BackgroundSelector({
  isOpen,
  onClose,
  currentBackground,
  onApplyBackground,
}: BackgroundSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>("colors");
  const [selectedBackground, setSelectedBackground] =
    useState<ChatBackground | null>(currentBackground || null);
  const [opacity, setOpacity] = useState(currentBackground?.opacity || 0.8);
  const [blur, setBlur] = useState(currentBackground?.blur || 0);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animation
  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.from(modalRef.current, {
        scale: 0.9,
        y: 50,
        opacity: 0,
        duration: 0.4,
        ease: "power3.out",
      });
    }
  }, [isOpen]);

  // Crossfade animation when background changes
  useEffect(() => {
    if (previewRef.current && selectedBackground) {
      gsap.fromTo(
        previewRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.inOut" }
      );
    }
  }, [selectedBackground]);

  const handleSelectColor = (color: string) => {
    setSelectedBackground({ type: "color", value: color, opacity, blur: 0 });
  };

  const handleSelectGradient = (gradient: string) => {
    setSelectedBackground({
      type: "gradient",
      value: gradient,
      opacity,
      blur: 0,
    });
  };

  const handleSelectWallpaper = (url: string) => {
    setSelectedBackground({ type: "wallpaper", value: url, opacity, blur });
  };

  const handleSelectCustomImage = () => {
    if (customImageUrl.trim()) {
      setSelectedBackground({
        type: "image",
        value: customImageUrl,
        opacity,
        blur,
      });
    }
  };

  const handleApply = () => {
    if (selectedBackground) {
      // Update background with current opacity/blur
      const finalBackground = {
        ...selectedBackground,
        opacity:
          selectedBackground.type === "color" ||
          selectedBackground.type === "gradient"
            ? opacity
            : opacity,
        blur:
          selectedBackground.type === "image" ||
          selectedBackground.type === "wallpaper"
            ? blur
            : 0,
      };

      onApplyBackground(finalBackground);

      // Success animation
      gsap.to(".apply-btn", {
        scale: 1.1,
        rotate: 360,
        duration: 0.5,
        ease: "back.out",
        onComplete: onClose,
      });
    }
  };

  const getPreviewStyle = (): React.CSSProperties => {
    if (!selectedBackground) return {};

    switch (selectedBackground.type) {
      case "color":
        return { backgroundColor: selectedBackground.value, opacity };
      case "gradient":
        return { background: selectedBackground.value, opacity };
      case "image":
      case "wallpaper":
        return {
          backgroundImage: `url(${selectedBackground.value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `blur(${blur}px)`,
          opacity,
        };
      default:
        return {};
    }
  };

  const tabs = [
    { id: "colors" as TabType, label: "Solid Colors", icon: Palette },
    { id: "gradients" as TabType, label: "Gradients", icon: Sparkles },
    { id: "images" as TabType, label: "Custom Image", icon: Upload },
    { id: "wallpapers" as TabType, label: "Wallpapers", icon: ImageIcon },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/60 via-blue-900/60 to-purple-900/60 backdrop-blur-xl p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Palette className="w-6 h-6 text-blue-400" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Chat Background
                  </h2>
                  <p className="text-sm text-gray-300">
                    Customize your chat experience
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left: Tabs & Options */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 bg-gray-800/50 p-1 rounded-xl border border-white/10">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="bg-gray-800/30 rounded-xl p-4 border border-white/10 min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                  {/* Solid Colors */}
                  {activeTab === "colors" && (
                    <motion.div
                      key="colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="grid grid-cols-5 gap-3"
                    >
                      {SOLID_COLORS.map((color, index) => (
                        <motion.button
                          key={color}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSelectColor(color)}
                          className={`aspect-square rounded-xl border-2 transition-all ${
                            selectedBackground?.type === "color" &&
                            selectedBackground.value === color
                              ? "border-blue-400 shadow-lg shadow-blue-400/50"
                              : "border-white/10 hover:border-white/30"
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {selectedBackground?.type === "color" &&
                            selectedBackground.value === color && (
                              <Check className="w-5 h-5 text-white mx-auto drop-shadow-lg" />
                            )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Gradients */}
                  {activeTab === "gradients" && (
                    <motion.div
                      key="gradients"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="grid grid-cols-3 gap-3"
                    >
                      {GRADIENTS.map((gradient, index) => (
                        <motion.button
                          key={gradient}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectGradient(gradient)}
                          className={`aspect-video rounded-xl border-2 transition-all ${
                            selectedBackground?.type === "gradient" &&
                            selectedBackground.value === gradient
                              ? "border-blue-400 shadow-lg shadow-blue-400/50"
                              : "border-white/10 hover:border-white/30"
                          }`}
                          style={{ background: gradient }}
                        >
                          {selectedBackground?.type === "gradient" &&
                            selectedBackground.value === gradient && (
                              <Check className="w-6 h-6 text-white mx-auto drop-shadow-lg" />
                            )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Custom Image */}
                  {activeTab === "images" && (
                    <motion.div
                      key="images"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Image URL
                        </label>
                        <input
                          type="url"
                          value={customImageUrl}
                          onChange={(e) => setCustomImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all placeholder-gray-400"
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSelectCustomImage}
                        disabled={!customImageUrl.trim()}
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium transition-all disabled:cursor-not-allowed border border-blue-400/30 disabled:border-gray-600"
                      >
                        Load Image
                      </motion.button>
                      {selectedBackground?.type === "image" && (
                        <div className="mt-4">
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Image loaded successfully
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Wallpapers */}
                  {activeTab === "wallpapers" && (
                    <motion.div
                      key="wallpapers"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      {WALLPAPERS.map((url, index) => (
                        <motion.button
                          key={url}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectWallpaper(url)}
                          className={`aspect-video rounded-xl border-2 transition-all overflow-hidden ${
                            selectedBackground?.type === "wallpaper" &&
                            selectedBackground.value === url
                              ? "border-blue-400 shadow-lg shadow-blue-400/50"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img
                            src={url}
                            alt="Wallpaper"
                            className="w-full h-full object-cover"
                          />
                          {selectedBackground?.type === "wallpaper" &&
                            selectedBackground.value === url && (
                              <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                            )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Controls */}
              {selectedBackground && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/30 rounded-xl p-4 border border-white/10 space-y-4"
                >
                  {/* Opacity Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">
                        Opacity
                      </label>
                      <span className="text-sm text-blue-400">
                        {Math.round(opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
                    />
                  </div>

                  {/* Blur Slider (only for images/wallpapers) */}
                  {(selectedBackground.type === "image" ||
                    selectedBackground.type === "wallpaper") && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                          Blur
                        </label>
                        <span className="text-sm text-blue-400">{blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={blur}
                        onChange={(e) => setBlur(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Preview
                </h3>
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
                  {/* Preview Background */}
                  <div
                    ref={previewRef}
                    style={getPreviewStyle()}
                    className="absolute inset-0 transition-all duration-500"
                  />

                  {/* Sample Chat UI Overlay */}
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex flex-col justify-end p-4 space-y-3">
                    <div className="bg-white/90 backdrop-blur-xl px-3 py-2 rounded-xl rounded-bl-sm max-w-[80%] self-start">
                      <p className="text-xs text-gray-800">Hey! How are you?</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 rounded-xl rounded-br-sm max-w-[80%] self-end">
                      <p className="text-xs text-white">
                        I&apos;m good! Love this background 🎨
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={!selectedBackground}
                  className="apply-btn w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium transition-all disabled:cursor-not-allowed border border-blue-400/30 disabled:border-gray-600 shadow-lg"
                >
                  Apply Background
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-medium transition-all border border-white/10"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
