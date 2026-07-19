// POS core (hnerve-gap-map.md "POS" row). Cash-drawer session + immediate
// checkout — the walk-in-retail counterpart to the B2B SalesOrder→Invoice
// flow in invoicing.ts. A PosSale is paid in full at the register, so it
// posts straight to the Treasury account (no AR leg). Stock leaves via the
// InventoryMovement ledger (SOLD) same as every other module; per the
// manufacturing precedent, products are already expensed at purchase
// (account 5000 Purchases), so a sale does NOT re-post COGS — only the
// Cash/Bank debit / Sales Revenue (4000) credit.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod, nextDocNumber } from "@/lib/finance/invoicing";
import { createPostedJournalEntry } from "@/lib/finance/accounting";
import { recordMovement, recalcProductQuantity } from "@/lib/finance/inventory";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure math ────────────────────────────────────────────────────────────

export type PosSaleLineInput = { productId: string; quantity: number; unitPrice: number };

/** Subtotal (Σ qty*price) → less discount → plus tax = total. Throws on a negative total. */
export function computeSaleTotals(args: {
  lines: PosSaleLineInput[];
  discountTotal?: number;
  taxTotal?: number;
}): { subtotal: number; discountTotal: number; taxTotal: number; total: number } {
  const subtotal = r2(args.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const discountTotal = r2(args.discountTotal ?? 0);
  const taxTotal = r2(args.taxTotal ?? 0);
  const total = r2(subtotal - discountTotal + taxTotal);
  if (total < 0) throw new Error("Sale total cannot be negative");
  return { subtotal, discountTotal, taxTotal, total };
}

// ── Cash sessions ────────────────────────────────────────────────────────

export async function openCashSession(
  tx: Tx,
  args: { tenantId: string; treasuryId: string; openingFloat: number; userId?: string },
) {
  const { tenantId, treasuryId, openingFloat, userId } = args;

  const treasury = await tx.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
  if (treasury.tenantId !== tenantId) throw new Error("Cross-tenant treasury");

  const alreadyOpen = await tx.cashSession.findFirst({
    where: { tenantId, treasuryId, status: "OPEN", deletedAt: null },
  });
  if (alreadyOpen) throw new Error(`Treasury ${treasury.name} already has an open session`);

  return tx.cashSession.create({
    data: { tenantId, treasuryId, openingFloat, openedBy: userId ?? null, status: "OPEN" },
  });
}

/**
 * Closes a session: expectedCash = openingFloat + sum of COMPLETED CASH
 * sales in the session; variance = closingCash - expectedCash (over/short).
 */
export async function closeCashSession(
  tx: Tx,
  args: { tenantId: string; sessionId: string; closingCash: number; userId?: string },
) {
  const { tenantId, sessionId, closingCash, userId } = args;

  const session = await tx.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.tenantId !== tenantId) throw new Error("Cross-tenant cash session");
  if (session.status !== "OPEN") throw new Error("Session is not open");

  const cashSales = await tx.posSale.findMany({
    where: { tenantId, sessionId, status: "COMPLETED", paymentMethod: "CASH" },
    select: { total: true },
  });
  const cashTotal = r2(cashSales.reduce((s, sale) => s + Number(sale.total), 0));
  const expectedCash = r2(Number(session.openingFloat) + cashTotal);
  const variance = r2(closingCash - expectedCash);

  // updateMany, NOT update({ where: { id } }): CashSession is tenant-scoped and
  // a by-id update trips the workspace write-guard probe inside the transaction
  // (see createPostedJournalEntry). updateMany returns a count, so re-read the
  // row to preserve this fn's return contract; the findUnique guard uses the
  // current (transaction) query, not the base-client probe, so it's safe.
  await tx.cashSession.updateMany({
    where: { id: session.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: userId ?? null,
      closingCash,
      expectedCash,
      variance,
    },
  });
  return tx.cashSession.findUniqueOrThrow({ where: { id: session.id } });
}

// ── Sale ─────────────────────────────────────────────────────────────────

/**
 * Completes a checkout: validates the session is OPEN and stock is
 * sufficient, records one SOLD movement per line, posts the Treasury
 * debit / Sales Revenue credit for the tendered total, and creates the
 * PosSale + lines. Caller owns the transaction boundary.
 */
export async function completePosSale(
  tx: Tx,
  args: {
    tenantId: string;
    sessionId: string;
    lines: PosSaleLineInput[];
    paymentMethod: "CASH" | "CARD" | "TRANSFER";
    discountTotal?: number;
    taxTotal?: number;
    customerId?: string;
    userId?: string;
  },
): Promise<{ saleNumber: string; total: number }> {
  const { tenantId, sessionId, lines, paymentMethod, userId } = args;
  if (lines.length === 0) throw new Error("Sale has no lines");

  const session = await tx.cashSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { treasury: true },
  });
  if (session.tenantId !== tenantId) throw new Error("Cross-tenant cash session");
  if (session.status !== "OPEN") throw new Error("Cash session is not open");

  const products = await tx.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, tenantId },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product) throw new Error(`Product ${line.productId} not found`);
    if (product.quantity < line.quantity) {
      throw new Error(`Insufficient stock for ${product.name}: need ${line.quantity}, have ${product.quantity}`);
    }
  }

  const { subtotal, discountTotal, taxTotal, total } = computeSaleTotals({
    lines,
    discountTotal: args.discountTotal,
    taxTotal: args.taxTotal,
  });

  const saleNumber = await nextDocNumber(tx, tenantId, "POS_SALE", "POS-");
  const label = `POS sale ${saleNumber}`;

  const [revenueAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "4000", "Sales Revenue", "REVENUE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: label,
    reference: saleNumber,
    lines: {
      create: [
        { accountId: session.treasury.ledgerAccountId, debit: total, credit: 0, memo: label },
        { accountId: revenueAccount.id, debit: 0, credit: total, memo: label },
      ],
    },
  });

  await tx.posSale.create({
    data: {
      tenantId,
      saleNumber,
      sessionId,
      customerId: args.customerId ?? null,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      paymentMethod,
      status: "COMPLETED",
      journalEntryId: journalEntry.id,
      soldBy: userId ?? null,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: r2(l.quantity * l.unitPrice),
        })),
      },
    },
  });

  for (const line of lines) {
    await recordMovement(tx, {
      tenantId,
      productId: line.productId,
      type: "SOLD",
      delta: -line.quantity,
      reason: label,
      documentRef: saleNumber,
      userId: userId ?? null,
    });
    await recalcProductQuantity(tx, line.productId);
  }

  return { saleNumber, total };
}

/**
 * Voids a COMPLETED sale: reverses the JournalEntry (swap debit/credit)
 * and restocks each line via a positive SOLD-typed movement (delta > 0
 * so recalc invariant holds; the reason string makes the reversal legible
 * in the ledger). Cannot void a sale whose session already closed.
 */
export async function voidPosSale(
  tx: Tx,
  args: { tenantId: string; saleId: string; reason: string; userId?: string },
) {
  const { tenantId, saleId, reason, userId } = args;

  const sale = await tx.posSale.findUniqueOrThrow({
    where: { id: saleId },
    include: { lines: true, session: true },
  });
  if (sale.tenantId !== tenantId) throw new Error("Cross-tenant sale");
  if (sale.status !== "COMPLETED") throw new Error("Sale is not COMPLETED");
  if (sale.session.status !== "OPEN") throw new Error("Cannot void a sale in a closed session");

  const label = `Void ${sale.saleNumber}: ${reason}`;

  if (sale.journalEntryId) {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: sale.journalEntryId },
      include: { lines: true },
    });
    const period = await ensureOpenPeriod(tx, tenantId);
    await createPostedJournalEntry(tx, {
      tenantId,
      periodId: period.id,
      description: label,
      reference: sale.saleNumber,
      lines: {
        create: original.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.credit,
          credit: l.debit,
          memo: label,
        })),
      },
    });
  }

  for (const line of sale.lines) {
    await recordMovement(tx, {
      tenantId,
      productId: line.productId,
      type: "SOLD",
      delta: line.quantity,
      reason: label,
      documentRef: sale.saleNumber,
      userId: userId ?? null,
    });
    await recalcProductQuantity(tx, line.productId);
  }

  // updateMany, NOT update({ where: { id } }): PosSale is tenant-scoped and a
  // by-id update trips the workspace write-guard probe inside the transaction
  // (see createPostedJournalEntry).
  await tx.posSale.updateMany({
    where: { id: sale.id },
    data: { status: "VOID", voidedAt: new Date(), voidReason: reason },
  });
}
