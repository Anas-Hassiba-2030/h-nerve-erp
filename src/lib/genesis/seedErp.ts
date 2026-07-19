// ERP demo seed — the front-office operator surfaces (Phase 27).
//
// WHY THIS EXISTS: on the live D1 database every ERP operator table
// (Invoice, Payment, Treasury, PosSale, FixedAsset, PayrollRun, …) was empty,
// so /invoices, /pos, /treasuries, /hr, /manufacturing and the rest rendered
// dead empty states — the buttons looked broken because their prerequisites
// (customers, ledger accounts, an open period, treasuries) didn't exist.
//
// DESIGN: prerequisites are idempotent upserts; the DOCUMENTS are created by
// calling the SAME core finance/pos/hr functions the operator buttons call
// (postInvoiceFromComputed, postPayment, completePosSale, runPayroll, …). Two
// payoffs: the seed doubles as an end-to-end test of every create path, and
// invoice↔journalEntry consistency is guaranteed (raw inserts would break it).
// Each document block is gated on a per-tenant count so a re-run is a no-op.
//
// Runs IN-PROCESS on the Worker against D1 (see app/api/admin/seed-erp) —
// core fns need Prisma, so `wrangler d1 execute` (raw SQL) can't do this.
// D1 has no interactive transactions, so we call the core fns with the plain
// client (no $transaction wrapper) — each document is an independent, already
// crash-safe (DRAFT→POSTED) unit; a mid-seed failure leaves earlier documents
// committed and the idempotency gates make the re-run resume cleanly.

import type { PrismaClient } from "@prisma/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenancy/tenancy";
import {
  computeLineTotals,
  ensureLedgerAccount,
  nextDocNumber,
  postInvoiceFromComputed,
  postPayment,
} from "@/lib/finance/invoicing";
import {
  postPurchaseInvoiceFromComputed,
  postSupplierPayment,
} from "@/lib/finance/purchasing";
import { postAssetAcquisition } from "@/lib/finance/assets";
import { openCashSession, completePosSale } from "@/lib/pos/pos";
import { runPayroll } from "@/lib/hr/payroll";
import { completeManufacturingOrder } from "@/lib/manufacturing/manufacturing";
import { recordMovement, recalcProductQuantity } from "@/lib/finance/inventory";

// Marker on the opening-stock movement so the seed is idempotent AND can heal
// a product whose quantity was driven negative by a prior partial run.
const OPENING_REASON = "Opening stock (ERP seed)";

// The core fns are typed for Prisma.TransactionClient; on D1 we hand them the
// plain client (no real transactions there anyway). One alias, cast once.
type Tx = Parameters<typeof postInvoiceFromComputed>[0];

export type SeedErpResult = {
  tenant: string;
  created: Record<string, number>;
  skipped: string[];
  ms: number;
};

export async function seedErp(
  db: PrismaClient,
  tenantId: string = DEFAULT_TENANT_SLUG,
): Promise<SeedErpResult> {
  const t0 = Date.now();
  const t = db as unknown as Tx;
  const created: Record<string, number> = {};
  const skipped: string[] = [];
  const bump = (k: string, n = 1) => (created[k] = (created[k] ?? 0) + n);

  // ── Prerequisites (idempotent) ─────────────────────────────────────────

  // 1) Warehouse — products require a warehouseId.
  const warehouse = await db.warehouse.upsert({
    where: { tenantId_code: { tenantId, code: "AMM-MAIN" } },
    create: { tenantId, code: "AMM-MAIN", name: "عمّان — المستودع الرئيسي", type: "MAIN", active: true },
    update: {},
  });

  // 2) Treasuries (Cash + Bank). Each needs a ledger account first.
  async function ensureTreasury(accountCode: string, name: string, type: "CASH" | "BANK") {
    const existing = await db.treasury.findUnique({
      where: { tenantId_accountCode: { tenantId, accountCode } },
    });
    if (existing) return existing;
    const acct = await ensureLedgerAccount(t, tenantId, accountCode, name, "ASSET");
    bump("treasuries");
    return db.treasury.create({
      data: { tenantId, name, type, currency: "JOD", accountCode, ledgerAccountId: acct.id },
    });
  }
  const cashBox = await ensureTreasury("1000", "الصندوق النقدي", "CASH");
  const bank = await ensureTreasury("1010", "حساب البنك الرئيسي", "BANK");

  // 3) Customers.
  const customerDefs = [
    { name: "شركة الأفق للتجارة", email: "billing@ufuq.jo", paymentTerms: "Net 30" },
    { name: "فندق البتراء الذهبي", email: "accounts@petra-gold.jo", paymentTerms: "Net 15" },
    { name: "مؤسسة النور الحكومية", email: "finance@noor.gov.jo", paymentTerms: "Net 45" },
    { name: "خالد المومني (فرد)", email: "k.momani@gmail.com", paymentTerms: "COD" },
  ];
  const customers = [];
  for (const c of customerDefs) {
    const row = await db.customer.upsert({
      where: { tenantId_name: { tenantId, name: c.name } },
      create: { tenantId, name: c.name, email: c.email, paymentTerms: c.paymentTerms },
      update: {},
    });
    customers.push(row);
  }

  // 4) Suppliers.
  const supplierDefs = [
    { name: "مزارع الوادي الأخضر", paymentTerms: "Net 30" },
    { name: "التوريدات الصناعية المتحدة", paymentTerms: "Net 60" },
    { name: "شركة التغليف الحديثة", paymentTerms: "COD" },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    const row = await db.supplier.upsert({
      where: { tenantId_name: { tenantId, name: s.name } },
      create: { tenantId, name: s.name, paymentTerms: s.paymentTerms },
      update: {},
    });
    suppliers.push(row);
  }

  // 5) Products (stock high enough for POS + manufacturing to draw down).
  const productDefs = [
    { sku: "WATER-500", name: "مياه معدنية ٥٠٠مل", unitCost: 0.15, price: 0.5 },
    { sku: "COFFEE-250", name: "قهوة عربية ٢٥٠غ", unitCost: 2.2, price: 4.5 },
    { sku: "DATES-1KG", name: "تمر مجدول ١كغ", unitCost: 3.0, price: 7.0 },
    { sku: "GIFT-BASKET", name: "سلة ضيافة فاخرة", unitCost: 0, price: 22.0 },
  ];
  const products: Record<string, { id: string; price: number }> = {};
  for (const p of productDefs) {
    let row = await db.product.findFirst({ where: { tenantId, sku: p.sku } });
    if (!row) {
      // quantity starts at 0 — stock arrives via the opening IMPORT movement
      // below, because Product.quantity is the SUM of movements (the invariant
      // recordMovement/recalcProductQuantity maintain). Seeding a non-zero
      // quantity with no matching movement breaks it: the first sale's recalc
      // resets quantity to the (negative) movement sum.
      row = await db.product.create({
        data: {
          tenantId, sku: p.sku, name: p.name, quantity: 0,
          reorderPoint: 200, unitCost: p.unitCost, warehouseId: warehouse.id,
        },
      });
      bump("products");
    }
    // Opening stock — idempotent. POS and manufacturing draw down the
    // movement-derived quantity, so every product needs a real inflow. Skip if
    // one already exists; recalc reconciles quantity (also heals any product a
    // prior partial run drove negative).
    const hasOpening = await db.inventoryMovement.findFirst({
      where: { productId: row.id, type: "IMPORT", reason: OPENING_REASON },
    });
    if (!hasOpening) {
      await recordMovement(t, {
        tenantId, productId: row.id, type: "IMPORT", delta: 5000,
        unitCost: p.unitCost, reason: OPENING_REASON,
      });
      await recalcProductQuantity(t, row.id);
      bump("openingStock");
    }
    products[p.sku] = { id: row.id, price: p.price };
  }

  // 6) Employees (payroll draws from ACTIVE ones).
  const employeeDefs = [
    { employeeNumber: "EMP-001", name: "سالم العتيبي", department: "العمليات", position: "مدير عمليات", baseSalary: 1400 },
    { employeeNumber: "EMP-002", name: "ريم الشوبكي", department: "المالية", position: "محاسبة", baseSalary: 1100 },
    { employeeNumber: "EMP-003", name: "ياسر القضاة", department: "المبيعات", position: "مندوب مبيعات", baseSalary: 900 },
    { employeeNumber: "EMP-004", name: "هبة النعيمي", department: "الموارد البشرية", position: "أخصائية HR", baseSalary: 1000 },
  ];
  for (const e of employeeDefs) {
    await db.employee.upsert({
      where: { tenantId_employeeNumber: { tenantId, employeeNumber: e.employeeNumber } },
      create: {
        tenantId, employeeNumber: e.employeeNumber, name: e.name,
        department: e.department, position: e.position, baseSalary: e.baseSalary, status: "ACTIVE",
      },
      update: {},
    });
  }

  // ── Documents — created THROUGH the core fns, gated per tenant ──────────

  // Invoices (+ some payments).
  if ((await db.invoice.count({ where: { tenantId } })) === 0) {
    const invLines = (desc: string, qty: number, price: number) => [
      { description: desc, quantity: qty, unitPrice: price },
    ];
    const specs = [
      { cust: 0, desc: "خدمات ضيافة — مؤتمر الربع الثالث", qty: 1, price: 4200, pay: "full" as const },
      { cust: 1, desc: "توريد مستلزمات فندقية", qty: 30, price: 45, pay: "partial" as const },
      { cust: 2, desc: "عقد تموين شهري", qty: 1, price: 6800, pay: "full" as const },
      { cust: 3, desc: "طلب تجزئة", qty: 5, price: 22, pay: "none" as const },
    ];
    for (const s of specs) {
      const computed = await computeLineTotals(t, tenantId, invLines(s.desc, s.qty, s.price));
      const inv = await postInvoiceFromComputed(t, {
        tenantId, customerId: customers[s.cust].id, currency: "JOD", computed,
      });
      bump("invoices");
      if (s.pay !== "none") {
        const amount = s.pay === "full" ? Number(inv.total) : Math.round(Number(inv.total) * 0.4 * 100) / 100;
        await postPayment(t, {
          tenantId, customerId: customers[s.cust].id, invoiceId: inv.id,
          treasuryId: s.cust === 1 ? bank.id : cashBox.id, amount, currency: "JOD", method: "CASH",
        });
        bump("payments");
      }
    }
  } else skipped.push("invoices");

  // Estimates (direct create — status DRAFT, no journal impact).
  if ((await db.estimate.count({ where: { tenantId } })) === 0) {
    const estSpecs = [
      { cust: 0, desc: "عرض تجهيز قاعة مؤتمرات", qty: 1, price: 9500 },
      { cust: 2, desc: "عرض عقد تموين سنوي", qty: 12, price: 6800 },
    ];
    for (const e of estSpecs) {
      const computed = await computeLineTotals(t, tenantId, [{ description: e.desc, quantity: e.qty, unitPrice: e.price }]);
      const estimateNumber = await nextDocNumber(t, tenantId, "ESTIMATE", "EST-");
      await db.estimate.create({
        data: {
          tenantId, estimateNumber, customerId: customers[e.cust].id, status: "DRAFT",
          currency: "JOD", subtotal: computed.subtotal, taxTotal: computed.taxTotal, total: computed.total,
          lines: {
            create: computed.linesWithTax.map((l) => ({
              productId: l.productId || null, description: l.description, quantity: l.quantity,
              unitPrice: l.unitPrice, taxRateId: l.taxRateId || null, lineTotal: l.lineTotal + l.tax,
            })),
          },
        },
      });
      bump("estimates");
    }
  } else skipped.push("estimates");

  // Purchase invoices (+ one supplier payment).
  if ((await db.purchaseInvoice.count({ where: { tenantId } })) === 0) {
    const pSpecs = [
      { sup: 0, desc: "توريد خضار وفواكه طازجة", qty: 1, price: 1850, pay: true },
      { sup: 1, desc: "قطع غيار ومعدات", qty: 1, price: 3400, pay: false },
      { sup: 2, desc: "مواد تغليف", qty: 100, price: 12, pay: false },
    ];
    for (const p of pSpecs) {
      const computed = await computeLineTotals(t, tenantId, [{ description: p.desc, quantity: p.qty, unitPrice: p.price }]);
      const bill = await postPurchaseInvoiceFromComputed(t, {
        tenantId, supplierId: suppliers[p.sup].id, currency: "JOD", computed,
      });
      bump("purchaseInvoices");
      if (p.pay) {
        await postSupplierPayment(t, {
          tenantId, supplierId: suppliers[p.sup].id, purchaseInvoiceId: bill.id,
          treasuryId: bank.id, amount: Number(bill.total), currency: "JOD", method: "TRANSFER",
        });
        bump("supplierPayments");
      }
    }
  } else skipped.push("purchaseInvoices");

  // Fixed assets.
  if ((await db.fixedAsset.count({ where: { tenantId } })) === 0) {
    const assets = [
      { name: "سيارة توصيل — إيسوزو", category: "مركبات", purchaseCost: 18500, salvageValue: 2500, usefulLifeMonths: 84 },
      { name: "ثلاجة عرض صناعية", category: "معدات", purchaseCost: 4200, salvageValue: 400, usefulLifeMonths: 120 },
      { name: "أثاث مكتبي — طقم كامل", category: "أثاث", purchaseCost: 3100, salvageValue: 300, usefulLifeMonths: 96 },
    ];
    for (const a of assets) {
      await postAssetAcquisition(t, { tenantId, ...a });
      bump("fixedAssets");
    }
  } else skipped.push("fixedAssets");

  // POS — open a cash session on the cash box, ring a few sales.
  if ((await db.posSale.count({ where: { tenantId } })) === 0) {
    let session = await db.cashSession.findFirst({
      where: { tenantId, treasuryId: cashBox.id, status: "OPEN", deletedAt: null },
    });
    if (!session) {
      session = await openCashSession(t, { tenantId, treasuryId: cashBox.id, openingFloat: 100 });
      bump("cashSessions");
    }
    const sales = [
      [{ sku: "WATER-500", qty: 6 }, { sku: "COFFEE-250", qty: 1 }],
      [{ sku: "DATES-1KG", qty: 2 }],
      [{ sku: "COFFEE-250", qty: 3 }, { sku: "WATER-500", qty: 12 }],
    ];
    for (const cart of sales) {
      await completePosSale(t, {
        tenantId, sessionId: session.id, paymentMethod: "CASH",
        lines: cart.map((c) => ({ productId: products[c.sku].id, quantity: c.qty, unitPrice: products[c.sku].price })),
      });
      bump("posSales");
    }
  } else skipped.push("posSales");

  // Payroll — current month over the ACTIVE employees.
  if ((await db.payrollRun.count({ where: { tenantId } })) === 0) {
    const now = new Date();
    const run = await runPayroll(t, {
      tenantId, year: now.getFullYear(), month: now.getMonth() + 1, treasuryId: bank.id,
    });
    if (run) bump("payrollRuns");
  } else skipped.push("payrollRuns");

  // Manufacturing — one BOM (gift basket from 3 components) + a completed order.
  if ((await db.manufacturingOrder.count({ where: { tenantId } })) === 0) {
    const bomNumber = await nextDocNumber(t, tenantId, "BOM", "BOM-");
    const bom = await db.billOfMaterials.create({
      data: {
        tenantId, bomNumber, name: "سلة ضيافة فاخرة", productId: products["GIFT-BASKET"].id,
        outputQty: 1, laborCost: 1.5, overheadCost: 0.75,
        lines: {
          create: [
            { componentProductId: products["WATER-500"].id, quantity: 4 },
            { componentProductId: products["COFFEE-250"].id, quantity: 1 },
            { componentProductId: products["DATES-1KG"].id, quantity: 1 },
          ],
        },
      },
    });
    bump("boms");
    const orderNumber = await nextDocNumber(t, tenantId, "MFG_ORDER", "MO-");
    const order = await db.manufacturingOrder.create({
      data: { tenantId, orderNumber, bomId: bom.id, runs: 25, status: "IN_PROGRESS" },
    });
    await completeManufacturingOrder(t, { tenantId, orderId: order.id });
    bump("manufacturingOrders");
  } else skipped.push("manufacturingOrders");

  return { tenant: tenantId, created, skipped, ms: Date.now() - t0 };
}
