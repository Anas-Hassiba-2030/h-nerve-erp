// Browser-level e2e gate. `npm run e2e` — Playwright boots the app on port
// 3111 against a throwaway SQLite db (file:./e2e.db, reset + reseeded by
// e2e/global-setup.ts on every run), signs in through the real login form,
// and clicks the flows unit tests can't see (auth, logout, navigation,
// role enforcement). Runs with H_NERVE_PERMS_ENFORCED=true so the suite
// exercises production enforcement semantics, not the open dev default.
//
// The server is ALWAYS `next dev` — including CI. A prod-node `next start`
// cannot work here by construction: the app bundle carries the CLOUDFLARE-
// runtime Prisma client (tsconfig aliases @prisma/client to it), whose wasm
// query-compiler only loads on workerd ("The loaded wasm module was
// unexpectedly undefined" on plain Node). Prod-only behavior (the strict
// CSP nonce pipeline) is therefore verified against the real Workers
// deployment, not here.

import { defineConfig } from "@playwright/test";

const PORT = 3111;

const serverEnv = {
  DATABASE_URL: "file:./e2e.db",
  H_NERVE_PERMS_ENFORCED: "true",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // The dev server compiles pages on demand — parallel first-hits are slow
  // and flaky. Two workers is a good balance for both local and CI.
  workers: 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: serverEnv,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
