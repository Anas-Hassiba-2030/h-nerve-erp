// scripts/run-brain-all-tenants.ts
//
// One-shot: run runBrainAnalysis() for every ACTIVE tenant. Same logic
// the cron uses, runnable locally without CRON_SECRET. Useful for pitch
// prep after seeding.

import { runBrainAnalysis } from "../lib/intelligence/engine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  console.log(`Found ${tenants.length} ACTIVE tenants. Running Brain pass on each:\n`);
  for (const t of tenants) {
    const r = await runBrainAnalysis(t.slug);
    console.log(`  ${t.slug.padEnd(18)} generated=${r.generated}  updated=${r.updated}  unchanged=${r.unchanged}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
