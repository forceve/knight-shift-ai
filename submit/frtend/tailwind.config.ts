import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        body: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        midnight: "#0b1224",
        accent: "#4ee1a0",
        panel: "#111a30",
        hint: "#7aa2f7",
      },
      boxShadow: {
        glow: "0 20px 80px rgba(78, 225, 160, 0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
