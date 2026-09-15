import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the React app runs on :5173 and proxies API calls to the
// Express server on :4000, so the frontend can just call "/api/...".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
