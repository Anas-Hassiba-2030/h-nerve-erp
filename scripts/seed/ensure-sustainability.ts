// scripts/seed/ensure-sustainability.ts
//
// SUSTAINABILITY (ESG) TOP-UP — runs on every deploy (railway.toml),
// independent of seed-if-empty.ts. A prod DB can have companies (so
// seed-if-empty skips) but ZERO SustainabilityScore rows — leaving the
// /sustainability page empty. This fills two recent quarters of credible
// E/S/G scores per company.
//
// Idempotent: upserts on the @@unique([companyId, period, year]) key, so it
// re-runs safely and never duplicates. Non-blocking — a hiccup can't fail the
// deploy.
//
//   npx tsx scripts/seed/ensure-sustainability.ts

import { PrismaClient } from "@prisma/client";

// Plausible ESG envelope per sector (env, social, gov, carbonTons, waterCubicM,
// renewable%). Numbers are illustrative-but-credible for a regional group.
const BY_SECTOR: Record<string, { e: number; s: number; g: number; carbon: number; water: number; renew: number }> = {
  HOSPITALITY: { e: 71, s: 78, g: 82, carbon: 1240, water: 38_000, renew: 34 },
  DAIRY:       { e: 66, s: 74, g: 79, carbon: 1980, water: 61_000, renew: 22 },
  AGRICULTURE: { e: 81, s: 76, g: 77, carbon: 540,  water: 92_000, renew: 47 },
  EDUCATION:   { e: 88, s: 90, g: 86, carbon: 210,  water: 9_400,  renew: 58 },
};
const DEFAULT_ENV = { e: 74, s: 78, g: 80, carbon: 900, water: 30_000, renew: 38 };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.sustainabilityScore.count();
    if (existing > 0) {
      console.log(`[ensure-sustainability] ${existing} score(s) already present — skipping.`);
      return;
    }

    const companies = await prisma.company.findMany({
      select: { id: true, sector: true, code: true },
    });
    if (companies.length === 0) {
      console.log("[ensure-sustainability] no companies — skipping (run seed-if-empty.ts first).");
      return;
    }

    const year = new Date().getUTCFullYear();
    // Q1 (a baseline) then Q2 (a small improvement) so the page shows a trend.
    const periods: { period: string; lift: number }[] = [
      { period: "Q1", lift: 0 },
      { period: "Q2", lift: 2.5 },
    ];

    let written = 0;
    for (const c of companies) {
      const base = BY_SECTOR[c.sector ?? ""] ?? DEFAULT_ENV;
      for (const { period, lift } of periods) {
        const environmentalScore = round1(Math.min(100, base.e + lift));
        const socialScore = round1(Math.min(100, base.s + lift));
        const governanceScore = round1(Math.min(100, base.g + lift));
        const overall = round1((environmentalScore + socialScore + governanceScore) / 3);
        try {
          await prisma.sustainabilityScore.upsert({
            where: { companyId_period_year: { companyId: c.id, period, year } },
            create: {
              companyId: c.id,
              period,
              year,
              environmentalScore,
              socialScore,
              governanceScore,
              overall,
              carbonTons: round1(base.carbon * (1 - lift / 100)),
              waterCubicM: Math.round(base.water * (1 - lift / 200)),
              renewablePct: round1(Math.min(100, base.renew + lift)),
              notes: null,
            },
            update: {
              environmentalScore,
              socialScore,
              governanceScore,
              overall,
            },
          });
          written++;
        } catch (e) {
          console.error("[ensure-sustainability] skipped one row:", (e as Error).message);
        }
      }
    }
    console.log(`[ensure-sustainability] ✓ wrote ${written} score(s) across ${companies.length} companies.`);
  } catch (e) {
    console.error("[ensure-sustainability] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-sustainability] fatal:", e);
    process.exit(0); // never block deploy
  });
