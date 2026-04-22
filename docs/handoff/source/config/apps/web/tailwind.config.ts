import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF9F6",
        foreground: "#1A1A1A",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        sidebar: {
          DEFAULT: "#F5F3EF",
          foreground: "#1A1A1A",
        },
        primary: {
          DEFAULT: "#0C7489",
          foreground: "#FFFFFF",
          light: "#E6F4F7",
        },
        secondary: {
          DEFAULT: "#D4735E",
          foreground: "#FFFFFF",
          light: "#FDF0ED",
        },
        muted: {
          DEFAULT: "#F5F3EF",
          foreground: "#6B6B6B",
        },
        accent: {
          DEFAULT: "#0C7489",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#C74B3B",
          foreground: "#FFFFFF",
        },
        border: "#E8E5E0",
        input: "#E8E5E0",
        ring: "#0C7489",
        success: "#2D8A4E",
        warning: "#D4A843",
        danger: "#C74B3B",
        vertical: {
          healthcare: "#3B82F6",
          financial: "#10B981",
          manufacturing: "#F59E0B",
          retail: "#8B5CF6",
          technology: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
