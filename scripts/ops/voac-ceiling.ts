// scripts/ops/voac-ceiling.ts
//
// The 20-minute test from docs/VOAC-RUNTIME.md §8: compute the CEILING of the
// VOAC's flagship cross-company flow — near-expiry dairy diverted into hotel
// F&B — BEFORE building it.
//
// Why this runs before any more VOAC code: if the recoverable value is small,
// the flagship demo dies in front of Hourani leadership and the whole layer
// gets judged by its weakest showcase. Better to learn that from SQL than from
// a boardroom. If it is large, you have a JOD number to pitch instead of an
// architecture diagram — which is the thing a buyer actually responds to.
//
// This script is deliberately loud about what it CANNOT compute. A confident
// number built on an absent input is worse than no number, because someone
// will act on it.
//
//   npx tsx --tsconfig tsconfig.scripts.json scripts/ops/voac-ceiling.ts
//
// Read-only. Runs against whatever DATABASE_URL points at; never writes.

import { makePrismaClient } from "../_prisma";

/** Batches within this many days of expiry are "at risk". */
const AT_RISK_DAYS = 7;

function jod(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} JOD`;
}

async function main() {
  const prisma = makePrismaClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + AT_RISK_DAYS * 86_400_000);

  const companies = await prisma.company.findMany({
    select: { id: true, code: true, name: true, sector: true, country: true },
  });
  const dairyCos = companies.filter((c) => c.sector === "DAIRY");
  const hotelCos = companies.filter((c) => c.sector === "HOSPITALITY");

  console.log("=".repeat(72));
  console.log("VOAC CEILING TEST — near-expiry dairy → hotel F&B");
  console.log("=".repeat(72));
  console.log(`Dairy companies:       ${dairyCos.length} (${dairyCos.map((c) => c.code).join(", ") || "none"})`);
  console.log(`Hospitality companies: ${hotelCos.length} (${hotelCos.map((c) => c.code).join(", ") || "none"})`);

  // --- The Bulgaria constraint, computed rather than assumed ------------
  // A Jordanian perishable batch with days of shelf life cannot serve a
  // property in another country. That shrinks the addressable estate BEFORE
  // any value is counted.
  const domesticHotels = hotelCos.filter((c) => c.country === "JO");
  const foreignHotels = hotelCos.filter((c) => c.country !== "JO");
  console.log(
    `\nAddressable hotels (same country as dairy): ${domesticHotels.length}` +
      ` — excluded as cross-border: ${foreignHotels.length}` +
      (foreignHotels.length ? ` (${foreignHotels.map((c) => `${c.code}/${c.country}`).join(", ")})` : ""),
  );

  // --- Supply side: how much product is actually at risk ----------------
  const batches = await prisma.dairyBatch.findMany({
    where: { companyId: { in: dairyCos.map((c) => c.id) } },
    select: {
      batchNumber: true, product: true, quantityLiters: true,
      status: true, expiryDate: true, destination: true,
    },
  });

  const expired = batches.filter((b) => b.expiryDate < now);
  const atRisk = batches.filter((b) => b.expiryDate >= now && b.expiryDate <= horizon);
  const litersExpired = expired.reduce((s, b) => s + b.quantityLiters, 0);
  const litersAtRisk = atRisk.reduce((s, b) => s + b.quantityLiters, 0);

  console.log(`\n--- SUPPLY SIDE (${batches.length} batches) ---`);
  console.log(`Already past expiry:        ${expired.length} batches, ${litersExpired.toLocaleString()} L`);
  console.log(`Within ${AT_RISK_DAYS} days of expiry:  ${atRisk.length} batches, ${litersAtRisk.toLocaleString()} L`);

  const byStatus = new Map<string, number>();
  for (const b of batches) byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
  console.log(`Status mix: ${[...byStatus].map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}`);

  // --- Demand side: what the hotels actually consume --------------------
  const dairySpend = await prisma.transaction.aggregate({
    where: { companyId: { in: domesticHotels.map((c) => c.id) }, category: "DAIRY" },
    _sum: { amount: true },
    _count: true,
  });

  console.log(`\n--- DEMAND SIDE ---`);
  console.log(
    `Hotel transactions categorised DAIRY: ${dairySpend._count}` +
      ` totalling ${jod(dairySpend._sum.amount ?? 0)}`,
  );

  // --- The verdict, including what is missing ---------------------------
  const blockers: string[] = [];

  if (litersAtRisk + litersExpired === 0) {
    blockers.push("No at-risk or expired dairy batches exist in this database — there is no supply side to recover.");
  }
  if ((dairySpend._sum.amount ?? 0) === 0) {
    blockers.push(
      "Hotel-side dairy consumption is not measurable: no hotel Transaction carries category \"DAIRY\". " +
        "There is no F&B spend category in the schema at all (see the CostCenter comment in " +
        "prisma/schema/finance.prisma — F&B is described as an owner mapping decision, not a modelled field).",
    );
  }
  // DairyBatch carries volume but no price, so litres cannot become dinars.
  blockers.push(
    "DairyBatch has quantityLiters but NO price or cost per litre, so recovered value cannot be computed " +
      "from the schema. A JOD figure today would require an assumed price — i.e. an invented number.",
  );

  console.log(`\n${"=".repeat(72)}`);
  if (blockers.length) {
    console.log("CEILING: NOT COMPUTABLE FROM THE CURRENT SCHEMA");
    console.log("=".repeat(72));
    blockers.forEach((b, i) => console.log(`\n${i + 1}. ${b}`));
    console.log(
      `\nTO MAKE IT COMPUTABLE — the smallest instrumentation that yields a real number:` +
        `\n  a) a price/cost per litre on DairyBatch (or a link to the product's standard cost);` +
        `\n  b) a dairy/F&B expense category (or CostCenter) on hotel transactions;` +
        `\n  c) the hotels' purchasing cycle length — a weekly cycle against a ${AT_RISK_DAYS}-day` +
        `\n     shelf life recovers nothing, however large the volume looks.` +
        `\n\nUntil (a) and (b) exist, the flagship cross-company flow cannot be quantified,` +
        `\nand it should NOT be the headline of a pitch.`,
    );
  } else {
    console.log("CEILING: computable — see figures above.");
  }
  console.log(`\nNOTE: run this against the database that holds REAL Hourani data.`);
  console.log(`A locally-seeded demo database produces a demo number, which proves the`);
  console.log(`query works and proves nothing about the business case.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("voac-ceiling failed:", e);
    process.exit(1);
  });
