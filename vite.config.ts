import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/gex/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three-engine", test: /node_modules\/three\// }],
        },
      },
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
