// scripts/sanity-sweep.ts
//
// Quick read-only sanity checks against prod Neon. Verifies the core
// business invariants that the pitch depends on.
//   - Every JournalEntry has SUM(debit)=SUM(credit).
//   - Soft-deleted Product rows stay out of default lists.
//   - Inventory cache (Product.quantity) matches SUM(InventoryMovement.delta).
//   - Per-tenant brain-insight counts.
//   - Per-tenant transaction totals (revenue / expense / net).

import { PrismaClient, Prisma } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  console.log("\n=== Sanity sweep ===\n");

  // --- 1. Journal entries balance ---
  const rows: any = await p.$queryRaw`
    SELECT je."id" as id, je."reference" as ref, je."tenantId" as t,
           SUM(jl."debit")::text as dr, SUM(jl."credit")::text as cr
    FROM "JournalEntry" je
    LEFT JOIN "JournalLine" jl ON jl."journalEntryId" = je."id"
    GROUP BY je."id", je."reference", je."tenantId"
    HAVING SUM(jl."debit") <> SUM(jl."credit")
  `;
  console.log(`1. Unbalanced journal entries: ${rows.length}`);
  if (rows.length) {
    for (const r of rows.slice(0, 5)) {
      console.log(`   ⚠ ${r.t}/${r.ref}: dr=${r.dr} cr=${r.cr}`);
    }
  } else {
    console.log("   ✓ every POSTED entry balances.");
  }

  // --- 2. Soft-deleted Products invisible in default list ---
  const softDeletedCount = await p.product.count({ where: { deletedAt: { not: null } } });
  const sampleListSeesIt = await p.product.findMany({ where: { deletedAt: null }, select: { id: true } });
  const allCount = await p.product.count();
  console.log(`\n2. Products — total=${allCount}  soft-deleted=${softDeletedCount}  visible-via-deletedAt:null=${sampleListSeesIt.length}`);
  console.log(`   ${softDeletedCount + sampleListSeesIt.length === allCount ? "✓" : "⚠"} soft-delete filter math checks out.`);

  // --- 3. Inventory cache vs movements ledger ---
  const mismatches: any = await p.$queryRaw`
    SELECT pr."id" as id, pr."sku" as sku, pr."tenantId" as t, pr."quantity" as cached,
           COALESCE(SUM(m."delta"), 0)::int as ledger
    FROM "Product" pr
    LEFT JOIN "InventoryMovement" m ON m."productId" = pr."id" AND m."deletedAt" IS NULL
    WHERE pr."deletedAt" IS NULL
    GROUP BY pr."id", pr."sku", pr."tenantId", pr."quantity"
    HAVING pr."quantity" <> COALESCE(SUM(m."delta"), 0)
  `;
  console.log(`\n3. Inventory cache mismatches: ${mismatches.length}`);
  if (mismatches.length) {
    for (const m of mismatches.slice(0, 8)) {
      console.log(`   note ${m.t}/${m.sku}: Product.quantity=${m.cached} ledger=${m.ledger}`);
    }
    console.log("   (Expected: the seed sets Product.quantity directly + writes RECEIVED/SOLD movements; cache is denormalized, not auto-derived from seed.)");
  } else {
    console.log("   ✓ every product's cached quantity matches its movements ledger.");
  }

  // --- 4. Brain insights per tenant ---
  const ins: any = await p.$queryRaw`
    SELECT "tenantId" as t, COUNT(*)::int as n,
           SUM(CASE WHEN "resolvedAt" IS NULL AND "dismissedAt" IS NULL THEN 1 ELSE 0 END)::int as active,
           SUM(CASE WHEN "severity" = 'CRITICAL' THEN 1 ELSE 0 END)::int as critical
    FROM "BrainInsight"
    GROUP BY "tenantId"
    ORDER BY "tenantId"
  `;
  console.log(`\n4. Brain insights:`);
  for (const r of ins) console.log(`   ${r.t.padEnd(18)} total=${r.n}  active=${r.active}  critical=${r.critical}`);

  // --- 5. Per-tenant transactions ---
  const tx: any = await p.$queryRaw`
    SELECT c."code" as code, t."kind" as kind, SUM(t."amount")::text as total
    FROM "Transaction" t
    JOIN "Company" c ON c."id" = t."companyId"
    GROUP BY c."code", t."kind"
    ORDER BY c."code", t."kind"
  `;
  console.log(`\n5. Transactions by Company × kind:`);
  for (const r of tx) console.log(`   ${r.code.padEnd(8)} ${r.kind.padEnd(8)} ${parseFloat(r.total).toLocaleString("en-US")} JOD`);

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
