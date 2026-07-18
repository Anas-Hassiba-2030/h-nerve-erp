// Local validation of the ERP seed's finance core path against dev.db.
//
// Proves postInvoiceFromComputed / postPayment / postPurchaseInvoiceFromComputed
// / postAssetAcquisition run on SQLite (same dialect as D1) and that the
// invoice→journal wiring is balanced + POSTED. POS/manufacturing depend on the
// scoped-prisma import in inventory.ts (Next-runtime only), so those validate
// live via /api/admin/seed-erp — not here.
//
//   DATABASE_URL="file:./dev.db" npx tsx --tsconfig tsconfig.scripts.json scripts/verify/seed-erp-check.ts

import { makePrismaClient } from "../_prisma";
import {
  computeLineTotals,
  postInvoiceFromComputed,
  postPayment,
  ensureLedgerAccount,
} from "../../src/lib/finance/invoicing";
import { postPurchaseInvoiceFromComputed } from "../../src/lib/finance/purchasing";
import { postAssetAcquisition } from "../../src/lib/finance/assets";

type Tx = Parameters<typeof postInvoiceFromComputed>[0];
const TENANT = "seed-check-tenant";

async function main() {
  const db = makePrismaClient();
  const t = db as unknown as Tx;

  // clean slate for this throwaway tenant
  await db.journalLine.deleteMany({ where: { entry: { tenantId: TENANT } } }).catch(() => {});
  await db.journalEntry.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
  await db.payment.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
  await db.invoice.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
  await db.purchaseInvoice.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});
  await db.fixedAsset.deleteMany({ where: { tenantId: TENANT } }).catch(() => {});

  const customer = await db.customer.upsert({
    where: { tenantId_name: { tenantId: TENANT, name: "Check Customer" } },
    create: { tenantId: TENANT, name: "Check Customer" },
    update: {},
  });
  const supplier = await db.supplier.upsert({
    where: { tenantId_name: { tenantId: TENANT, name: "Check Supplier" } },
    create: { tenantId: TENANT, name: "Check Supplier" },
    update: {},
  });
  const cashAcct = await ensureLedgerAccount(t, TENANT, "1000", "Cash", "ASSET");
  const treasury = await db.treasury.upsert({
    where: { tenantId_accountCode: { tenantId: TENANT, accountCode: "1000" } },
    create: { tenantId: TENANT, name: "Cash", type: "CASH", currency: "JOD", accountCode: "1000", ledgerAccountId: cashAcct.id },
    update: {},
  });

  // Invoice through the core fn.
  const computed = await computeLineTotals(t, TENANT, [{ description: "Service", quantity: 2, unitPrice: 150 }]);
  const inv = await postInvoiceFromComputed(t, { tenantId: TENANT, customerId: customer.id, currency: "JOD", computed });
  await postPayment(t, { tenantId: TENANT, customerId: customer.id, invoiceId: inv.id, treasuryId: treasury.id, amount: Number(inv.total), currency: "JOD", method: "CASH" });

  const pComputed = await computeLineTotals(t, TENANT, [{ description: "Supplies", quantity: 10, unitPrice: 40 }]);
  await postPurchaseInvoiceFromComputed(t, { tenantId: TENANT, supplierId: supplier.id, currency: "JOD", computed: pComputed });

  await postAssetAcquisition(t, { tenantId: TENANT, name: "Test Vehicle", category: "vehicles", purchaseCost: 10000, salvageValue: 1000, usefulLifeMonths: 60 });

  // Verify: journal entries POSTED + balanced.
  const entries = await db.journalEntry.findMany({
    where: { tenantId: TENANT },
    include: { lines: true },
  });
  let allPosted = true;
  let allBalanced = true;
  for (const e of entries) {
    if (e.status !== "POSTED") allPosted = false;
    const d = e.lines.reduce((s, l) => s + Number(l.debit), 0);
    const c = e.lines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(d - c) > 0.001) allBalanced = false;
  }

  const counts = {
    invoices: await db.invoice.count({ where: { tenantId: TENANT } }),
    payments: await db.payment.count({ where: { tenantId: TENANT } }),
    purchaseInvoices: await db.purchaseInvoice.count({ where: { tenantId: TENANT } }),
    fixedAssets: await db.fixedAsset.count({ where: { tenantId: TENANT } }),
    journalEntries: entries.length,
  };

  console.log("counts:", JSON.stringify(counts));
  console.log("invoice total:", Number(inv.total), "| all POSTED:", allPosted, "| all balanced:", allBalanced);

  // cleanup
  await db.journalLine.deleteMany({ where: { entry: { tenantId: TENANT } } });
  await db.journalEntry.deleteMany({ where: { tenantId: TENANT } });
  await db.payment.deleteMany({ where: { tenantId: TENANT } });
  await db.invoice.deleteMany({ where: { tenantId: TENANT } });
  await db.purchaseInvoice.deleteMany({ where: { tenantId: TENANT } });
  await db.fixedAsset.deleteMany({ where: { tenantId: TENANT } });
  await db.treasury.deleteMany({ where: { tenantId: TENANT } });
  await db.customer.deleteMany({ where: { tenantId: TENANT } });
  await db.supplier.deleteMany({ where: { tenantId: TENANT } });
  await db.ledgerAccount.deleteMany({ where: { tenantId: TENANT } });
  await db.financialPeriod.deleteMany({ where: { tenantId: TENANT } });
  await db.numberingScheme.deleteMany({ where: { tenantId: TENANT } });

  const ok = allPosted && allBalanced && counts.invoices === 1 && counts.payments === 1 && counts.purchaseInvoices === 1 && counts.fixedAssets === 1;
  console.log(ok ? "PASS ✓" : "FAIL ✗");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("check threw:", e);
  process.exit(1);
});
