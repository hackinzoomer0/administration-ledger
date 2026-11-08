import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { currentNomination } from "./scripts/public-data.ts";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "ledger-public-projection",
      resolveId(id) {
        if (id === "virtual:ledger-nomination") return "\0ledger-nomination";
      },
      load(id) {
        if (id === "\0ledger-nomination") {
          this.addWatchFile(
            resolve("database/nominations/republican_2028.json"),
          );
          return (
            "export default " +
            JSON.stringify(
              currentNomination(
                JSON.parse(
                  readFileSync(
                    "database/nominations/republican_2028.json",
                    "utf8",
                  ),
                ),
              ),
            )
          );
        }
      },
    },
  ],
  base: "/administration-ledger/",
  build: { chunkSizeWarningLimit: 1100 },
  test: { include: ["tests/**/*.test.ts"] },
});
