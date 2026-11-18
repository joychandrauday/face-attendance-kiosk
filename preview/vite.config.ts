import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@karalasoft/face-attendance-kiosk": path.resolve(__dirname, "../src/index.tsx"),
      "@garirhat/face-attendance-kiosk": path.resolve(__dirname, "../src/index.tsx"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
});