import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// CheeseShop TECH shared shell. One codebase; tenants differ by config only.
export default defineConfig({
  plugins: [react()],
  // Footer build-stamp: baked at build time so "am I looking at the latest deploy?" is
  // answerable at a glance (kills the stale-cache false alarms — hard-refresh lesson, 2026-07-02).
  define: {
    __BUILD_STAMP__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC"),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@config": path.resolve(import.meta.dirname, "config"),
    },
  },
});
