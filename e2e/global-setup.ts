// Resets + reseeds the throwaway e2e database. Runs as a PRE-STEP of
// `npm run e2e` (NOT as Playwright globalSetup — Playwright boots the
// webServer first, and once the dev server holds the SQLite handle,
// Windows refuses the file delete). The db push and the canonical seed
// both run with an EXPLICIT file:./e2e.db so the developer's .env (which
// may point at dev.db with a custom admin password) can never leak in —
// e2e credentials are always admin@hourani.jo/admin123 +
// staff@hourani.jo/admin123, exactly what scripts/seed/seed.ts creates.

import { execSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";

function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: "file:./e2e.db",
    SEED_ADMIN_PASSWORD: "admin123",
  };
  // Fresh-file reset instead of `db push --force-reset`: e2e.db is a
  // generated throwaway (gitignored), so deleting it and pushing onto a
  // brand-new file is equivalent — without ever wielding a flag that could
  // destroy a real database if the URL were wrong.
  for (const f of ["e2e.db", "e2e.db-journal", "prisma/schema/e2e.db"]) {
    rmSync(f, { force: true });
  }
  const run = (cmd: string) => {
    console.log(`[e2e setup] ${cmd}`);
    execSync(cmd, { stdio: "inherit", env });
  };
  // The Prisma CLI resolves `file:` URLs relative to the SCHEMA FOLDER
  // (prisma/schema/), while the libsql adapter (seed script + app server)
  // resolves them relative to the process cwd. So: push where the CLI
  // puts it, then copy the empty schema'd file to the repo root where
  // everything else will open it.
  run("npx prisma db push --skip-generate");
  copyFileSync("prisma/schema/e2e.db", "e2e.db");
  run("npx tsx --tsconfig tsconfig.scripts.json scripts/seed/seed.ts");
}

globalSetup();
