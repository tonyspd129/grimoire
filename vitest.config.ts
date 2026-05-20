import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock Tauri API — not available outside the desktop runtime
      "@tauri-apps/api/core": path.resolve(__dirname, "src/__mocks__/tauri.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
