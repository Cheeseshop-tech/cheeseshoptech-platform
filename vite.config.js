import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// CheeseShop TECH shared shell. One codebase; tenants differ by config only.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@config": path.resolve(import.meta.dirname, "config"),
    },
  },
});
