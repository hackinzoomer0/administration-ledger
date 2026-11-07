import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/administration-ledger/",
  build: { chunkSizeWarningLimit: 1100 },
  test: { include: ["tests/**/*.test.ts"] },
});
