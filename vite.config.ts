import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/gex/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 },
  test: { include: ["tests/**/*.test.ts"] },
});
