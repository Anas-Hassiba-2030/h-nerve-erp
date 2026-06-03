// scripts/seed-ns1-suppliers.ts
//
// Phase NS-1 — link the Hotels tenant's supplier rows to their source
// tenants so the cross-tenant supply-chain → purchase-order bridge has
// something to resolve at approval time. Idempotent (upsert on the
// Supplier (tenantId, name) unique key). Safe to re-run.
//
//   npx tsx scripts/seed-ns1-suppliers.ts
//
// Each linked Supplier lives ON the Hourani Hotels tenant (the buyer)
// and points AT a supplier tenant via linkedTenantId (an opaque slug,
// matching the procurement schema's tenantId-as-slug convention). The
// `notes` field carries a human-readable marker; linkedTenantId IS NOT
// NULL is the machine marker the Incoming Purchase Intent panel filters
// on.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BUYER_TENANT = "hourani-hotels";

// targetSector → the supplier tenant slug it maps to. Mirrors
// SECTOR_TO_TENANT_SLUG in lib/tenancy.ts (kept local so this script has
// zero app imports).
const LINKS: { sector: string; slug: string }[] = [
  { sector: "DAIRY", slug: "maha-dairy" },
  { sector: "AGRICULTURE", slug: "loran-agri" },
];

async function main() {
  let linked = 0;
  for (const { sector, slug } of LINKS) {
    const company = await prisma.company.findFirst({ where: { sector } });
    if (!company) {
      console.log(`  skip: no Company with sector=${sector}`);
      continue;
    }
    const supplier = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId: BUYER_TENANT, name: company.name } },
      create: {
        tenantId: BUYER_TENANT,
        name: company.name,
        linkedTenantId: slug,
        notes: `Cross-tenant link → ${slug} (NS-1 supply-chain bridge)`,
      },
      // Re-run: ensure the link is set even if the supplier pre-existed
      // from another seed. Never clobber an operator-edited name.
      update: {
        linkedTenantId: slug,
        notes: `Cross-tenant link → ${slug} (NS-1 supply-chain bridge)`,
      },
    });
    linked++;
    console.log(
      `  linked Supplier "${supplier.name}" on ${BUYER_TENANT} → ${slug} (id=${supplier.id})`,
    );
  }
  console.log(`\nDone. ${linked} cross-tenant supplier link(s) ensured.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
