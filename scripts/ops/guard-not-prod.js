// scripts/guard-not-prod.js
//
// Refuse destructive local DB commands when DATABASE_URL points at a
// managed Postgres (Neon). After the Phase 11 cutover, local .env aims
// at PRODUCTION — db:reset / db:push / db:seed run prisma/seed.ts which
// opens with ~25 deleteMany() calls. Without this guard a routine
// "refresh my local DB" wipes the pilot database.
//
// Prepended to db:reset / db:push / db:seed in package.json. NOT applied
// to seed:prod (intentionally prod-targeted, upsert-only, non-destructive)
// or build (Vercel runs migrate deploy, never these).

const fs = require("fs");
const path = require("path");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // npm scripts don't auto-load .env (only `prisma` does). Parse the
  // first uncommented DATABASE_URL= line so the guard sees what Prisma
  // will actually use.
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return "";
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("#") || !t.startsWith("DATABASE_URL=")) continue;
    return t.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = readDatabaseUrl();

// Managed-Postgres hosts that must never receive a destructive local
// command. SQLite (file:./dev.db) passes through untouched.
const PROD_MARKERS = ["neon.tech", "supabase.co", "amazonaws.com", "pooler"];

if (PROD_MARKERS.some((m) => url.includes(m))) {
  console.error(
    "\n[guard] REFUSING: DATABASE_URL points at a production database.\n" +
      `        ${url.replace(/:\/\/[^@]*@/, "://***@")}\n\n` +
      "        db:reset / db:push / db:seed are DESTRUCTIVE (the demo\n" +
      "        seed wipes ~25 tables). To refresh LOCAL data, revert to\n" +
      "        SQLite first (docs/OPERATING-PROTOCOL.md §6), or use\n" +
      "        `npm run seed:prod` (upsert-only) for production.\n",
  );
  process.exit(1);
}

process.exit(0);
