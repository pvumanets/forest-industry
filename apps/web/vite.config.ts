import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

/** В Docker на Windows bind-mount часто не шлёт inotify — без polling Vite не пересобирает бандл. */
const viteUsePolling = process.env.CHOKIDAR_USEPOLLING === "true";

/** Порт на хосте при маппинге 5174:5173 — иначе HMR/WebSocket цепляется не туда. */
const hmrClientPort = process.env.HMR_CLIENT_PORT ? Number(process.env.HMR_CLIENT_PORT) : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    /** Не перебирать 5174+ — всегда один URL; если порт занят, сервер упадёт с ошибкой */
    strictPort: true,
    /** Меньше параллельных transform на медленном Docker Desktop I/O. */
    preTransformRequests: false,
    watch: viteUsePolling
      ? {
          usePolling: true,
          interval: Number(process.env.CHOKIDAR_INTERVAL) || 8000,
          ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
        }
      : {
          ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
        },
    hmr:
      hmrClientPort != null && !Number.isNaN(hmrClientPort)
        ? { host: "localhost", clientPort: hmrClientPort, protocol: "ws" }
        : undefined,
    headers: viteUsePolling
      ? { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" }
      : undefined,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
