// scripts/seed-if-empty.ts
//
// Safe production bootstrap: seeds the full Hourani demo dataset ONLY when
// the database is empty (zero companies). Idempotent — a no-op on every
// deploy after the first, so it never wipes real data. Wired into the
// Railway deploy step (railway.toml preDeployCommand).
//
//   npx tsx scripts/seed-if-empty.ts
//
// If you ever want to force a fresh reseed, use /admin/genesis →
// "Re-seed from scratch" (that path is intentional and destructive).

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const companies = await prisma.company.count();
    if (companies > 0) {
      console.log(`[seed-if-empty] DB already has ${companies} companies — skipping.`);
      return;
    }
    console.log("[seed-if-empty] empty DB detected — seeding demo data…");
    const { seedOperator } = await import("@/prisma/seed");
    await seedOperator();
    console.log("[seed-if-empty] ✓ seeded.");
  } catch (e) {
    // Never fail the deploy because of a seed hiccup — log and continue.
    console.error("[seed-if-empty] non-fatal error:", e);
  } finally {
    // best-effort disconnect
    try { /* @ts-ignore */ } catch {}
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[seed-if-empty] fatal:", e);
  process.exit(0); // do not block deploy
});
