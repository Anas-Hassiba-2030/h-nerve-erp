// scripts/seed/seed-dairy-pricing.ts
//
// Backfills the two inputs the VOAC ceiling calculation was missing
// (docs/VOAC-RUNTIME.md §8):
//
//   1. pricePerLiter / costPerLiter on DairyBatch — litres could not become
//      dinars without them;
//   2. hotel-side FNB_DAIRY transactions — the demand side of the flagship
//      cross-company flow was not represented at all.
//
// Idempotent: only fills batches whose price is still null, and only creates a
// hotel dairy transaction for a month that does not already have one. Safe to
// re-run.
//
//   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/seed-dairy-pricing.ts
//
// DEMO DATA. These prices are representative Jordanian retail/production
// figures, NOT Hourani's actuals. The point is to make the pipeline computable
// end to end; the real numbers must be entered before any figure is quoted.

import { makePrismaClient } from "../_prisma";

/** JOD per litre, by product. Representative, not authoritative. */
const PRICING: Record<string, { price: number; cost: number }> = {
  MILK: { price: 0.85, cost: 0.55 },
  LABNEH: { price: 3.2, cost: 2.1 },
  YOGURT: { price: 1.4, cost: 0.9 },
  CHEESE: { price: 4.5, cost: 3.0 },
  BUTTER: { price: 6.0, cost: 4.2 },
  CREAM: { price: 2.8, cost: 1.8 },
};

const DEFAULT_PRICING = { price: 1.0, cost: 0.65 };

async function main() {
  const prisma = makePrismaClient();

  // --- 1. Price the batches -------------------------------------------
  const unpriced = await prisma.dairyBatch.findMany({
    where: { pricePerLiter: null },
    select: { id: true, product: true, batchNumber: true },
  });

  let priced = 0;
  for (const b of unpriced) {
    const p = PRICING[b.product] ?? DEFAULT_PRICING;
    await prisma.dairyBatch.update({
      where: { id: b.id },
      data: { pricePerLiter: p.price, costPerLiter: p.cost },
    });
    priced += 1;
  }
  console.log(`[pricing] priced ${priced} batch(es) (${unpriced.length} were unpriced)`);

  // --- 2. Give the hotels a dairy spend line --------------------------
  const hotels = await prisma.company.findMany({
    where: { sector: "HOSPITALITY" },
    select: { id: true, code: true, country: true },
  });

  if (hotels.length === 0) {
    console.log("[demand] no hospitality companies — nothing to do");
    return;
  }

  // Twelve monthly rows per hotel so a year-on-year figure exists at all.
  const now = new Date();
  let created = 0;

  for (const hotel of hotels) {
    for (let i = 0; i < 12; i++) {
      const occurredAt = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const reference = `FNBD-${hotel.code}-${occurredAt.getFullYear()}${String(
        occurredAt.getMonth() + 1,
      ).padStart(2, "0")}`;

      const exists = await prisma.transaction.findUnique({ where: { reference } });
      if (exists) continue;

      // A hotel's dairy purchasing is seasonal; a flat line would make any
      // "we spotted a spike" demo indistinguishable from noise.
      const season = 1 + 0.25 * Math.sin((occurredAt.getMonth() / 12) * Math.PI * 2);
      const amount = Math.round(4200 * season);

      await prisma.transaction.create({
        data: {
          companyId: hotel.id,
          reference,
          kind: "EXPENSE",
          category: "FNB_DAIRY",
          amount,
          currency: hotel.country === "JO" ? "JOD" : "EUR",
          description: "مشتريات ألبان للمطبخ والمطاعم",
          occurredAt,
        },
      });
      created += 1;
    }
  }

  console.log(`[demand] created ${created} hotel dairy transaction(s) across ${hotels.length} hotel(s)`);
  console.log("\nNow re-run: npx tsx --tsconfig tsconfig.scripts.json scripts/ops/voac-ceiling.ts");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("seed-dairy-pricing failed:", e);
    process.exit(1);
  });
