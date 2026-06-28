// scripts/seed/seed-finance-demo.ts
//
// Idempotent finance enrichment for the Executive dashboard pitch.
//
//   npx tsx scripts/seed/seed-finance-demo.ts
//
// WHY: the dashboard defaults to a 30-day window, but the older seeds only
// wrote a handful of transactions (and only for a few company codes, some of
// which don't match real companies), with most dated 40–72 days ago. Result:
// the 30-day hero shows JOD 0 expenses / 100% margin and 8/10 unit cards read
// JOD 0 — which reads as fake. This script gives EVERY company in the DB a
// believable 12-month finance history, INCLUDING the last 30 days, with
// expenses at 60–80% of revenue so margins land in a realistic 20–40% band.
//
// SAFE TO RE-RUN: every row uses a deterministic `DEMO-FIN-*` reference and is
// upserted in place — never duplicated. It only writes its own DEMO-FIN rows;
// it never deletes or touches any other data, so it is safe on a populated
// prod database.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic PRNG — same trick as prisma/seed.ts so the enriched figures
// are reproducible (trustworthy in a pitch) instead of jittering each run.
const _realRandom = Math.random;
let _a = 0x9e37_79b9;
Math.random = function () {
  _a |= 0; _a = (_a + 0x6d2b79f5) | 0;
  let t = _a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
const round = (n: number) => Math.round(n / 100) * 100; // tidy JOD figures

// Per-sector monthly REVENUE base (JOD) + sector-appropriate categories.
// Operating-unit companies share their parent's sector, so a sector with
// several companies aggregates into a larger, believable total.
type SectorCfg = { base: number; revCat: string; expCat: string };
const SECTOR: Record<string, SectorCfg> = {
  HOSPITALITY: { base: 150_000, revCat: "ROOM_REVENUE",  expCat: "OPERATING_COSTS" },
  DAIRY:       { base:  85_000, revCat: "RETAIL_SALES",  expCat: "PRODUCTION_COSTS" },
  AGRICULTURE: { base:  40_000, revCat: "PRODUCE_SALES", expCat: "FARM_COSTS" },
  EDUCATION:   { base:  60_000, revCat: "TUITION",       expCat: "PAYROLL" },
  INVESTMENT:  { base:  30_000, revCat: "DIVIDEND_INCOME", expCat: "MANAGEMENT_FEE" },
  TRADE:       { base:  45_000, revCat: "TRADING_REVENUE", expCat: "COST_OF_GOODS" },
};
const DEFAULT_CFG: SectorCfg = { base: 25_000, revCat: "REVENUE", expCat: "EXPENSE" };

async function main() {
  console.log("• Enriching finance demo data …\n");

  const companies = await prisma.company.findMany({
    select: { id: true, code: true, name: true, sector: true },
    orderBy: { createdAt: "asc" },
  });
  if (companies.length === 0) {
    console.log("No companies found — nothing to enrich.");
    await prisma.$disconnect();
    Math.random = _realRandom;
    return;
  }

  let txCount = 0;
  for (const c of companies) {
    const cfg = SECTOR[c.sector] ?? DEFAULT_CFG;
    // 12 monthly buckets, newest first. Month 0 lands inside the last 30 days
    // so the dashboard's default window is never empty.
    for (let m = 0; m < 12; m++) {
      // Gentle upward trend toward the present + per-month variance.
      const trend = 1 + (11 - m) * 0.012;            // ~+13% across the year
      const revenue = round(cfg.base * trend * (0.85 + Math.random() * 0.3));
      // Expenses 62–78% of revenue → 22–38% margin, never 0 / never 100%.
      const expense = round(revenue * (0.62 + Math.random() * 0.16));

      const revDay = m * 30 + Math.floor(Math.random() * 18);      // 0..17, 30..47, …
      const expDay = m * 30 + 6 + Math.floor(Math.random() * 18);  // 6..23, 36..53, …

      for (const [kind, cat, amt, day] of [
        ["REVENUE", cfg.revCat, revenue, revDay] as const,
        ["EXPENSE", cfg.expCat, expense, expDay] as const,
      ]) {
        const ref = `DEMO-FIN-${c.code}-${String(m).padStart(2, "0")}-${kind === "REVENUE" ? "REV" : "EXP"}`;
        await prisma.transaction.upsert({
          where: { reference: ref },
          create: {
            companyId: c.id,
            reference: ref,
            kind,
            category: cat,
            amount: amt,
            currency: "JOD",
            description: `${cat} — ${c.name}`,
            occurredAt: daysAgo(day),
          },
          update: { kind, category: cat, amount: amt, occurredAt: daysAgo(day), description: `${cat} — ${c.name}` },
        });
        txCount++;
      }
    }
  }

  const total = await prisma.transaction.count();
  console.log(`Done. Wrote/updated ${txCount} DEMO-FIN transactions across ${companies.length} companies.`);
  console.log(`Total transactions now: ${total}`);

  await prisma.$disconnect();
  Math.random = _realRandom;
}

main().catch((e) => {
  console.error("FINANCE SEED FAILED:", e);
  process.exit(1);
});
