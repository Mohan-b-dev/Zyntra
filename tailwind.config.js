/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon accent colors
        neon: {
          purple: "#a855f7",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          pink: "#ec4899",
          green: "#10b981",
        },
        // Glass-morphism backgrounds
        glass: {
          dark: "rgba(17, 24, 39, 0.7)",
          darker: "rgba(17, 24, 39, 0.85)",
          light: "rgba(55, 65, 81, 0.4)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "neon-gradient":
          "linear-gradient(135deg, #a855f7 0%, #06b6d4 50%, #3b82f6 100%)",
        "neon-gradient-vertical":
          "linear-gradient(180deg, #a855f7 0%, #06b6d4 100%)",
        "dark-glow":
          "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15), transparent 70%)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
      },
      boxShadow: {
        neon: "0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
        "neon-cyan":
          "0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.3)",
        "neon-blue":
          "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
        glow: "0 0 15px rgba(168, 85, 247, 0.4)",
        "glow-lg": "0 0 30px rgba(168, 85, 247, 0.6)",
      },
      animation: {
        // Existing
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideUp: "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        // New glass & neon animations
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 10s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "neon-pulse": "neonPulse 2s ease-in-out infinite",
        gradient: "gradient 8s linear infinite",
        "gradient-xy": "gradientXY 15s ease infinite",
        shimmer: "shimmer 2s linear infinite",
        "bounce-slow": "bounce 3s infinite",
      },
      keyframes: {
        // Existing
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // New animations
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": {
            boxShadow:
              "0 0 5px rgba(168, 85, 247, 0.4), 0 0 10px rgba(168, 85, 247, 0.3)",
          },
          "100%": {
            boxShadow:
              "0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.5)",
          },
        },
        neonPulse: {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.8", filter: "brightness(1.2)" },
        },
        gradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        gradientXY: {
          "0%, 100%": { backgroundPosition: "0% 0%" },
          "25%": { backgroundPosition: "100% 0%" },
          "50%": { backgroundPosition: "100% 100%" },
          "75%": { backgroundPosition: "0% 100%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};
