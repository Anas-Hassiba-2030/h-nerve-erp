// scripts/seed/ensure-sectors.ts
//
// Deploy-time ADDITIVE sector top-up. Production was first seeded before some
// sector data existed (or with a partial dataset), and seed-if-empty.ts no-ops
// once any company exists — so the company-scoped sector tables (Hotels,
// DairyBatches, Farms, Programs, and the intelligence layer) never got filled.
// That is why /education, /hotels, /dairy, /farms render empty even though the
// group-wide AIInsights show.
//
// This wraps prisma/seedSectors.ts `seedMissingSectors()` — the SAME idempotent,
// additive builder the /admin/genesis wizard uses. It:
//   • reads live counts cross-workspace,
//   • find-or-creates the shared parents (companies + users) — never deleteMany,
//   • runs ONLY the sectors whose tables are empty,
//   • is safe to re-run on every deploy (a populated sector is skipped).
//
// Wrapped so a hiccup can never block the deploy.
//
//   npx tsx scripts/seed/ensure-sectors.ts

import { makePrismaClient } from "../_prisma";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = makePrismaClient();
  try {
    const { seedMissingSectors } = await import("@/scripts/seed/seedSectors");
    const result = await seedMissingSectors(prisma);
    if (result.nothingToDo) {
      console.log("[ensure-sectors] all sectors already populated — skipping.");
    } else {
      console.log(`[ensure-sectors] ✓ filled empty sectors: ${result.built.join(", ") || "(none)"}`);
    }
  } catch (e) {
    // Never fail the deploy because of a seed hiccup — log and continue.
    console.error("[ensure-sectors] non-fatal error:", e);
  } finally {
    try { await prisma.$disconnect(); } catch { /* best effort */ }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[ensure-sectors] fatal:", e);
  process.exit(0); // do not block deploy
});
