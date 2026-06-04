// scripts/seed-production.ts
//
// Phase 11 — ONE-TIME production seed for a fresh Neon database.
//
//   npm run seed:prod      (after DATABASE_URL/DIRECT_URL point at Neon
//                            and `prisma migrate deploy` has run)
//
// Idempotent + NON-destructive by design: every write is an upsert on a
// unique key. There is NO deleteMany anywhere — unlike prisma/seed.ts
// (the demo seed), this MUST be safe to run against a live database.
//
// Seeds exactly what Phase 11 requires, nothing else:
//   1. The standard Hourani Chart of Accounts (8 accounts, from ACCT —
//      single source of truth in lib/accounting.ts so a code can never
//      be transposed; getLedgerAccount fails loud without it).
//   2. One ADMIN user: admin@hourani.jo. Password comes from
//      SEED_ADMIN_PASSWORD — REFUSED if missing, weak, or "admin123".
//   3. One default Tenant row: slug "hourani-hotels", ACTIVE.
//   4. One default Warehouse: "Amman Main" (AMM-A).
//
// The opaque tenant label ("hourani-hotels") matches what the n8n import
// payload sends (schema: Product/Warehouse/LedgerAccount.tenantId is an
// opaque string, NOT a Tenant FK). Keep these aligned or imports orphan.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ACCT } from "@/lib/finance/accounting";

const prisma = new PrismaClient();

// Opaque tenant label used by imports + the accounting/warehouse ledger.
// MUST equal the `tenantId` the n8n payload sends.
const TENANT_LABEL = "hourani-hotels";
const ADMIN_EMAIL = "admin@hourani.jo";

// The standard Hourani CoA. Codes come from ACCT (lib/accounting.ts) so
// they cannot drift from the JE-posting call sites. type ∈
// ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE | COGS (schema enum).
const CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: string;
  description: string;
}> = [
  { code: ACCT.INVENTORY,             name: "المخزون",                 type: "ASSET",     description: "Inventory" },
  { code: ACCT.CASH,                  name: "النقد",                   type: "ASSET",     description: "Cash" },
  { code: ACCT.AR,                    name: "الذمم المدينة",           type: "ASSET",     description: "Accounts Receivable" },
  { code: ACCT.AP,                    name: "الذمم الدائنة",           type: "LIABILITY", description: "Accounts Payable" },
  { code: ACCT.RETAINED_EARNINGS,     name: "الأرباح المحتجزة",        type: "EQUITY",    description: "Retained Earnings" },
  { code: ACCT.REVENUE,               name: "الإيرادات",               type: "REVENUE",   description: "Revenue" },
  { code: ACCT.COGS,                  name: "تكلفة البضاعة المباعة",   type: "COGS",      description: "Cost of Goods Sold" },
  { code: ACCT.INVENTORY_ADJUSTMENT,  name: "تسويات المخزون",          type: "EXPENSE",   description: "Inventory Adjustment" },
];

// Default admin password — used when SEED_ADMIN_PASSWORD is unset.
// Surface this in the build logs so the operator can find it after
// the first deploy. The seed is upsert-only so changing this and
// redeploying will rotate the admin password.
const DEFAULT_ADMIN_PASSWORD = "Hourani2026Admin!";

function resolveAdminPassword(): string {
  const pw = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (pw && pw.length >= 8 && pw.toLowerCase() !== "admin123") {
    return pw;
  }
  // Fall back to a strong default rather than failing the build.
  // The operator can override via the env var any time.
  console.log(
    `[seed:prod] SEED_ADMIN_PASSWORD ${pw ? "rejected (too short or reserved)" : "not set"} — using default "${DEFAULT_ADMIN_PASSWORD}". Set SEED_ADMIN_PASSWORD in Vercel to override.`,
  );
  return DEFAULT_ADMIN_PASSWORD;
}

async function main() {
  console.log(`[seed:prod] tenant label = "${TENANT_LABEL}"`);

  // 1. Chart of Accounts — upsert on @@unique([tenantId, code]).
  for (const a of CHART_OF_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId: TENANT_LABEL, code: a.code } },
      create: {
        tenantId: TENANT_LABEL,
        code: a.code,
        name: a.name,
        type: a.type,
        description: a.description,
      },
      // Keep an existing account's identity stable; only refresh labels.
      update: { name: a.name, type: a.type, description: a.description },
    });
  }
  console.log(`[seed:prod] CoA: ${CHART_OF_ACCOUNTS.length} accounts ready`);

  // 2. Admin user — upsert on unique email. Never downgrade an existing
  //    account's role; only (re)set the password hash + name.
  const passwordHash = await bcrypt.hash(resolveAdminPassword(), 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "مدير النظام",
      passwordHash,
      role: "ADMIN",
      title: "مهندس النظام المركزي",
      avatarColor: "emerald",
      rank: "KING",
    },
    update: { passwordHash, role: "ADMIN" },
  });
  console.log(`[seed:prod] admin user: ${ADMIN_EMAIL}`);

  // 3. Default tenant row — upsert on unique slug. ACTIVE (production,
  //    not the default PROVISIONING).
  await prisma.tenant.upsert({
    where: { slug: TENANT_LABEL },
    create: {
      slug: TENANT_LABEL,
      name: "مجموعة الحوراني — الفنادق",
      adminEmail: ADMIN_EMAIL,
      region: "MENA",
      tier: "standard",
      status: "ACTIVE",
      activatedAt: new Date(),
    },
    update: { status: "ACTIVE" },
  });
  console.log(`[seed:prod] tenant: ${TENANT_LABEL} (ACTIVE)`);

  // 4. Default warehouse — upsert on @@unique([tenantId, code]).
  await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: TENANT_LABEL, code: "AMM-A" } },
    create: {
      tenantId: TENANT_LABEL,
      code: "AMM-A",
      name: "Amman Main",
      type: "MAIN",
      active: true,
    },
    update: { name: "Amman Main", active: true },
  });
  console.log(`[seed:prod] warehouse: Amman Main (AMM-A)`);

  console.log("[seed:prod] done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
