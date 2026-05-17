// lib/orders.ts
//
// Phase 6 — Purchase Order / Sales Order lifecycle. Pure functions
// called by the /admin server actions (no HTTP here). Every stock-moving
// transition goes through the Phase-5 ledger primitives
// (recordMovement / recalcProductQuantity) — this module adds NO new
// inventory logic, it only decides WHEN a movement happens.
//
// Boundaries (decisions #1/#2): DRAFT/SENT and DRAFT/CONFIRMED are
// planning states — no movements. Only PO receipt writes RECEIVED
// (positive) and SO fulfillment writes SOLD (negative). prismaUnscoped:
// these models have no companyId, consistent with the import surface.

import { Prisma } from "@prisma/client";
import { prismaUnscoped } from "@/lib/db";
import { generateNumber } from "@/lib/utils";
import { recordMovement, recalcProductQuantity } from "@/lib/inventory";
import {
  postJournalEntry,
  getWeightedAverageCost,
  money,
  ACCT,
} from "@/lib/accounting";

export type POLineInput = {
  productId: string;
  quantity: number;
  unitCost?: number | null;
};
export type SOLineInput = {
  productId: string;
  quantity: number;
  unitPrice?: number | null;
};
export type Receipt = { lineId: string; receivedQty: number };
export type Fulfillment = { lineId: string; fulfilledQty: number };

const posInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0;
const nonNegInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0;

// Any tx-capable client (real client or a $transaction callback's tx).
type Db = Parameters<Parameters<typeof prismaUnscoped.$transaction>[0]>[0];

/**
 * Resolve + guard the products a PO/SO line references: every id must
 * exist AND belong to the order's tenant. tenancy is an opaque string
 * (no FK), so this is the only thing standing between a UI bug and a
 * cross-tenant data leak — enforce it in the helper, never trust the page.
 */
async function loadProducts(db: Db, tenantId: string, productIds: string[]) {
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, name: true, quantity: true, tenantId: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = [...new Set(productIds)].filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`unknown productId(s): ${missing.join(", ")}`);
  const crossTenant = products
    .filter((p) => p.tenantId !== tenantId)
    .map((p) => p.sku);
  if (crossTenant.length)
    throw new Error(`product(s) belong to another tenant: ${crossTenant.join(", ")}`);
  return byId;
}

/**
 * Find-or-create a Supplier by (tenantId, name). Idempotent — never
 * clobbers an edited Supplier (update: {}). Used by the import endpoint
 * auto-promote and the transitional PO action (free-text → entity)
 * until the New-PO dropdown lands.
 */
export async function findOrCreateSupplier(db: Db, tenantId: string, name: string) {
  const n = name.trim();
  if (!n) throw new Error("supplier name is required");
  return db.supplier.upsert({
    where: { tenantId_name: { tenantId, name: n } },
    create: { tenantId, name: n },
    update: {},
  });
}

/** Mirror of findOrCreateSupplier for customers (SO path / future use). */
export async function findOrCreateCustomer(db: Db, tenantId: string, name: string) {
  const n = name.trim();
  if (!n) throw new Error("customer name is required");
  return db.customer.upsert({
    where: { tenantId_name: { tenantId, name: n } },
    create: { tenantId, name: n },
    update: {},
  });
}

// ---------------------------------------------------------------------
// PURCHASE ORDERS
// ---------------------------------------------------------------------

export async function createPO(data: {
  tenantId: string;
  supplierId: string;
  lines: POLineInput[];
  expectedAt?: Date | null;
  note?: string | null;
}) {
  const tenantId = data.tenantId.trim();
  const supplierId = data.supplierId.trim();
  if (!tenantId) throw new Error("tenantId is required");
  if (!supplierId) throw new Error("supplierId is required");
  if (!data.lines?.length) throw new Error("at least one line is required");
  data.lines.forEach((l, i) => {
    if (!l.productId) throw new Error(`line ${i + 1}: productId is required`);
    if (!posInt(l.quantity))
      throw new Error(`line ${i + 1}: quantity must be a positive whole number`);
  });
  const poNumber = generateNumber("PO");
  return prismaUnscoped.$transaction(async (tx) => {
    // FK must exist AND belong to this tenant (opaque-string tenancy →
    // enforce in the helper, never trust the caller).
    const sup = await tx.supplier.findFirst({
      where: { id: supplierId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!sup) throw new Error("supplier not found for this tenant");
    await loadProducts(tx, tenantId, data.lines.map((l) => l.productId));
    return tx.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierId: sup.id,
        status: "DRAFT",
        expectedAt: data.expectedAt ?? null,
        note: data.note?.trim() || null,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost ?? null,
          })),
        },
      },
      include: { lines: true },
    });
  });
}

/** DRAFT → SENT. Procurement-only, writes no movement (decision #1). */
export async function markPOSent(poId: string) {
  const po = await prismaUnscoped.purchaseOrder.findFirst({
    where: { id: poId, deletedAt: null },
  });
  if (!po) throw new Error("purchase order not found");
  if (po.status !== "DRAFT")
    throw new Error(`only a DRAFT PO can be sent (current: ${po.status})`);
  return prismaUnscoped.purchaseOrder.update({
    where: { id: poId },
    data: { status: "SENT" },
  });
}

export async function receivePO(poId: string, receipts: Receipt[]) {
  return prismaUnscoped.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: poId, deletedAt: null },
      include: { lines: true },
    });
    if (!po) throw new Error("purchase order not found");
    if (!["SENT", "PARTIAL"].includes(po.status))
      throw new Error(`can only receive a SENT or PARTIAL PO (current: ${po.status})`);

    const byLine = new Map(po.lines.map((l) => [l.id, l]));
    // Validate the WHOLE batch first so the operator sees every problem
    // at once, not the first one before a rollback.
    const errs: string[] = [];
    for (const r of receipts) {
      const line = byLine.get(r.lineId);
      if (!line) {
        errs.push(`unknown lineId ${r.lineId}`);
        continue;
      }
      if (!nonNegInt(r.receivedQty)) {
        errs.push(`line ${line.id}: receivedQty must be a whole number ≥ 0`);
        continue;
      }
      const remaining = line.quantity - line.receivedQty;
      if (r.receivedQty > remaining)
        errs.push(
          `line ${line.id}: receivedQty ${r.receivedQty} exceeds remaining ${remaining}`,
        );
    }
    if (errs.length) throw new Error(`Receive rejected:\n- ${errs.join("\n- ")}`);

    const affected = new Set<string>();
    for (const r of receipts) {
      if (r.receivedQty <= 0) continue; // recordMovement also no-ops on 0
      const line = byLine.get(r.lineId)!;
      await recordMovement(tx, {
        tenantId: po.tenantId,
        productId: line.productId,
        type: "RECEIVED",
        delta: r.receivedQty,
        reason: `PO receipt: ${po.poNumber}`,
        documentRef: po.poNumber,
        unitCost: line.unitCost ?? null, // costed inflow → weighted-avg pool
      });
      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: { increment: r.receivedQty } },
      });
      affected.add(line.productId);
    }
    for (const pid of affected) await recalcProductQuantity(tx, pid);

    // --- Accounting (Phase 8): DR Inventory / CR Accounts Payable for
    // THIS receipt. Per-line amount rounded to 2dp (banker's) then
    // summed, so both JE sides are built from identical numbers. Lines
    // with no unitCost contribute nothing; an all-zero entry is skipped
    // by postJournalEntry (returns null). Same tx → atomic with stock.
    let invTotal = new Prisma.Decimal(0);
    for (const r of receipts) {
      if (r.receivedQty <= 0) continue;
      const line = byLine.get(r.lineId)!;
      if (line.unitCost == null) continue;
      invTotal = invTotal.plus(
        money(
          new Prisma.Decimal(r.receivedQty).times(new Prisma.Decimal(line.unitCost)),
        ),
      );
    }
    await postJournalEntry(tx, {
      tenantId: po.tenantId,
      description: `PO receipt: ${po.poNumber}`,
      reference: po.poNumber,
      lines: [
        { accountCode: ACCT.INVENTORY, debit: invTotal, memo: po.poNumber },
        { accountCode: ACCT.AP, credit: invTotal, memo: po.poNumber },
      ],
    });

    // Recompute status from the fresh line state; only write if changed.
    const fresh = await tx.purchaseOrderLine.findMany({ where: { poId } });
    const allDone = fresh.every((l) => l.receivedQty >= l.quantity);
    const anyRecv = fresh.some((l) => l.receivedQty > 0);
    const next = allDone ? "RECEIVED" : anyRecv ? "PARTIAL" : po.status;
    if (next !== po.status)
      await tx.purchaseOrder.update({ where: { id: poId }, data: { status: next } });

    return tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true },
    });
  });
}

/**
 * Cancel a PO. DRAFT/SENT → CANCELLED (nothing received). PARTIAL or
 * RECEIVED → throw: receipt movements are already on the ledger;
 * cancelling without reversing them would desync the audit trail. The
 * operator records a compensating ADJUSTMENT first (append-only rule).
 * NOTE: the spec literal only calls out PARTIAL; RECEIVED is included
 * for the same audit-integrity reason — flagged for override.
 */
export async function cancelPO(poId: string) {
  const po = await prismaUnscoped.purchaseOrder.findFirst({
    where: { id: poId, deletedAt: null },
  });
  if (!po) throw new Error("purchase order not found");
  if (po.status === "CANCELLED") throw new Error("PO is already cancelled");
  if (po.status === "PARTIAL" || po.status === "RECEIVED")
    throw new Error(
      `PO ${po.poNumber} has received stock — record a manual ADJUSTMENT to reverse it, then cancel`,
    );
  return prismaUnscoped.purchaseOrder.update({
    where: { id: poId },
    data: { status: "CANCELLED" },
  });
}

// ---------------------------------------------------------------------
// SALES ORDERS
// ---------------------------------------------------------------------

export async function createSO(data: {
  tenantId: string;
  customerId: string;
  lines: SOLineInput[];
  requiredBy?: Date | null;
  note?: string | null;
}) {
  const tenantId = data.tenantId.trim();
  const customerId = data.customerId.trim();
  if (!tenantId) throw new Error("tenantId is required");
  if (!customerId) throw new Error("customerId is required");
  if (!data.lines?.length) throw new Error("at least one line is required");
  data.lines.forEach((l, i) => {
    if (!l.productId) throw new Error(`line ${i + 1}: productId is required`);
    if (!posInt(l.quantity))
      throw new Error(`line ${i + 1}: quantity must be a positive whole number`);
  });
  const soNumber = generateNumber("SO");
  return prismaUnscoped.$transaction(async (tx) => {
    const cus = await tx.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!cus) throw new Error("customer not found for this tenant");
    const byId = await loadProducts(tx, tenantId, data.lines.map((l) => l.productId));
    // Stock availability INSIDE the tx (decision #8). Done in-tx so the
    // check stays correct after the W9 Postgres cutover (no TOCTOU race).
    const short = data.lines
      .map((l) => ({ p: byId.get(l.productId)!, need: l.quantity }))
      .filter((x) => x.p.quantity < x.need)
      .map((x) => `${x.p.sku} (need ${x.need}, have ${x.p.quantity})`);
    if (short.length) throw new Error(`Insufficient stock: ${short.join("; ")}`);
    return tx.salesOrder.create({
      data: {
        tenantId,
        soNumber,
        customerId: cus.id,
        status: "DRAFT",
        requiredBy: data.requiredBy ?? null,
        note: data.note?.trim() || null,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? null,
          })),
        },
      },
      include: { lines: true },
    });
  });
}

/**
 * DRAFT → CONFIRMED, re-running the soft stock check inside the tx
 * (decision #8 — stock may have moved since createSO). Throws listing
 * every short SKU. No movement (confirmation is still planning).
 */
export async function confirmSO(soId: string) {
  return prismaUnscoped.$transaction(async (tx) => {
    const so = await tx.salesOrder.findFirst({
      where: { id: soId, deletedAt: null },
      include: { lines: true },
    });
    if (!so) throw new Error("sales order not found");
    if (so.status !== "DRAFT")
      throw new Error(`only a DRAFT SO can be confirmed (current: ${so.status})`);
    const byId = await loadProducts(
      tx,
      so.tenantId,
      so.lines.map((l) => l.productId),
    );
    const short = so.lines
      .map((l) => ({ p: byId.get(l.productId)!, need: l.quantity }))
      .filter((x) => x.p.quantity < x.need)
      .map((x) => `${x.p.sku} (need ${x.need}, have ${x.p.quantity})`);
    if (short.length)
      throw new Error(`Cannot confirm — insufficient stock: ${short.join("; ")}`);
    return tx.salesOrder.update({
      where: { id: soId },
      data: { status: "CONFIRMED" },
    });
  });
}

export async function fulfillSO(soId: string, fulfillments: Fulfillment[]) {
  return prismaUnscoped.$transaction(async (tx) => {
    const so = await tx.salesOrder.findFirst({
      where: { id: soId, deletedAt: null },
      include: { lines: true },
    });
    if (!so) throw new Error("sales order not found");
    if (!["CONFIRMED", "PARTIAL"].includes(so.status))
      throw new Error(`can only fulfill a CONFIRMED or PARTIAL SO (current: ${so.status})`);

    const byLine = new Map(so.lines.map((l) => [l.id, l]));
    const errs: string[] = [];
    for (const f of fulfillments) {
      const line = byLine.get(f.lineId);
      if (!line) {
        errs.push(`unknown lineId ${f.lineId}`);
        continue;
      }
      if (!nonNegInt(f.fulfilledQty)) {
        errs.push(`line ${line.id}: fulfilledQty must be a whole number ≥ 0`);
        continue;
      }
      const remaining = line.quantity - line.fulfilledQty;
      if (f.fulfilledQty > remaining)
        errs.push(
          `line ${line.id}: fulfilledQty ${f.fulfilledQty} exceeds remaining ${remaining}`,
        );
    }
    if (errs.length) throw new Error(`Fulfill rejected:\n- ${errs.join("\n- ")}`);

    // No stock guard here BY SPEC (#8 soft-checks at confirm only). If
    // stock dropped since confirm, Product.quantity may go negative —
    // the ledger reflects reality; the operator sees the negative
    // balance on /admin/products and corrects via a manual ADJUSTMENT.
    const affected = new Set<string>();
    for (const f of fulfillments) {
      if (f.fulfilledQty <= 0) continue;
      const line = byLine.get(f.lineId)!;
      await recordMovement(tx, {
        tenantId: so.tenantId,
        productId: line.productId,
        type: "SOLD",
        delta: -f.fulfilledQty, // negative = stock leaving
        reason: `SO fulfillment: ${so.soNumber}`,
        documentRef: so.soNumber,
      });
      await tx.salesOrderLine.update({
        where: { id: line.id },
        data: { fulfilledQty: { increment: f.fulfilledQty } },
      });
      affected.add(line.productId);
    }
    for (const pid of affected) await recalcProductQuantity(tx, pid);

    // --- Accounting (Phase 8): two JEs, both atomic in this tx.
    //  Revenue: DR AR / CR Sales Revenue   (qty × unitPrice)
    //  COGS:    DR COGS / CR Inventory      (qty × weighted-avg cost)
    // Per-line rounded (2dp banker's) then summed. WAC excludes SOLD
    // (it filters IMPORT|RECEIVED), so computing it after recordMovement
    // is correct. Null unitPrice / WAC=0 → that JE is skipped by
    // postJournalEntry (degenerate all-zero → null).
    const wacCache = new Map<string, Prisma.Decimal>();
    let revTotal = new Prisma.Decimal(0);
    let cogsTotal = new Prisma.Decimal(0);
    for (const f of fulfillments) {
      if (f.fulfilledQty <= 0) continue;
      const line = byLine.get(f.lineId)!;
      if (line.unitPrice != null) {
        revTotal = revTotal.plus(
          money(
            new Prisma.Decimal(f.fulfilledQty).times(
              new Prisma.Decimal(line.unitPrice),
            ),
          ),
        );
      }
      let wac = wacCache.get(line.productId);
      if (!wac) {
        wac = await getWeightedAverageCost(tx, line.productId);
        wacCache.set(line.productId, wac);
      }
      cogsTotal = cogsTotal.plus(
        money(new Prisma.Decimal(f.fulfilledQty).times(wac)),
      );
    }
    await postJournalEntry(tx, {
      tenantId: so.tenantId,
      description: `SO revenue: ${so.soNumber}`,
      reference: so.soNumber,
      lines: [
        { accountCode: ACCT.AR, debit: revTotal, memo: so.soNumber },
        { accountCode: ACCT.REVENUE, credit: revTotal, memo: so.soNumber },
      ],
    });
    await postJournalEntry(tx, {
      tenantId: so.tenantId,
      description: `SO COGS: ${so.soNumber}`,
      reference: so.soNumber,
      lines: [
        { accountCode: ACCT.COGS, debit: cogsTotal, memo: so.soNumber },
        { accountCode: ACCT.INVENTORY, credit: cogsTotal, memo: so.soNumber },
      ],
    });

    const fresh = await tx.salesOrderLine.findMany({ where: { soId } });
    const allDone = fresh.every((l) => l.fulfilledQty >= l.quantity);
    const anyDone = fresh.some((l) => l.fulfilledQty > 0);
    const next = allDone ? "FULFILLED" : anyDone ? "PARTIAL" : so.status;
    if (next !== so.status)
      await tx.salesOrder.update({ where: { id: soId }, data: { status: next } });

    return tx.salesOrder.findUnique({
      where: { id: soId },
      include: { lines: true },
    });
  });
}

/** Mirror of cancelPO for sales orders (see that doc-comment). */
export async function cancelSO(soId: string) {
  const so = await prismaUnscoped.salesOrder.findFirst({
    where: { id: soId, deletedAt: null },
  });
  if (!so) throw new Error("sales order not found");
  if (so.status === "CANCELLED") throw new Error("SO is already cancelled");
  if (so.status === "PARTIAL" || so.status === "FULFILLED")
    throw new Error(
      `SO ${so.soNumber} has shipped stock — record a manual ADJUSTMENT to reverse it, then cancel`,
    );
  return prismaUnscoped.salesOrder.update({
    where: { id: soId },
    data: { status: "CANCELLED" },
  });
}
