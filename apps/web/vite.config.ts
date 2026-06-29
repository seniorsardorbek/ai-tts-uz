import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served under /ms/lesson-runner/ via the CRM proxy (same as the old client).
export default defineConfig({
  base: "/ms/lesson-runner/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // dev: proxy API calls to the local NestJS API so API_BASE can stay empty
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/health": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
