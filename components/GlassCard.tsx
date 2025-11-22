"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hover" | "glow";
  animate?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = "",
  variant = "default",
  animate = true,
  onClick,
}: GlassCardProps) {
  const baseClasses =
    "backdrop-blur-glass bg-glass-dark border border-white/10 rounded-2xl shadow-glass";

  const variantClasses = {
    default: "",
    hover:
      "hover:bg-glass-light hover:border-neon-purple/30 hover:shadow-neon transition-all duration-300",
    glow: "border-neon-purple/20 shadow-neon animate-glow",
  };

  const CardContent = animate ? motion.div : "div";

  return (
    <CardContent
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      {...(animate && {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      })}
    >
      {children}
    </CardContent>
  );
}
