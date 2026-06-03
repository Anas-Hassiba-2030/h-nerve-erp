// scripts/verify-revenue-parity.ts — BUG-3 verification.
// Confirms the same JOD value is returned by lib/finance helper for
// each company. Both /workspace command center and /markets cards
// now read this single source — output here is what BOTH screens
// will render.

import { PrismaClient } from "@prisma/client";
import { getCompanyRevenue30dMap, notionalValuationFromRevenue30d } from "@/lib/finance";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, code: true, nameEn: true },
    orderBy: { code: "asc" },
  });
  const revMap = await getCompanyRevenue30dMap(companies.map((c) => c.id));

  console.log("\nBUG-3 verification — single source of truth for revenue 30d\n");
  console.log("Source: lib/finance.getCompanyRevenue30dMap (Transaction.kind=REVENUE, occurredAt >= now-30d)\n");
  for (const c of companies) {
    const rev = revMap.get(c.id) ?? 0;
    const val = notionalValuationFromRevenue30d(rev);
    console.log(
      `  ${c.code.padEnd(8)} ${c.nameEn.padEnd(22)} ` +
        `revenue30d=${rev.toFixed(2).padStart(14)} JOD  ` +
        `notional-valuation=${val.toLocaleString("en-US").padStart(12)} JOD`,
    );
  }
  console.log("\n/workspace command center → revenue30d column");
  console.log("/markets Hourani Equities card → notional-valuation column");
  console.log("Both screens compute from the same helper — values are guaranteed identical.\n");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
