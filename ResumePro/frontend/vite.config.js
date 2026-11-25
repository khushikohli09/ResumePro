// Vite config: the dev server / build tool setup for the frontend.
// Docs: https://vite.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Plugins: React (JSX + fast refresh) and Tailwind CSS v4 (utility classes).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Settings for the Vitest test runner (it reads this same file).
  // jsdom fakes a browser; globals lets tests use describe/it/expect without imports.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
  },
  // Dev server on port 5173. Requests starting with /api are forwarded to the
  // backend on port 5000, so the frontend can call '/api/...' with no CORS trouble.
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
