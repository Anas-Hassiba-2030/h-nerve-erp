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
    // Array form so "@prisma/client" matches EXACTLY — a bare string alias
    // would also rewrite subpaths like "@prisma/client/runtime/client" (which
    // the generated client imports internally) and break them.
    alias: [
      // The app aliases "@prisma/client" -> the cloudflare-runtime client
      // (tsconfig), whose Decimal/error classes only exist on workerd. Tests
      // run on Node, so point the bare import at the nodejs-runtime twin.
      {
        find: /^@prisma\/client$/,
        replacement: fileURLToPath(new URL("./src/generated/prisma-node/client.ts", import.meta.url)),
      },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
});
