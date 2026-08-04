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
import { isFnbDairySpend } from "../../src/lib/finance/categories";

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
      batchNumber: true, product: true, quantityLiters: true, status: true,
      expiryDate: true, destination: true, pricePerLiter: true, costPerLiter: true,
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

  // Unpriced batches are counted and reported separately, never treated as
  // zero — "not priced" and "worth nothing" are different facts.
  const unpriced = batches.filter((b) => b.pricePerLiter == null);
  console.log(`Unpriced batches (excluded from value): ${unpriced.length} of ${batches.length}`);

  // --- Recoverable value ------------------------------------------------
  // Recovery is the MARGIN, never the full price: the litre was already
  // produced and paid for. Diverting it recovers (price − cost), and only for
  // batches still inside their shelf life. Expired stock recovers nothing —
  // it is a write-off, and the group-broker skill doc forbids proposing
  // otherwise.
  const recoverable = atRisk.reduce((sum, b) => {
    if (b.pricePerLiter == null) return sum;
    const margin = b.pricePerLiter - (b.costPerLiter ?? 0);
    return sum + Math.max(0, margin) * b.quantityLiters;
  }, 0);

  const writtenOff = expired.reduce((sum, b) => {
    if (b.costPerLiter == null) return sum;
    return sum + b.costPerLiter * b.quantityLiters;
  }, 0);

  // --- Demand side: what the hotels actually consume --------------------
  const hotelTxns = await prisma.transaction.findMany({
    where: { companyId: { in: domesticHotels.map((c) => c.id) } },
    select: { category: true, amount: true, occurredAt: true },
  });
  const dairyTxns = hotelTxns.filter((t) => isFnbDairySpend(t.category));
  const dairySpendTotal = dairyTxns.reduce((s, t) => s + t.amount, 0);

  // Annualise from whatever window the data actually covers, rather than
  // assuming twelve months exist.
  const dates = dairyTxns.map((t) => t.occurredAt.getTime());
  const spanDays = dates.length > 1 ? (Math.max(...dates) - Math.min(...dates)) / 86_400_000 : 0;
  const annualDairySpend = spanDays > 30 ? (dairySpendTotal / spanDays) * 365 : dairySpendTotal;

  console.log(`\n--- DEMAND SIDE ---`);
  console.log(`Hotel transactions tagged as dairy/F&B: ${dairyTxns.length} of ${hotelTxns.length}`);
  console.log(`Observed dairy spend: ${jod(dairySpendTotal)} over ${Math.round(spanDays)} days`);
  console.log(`Annualised hotel dairy spend: ${jod(annualDairySpend)}`);

  // --- The verdict --------------------------------------------------------
  const blockers: string[] = [];
  if (litersAtRisk + litersExpired === 0) {
    blockers.push("No at-risk or expired dairy batches exist — there is no supply side to recover.");
  }
  if (dairyTxns.length === 0) {
    blockers.push(
      "Hotel-side dairy consumption is not measurable: no hotel Transaction resolves to a dairy/F&B " +
        "category via src/lib/finance/categories.ts. Run scripts/seed/seed-dairy-pricing.ts, or tag the real rows.",
    );
  }
  if (unpriced.length === batches.length && batches.length > 0) {
    blockers.push(
      "Every batch is unpriced (pricePerLiter is null), so litres cannot become dinars. " +
        "Enter prices, or run scripts/seed/seed-dairy-pricing.ts for demo figures.",
    );
  }

  console.log(`\n${"=".repeat(72)}`);
  if (blockers.length) {
    console.log("CEILING: NOT COMPUTABLE");
    console.log("=".repeat(72));
    blockers.forEach((b, i) => console.log(`\n${i + 1}. ${b}`));
  } else {
    // The cycle test decides whether ANY of this is actually capturable.
    const capturable = Math.min(recoverable, annualDairySpend);
    console.log("CEILING: COMPUTED");
    console.log("=".repeat(72));
    console.log(`\n  Margin on at-risk stock (${AT_RISK_DAYS}-day window):  ${jod(recoverable)}`);
    console.log(`  Already written off (expired × cost):     ${jod(writtenOff)}`);
    console.log(`  Annualised hotel dairy demand:            ${jod(annualDairySpend)}`);
    console.log(`\n  → CEILING, capped by demand:              ${jod(capturable)}`);
    console.log(
      `\n  Read this as an UPPER BOUND, not a forecast. It assumes every at-risk` +
        `\n  litre finds a hotel buyer inside its remaining shelf life. The real` +
        `\n  figure is lower by whatever the purchasing cycle costs you:` +
        `\n  a weekly ordering cycle against a ${AT_RISK_DAYS}-day window captures a` +
        `\n  fraction of this, and that fraction is the number worth pitching.`,
    );
    if (unpriced.length > 0) {
      console.log(`\n  CAVEAT: ${unpriced.length} batch(es) are unpriced and excluded — the figure is incomplete.`);
    }
    if (foreignHotels.length > 0) {
      console.log(
        `  CAVEAT: ${foreignHotels.length} cross-border hotel(s) excluded — perishables cannot reach them.`,
      );
    }
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
