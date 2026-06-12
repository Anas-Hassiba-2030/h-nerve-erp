import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test runner config. `npm test` → `vitest run`. The suite is pure-unit
// (src/lib/**/*.test.ts) — no DB, no network, no Next runtime — so the
// default node environment is correct. `@/*` mirrors tsconfig (./src) so
// test imports resolve the same way app code does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts"],
    passWithNoTests: false,
    reporters: "default",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
