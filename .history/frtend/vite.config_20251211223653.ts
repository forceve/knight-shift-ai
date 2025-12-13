import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6790,
    allowedHosts: ["frp-lab.com","frp-gym.com"],
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
