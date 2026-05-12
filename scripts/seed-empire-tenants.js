/**
 * Seed 6 additional tenants into the H-Nerve database so the Empire
 * Dashboard at /admin/empire shows 8 real tenants instead of 2 real
 * + 6 synthetic siblings.
 *
 * Idempotent: keyed on the unique `slug` column via prisma.tenant.upsert.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TENANTS = [
  {
    slug: "blue-meadow",
    name: "Blue Meadow Dairy",
    region: "AE · Dubai",
    adminEmail: "ops@bluemeadow.ae",
    tier: "growth",
  },
  {
    slug: "kasbah-resorts",
    name: "Kasbah Resorts",
    region: "MA · Marrakech",
    adminEmail: "cto@kasbah.ma",
    tier: "founding",
  },
  {
    slug: "olive-tree-edu",
    name: "Olive Tree Schools",
    region: "EG · Cairo",
    adminEmail: "ops@olivetree.eg",
    tier: "standard",
  },
  {
    slug: "sahara-agri",
    name: "Sahara Agri Co.",
    region: "TN · Sfax",
    adminEmail: "ops@saharaagri.tn",
    tier: "standard",
  },
  {
    slug: "northbay-logistics",
    name: "Northbay Logistics",
    region: "SA · Jeddah",
    adminEmail: "ops@northbay.sa",
    tier: "growth",
  },
  {
    slug: "highland-mfg",
    name: "Highland Manufacturing",
    region: "TR · Bursa",
    adminEmail: "ops@highland.tr",
    tier: "standard",
  },
];

async function main() {
  const now = new Date();
  for (const t of TENANTS) {
    const row = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        region: t.region,
        adminEmail: t.adminEmail,
        tier: t.tier,
        status: "ACTIVE",
        activatedAt: now,
      },
      create: {
        slug: t.slug,
        name: t.name,
        region: t.region,
        adminEmail: t.adminEmail,
        tier: t.tier,
        status: "ACTIVE",
        activatedAt: now,
      },
    });
    console.log(`  ${row.slug.padEnd(20)}  id=${row.id}  status=${row.status}`);
  }
  console.log(`\nSeeded ${TENANTS.length} empire tenants.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
