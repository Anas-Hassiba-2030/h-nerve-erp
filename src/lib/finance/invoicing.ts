// Shared invoicing core (Phase 27 — docs/spec/ENTITY-ENGINE-PATTERN.md).
// Used by both invoices/actions.ts (direct invoice creation) and
// estimates/actions.ts (convertToInvoice) so the two call sites can't drift
// on tax computation or journal-posting logic. Posts into the EXISTING
// double-entry engine (LedgerAccount/JournalEntry/JournalLine/FinancialPeriod
// in finance.prisma) — does not duplicate it.

import { z } from "zod";
import type { prisma as prismaType } from "@/lib/db/db";
import { createPostedJournalEntry } from "./accounting";

export const lineInputSchema = z.object({
  productId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRateId: z.string().trim().optional().or(z.literal("")),
});
export type LineInput = z.infer<typeof lineInputSchema>;

// The interactive-transaction client (Prisma.TransactionClient) has the
// same model delegates as PrismaClient minus $transaction/$connect/etc. —
// callers pass their `tx` here typed loosely to avoid fighting that.
type Tx = typeof prismaType;

export async function computeLineTotals(tx: Tx, tenantId: string, lines: LineInput[]) {
  const gross = lines.map((l) => ({
    ...l,
    lineTotal: Math.round(l.quantity * l.unitPrice * 100) / 100,
  }));
  const subtotal = Math.round(gross.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;

  const taxRateIds = [...new Set(gross.map((l) => l.taxRateId).filter(Boolean))] as string[];
  const taxRates = taxRateIds.length
    ? await tx.taxRate.findMany({ where: { id: { in: taxRateIds }, tenantId } })
    : [];
  const rateById = new Map(taxRates.map((r) => [r.id, Number(r.rate)]));

  const linesWithTax = gross.map((l) => {
    const rate = l.taxRateId ? (rateById.get(l.taxRateId) ?? 0) : 0;
    const tax = Math.round(l.lineTotal * rate * 100) / 100;
    return { ...l, tax };
  });
  const taxTotal = Math.round(linesWithTax.reduce((sum, l) => sum + l.tax, 0) * 100) / 100;
  const total = Math.round((subtotal + taxTotal) * 100) / 100;

  return { linesWithTax, subtotal, taxTotal, total };
}

// Accounts are bootstrapped on first use so invoicing works without a
// manual chart-of-accounts setup step (Daftra: "No Need to Be an
// Accountant"). tenantId is passed explicitly — the upsert's compound
// unique key is not the by-id path the $use middleware auto-stamps.
export async function ensureLedgerAccount(tx: Tx, tenantId: string, code: string, name: string, type: string) {
  return tx.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId, code } },
    create: { tenantId, code, name, type },
    update: {},
  });
}

export async function ensureOpenPeriod(tx: Tx, tenantId: string) {
  const now = new Date();
  return tx.financialPeriod.upsert({
    where: {
      tenantId_year_month: { tenantId, year: now.getFullYear(), month: now.getMonth() + 1 },
    },
    create: { tenantId, year: now.getFullYear(), month: now.getMonth() + 1, status: "OPEN" },
    update: {},
  });
}

export async function nextDocNumber(
  tx: Tx,
  tenantId: string,
  docType: string,
  defaultPrefix: string,
): Promise<string> {
  const scheme = await tx.numberingScheme.upsert({
    where: { tenantId_docType: { tenantId, docType } },
    create: { tenantId, docType, prefix: defaultPrefix, nextValue: 1, padTo: 6 },
    update: {},
  });
  // updateMany, NOT update({ where: { id } }): NumberingScheme is tenant-scoped,
  // and a by-id `update` on the scoped client trips the workspace write-guard
  // probe (a base-client findUnique) which can't see this row's just-written
  // state inside the caller's $transaction → "Cross-tenant write blocked",
  // failing EVERY ERP create (nextDocNumber runs on all of them). updateMany is
  // where-clause-stamped by the same hook, no probe. See createPostedJournalEntry.
  await tx.numberingScheme.updateMany({
    where: { id: scheme.id },
    data: { nextValue: { increment: 1 } },
  });
  return `${scheme.prefix}${String(scheme.nextValue).padStart(scheme.padTo, "0")}`;
}

type Computed = Awaited<ReturnType<typeof computeLineTotals>>;

// Posts an Invoice + its JournalEntry (AR debit / Revenue credit) from
// already-computed line totals. Shared by createInvoice and
// estimates' convertToInvoice.
export async function postInvoiceFromComputed(
  tx: Tx,
  args: {
    tenantId: string;
    customerId: string;
    currency: string;
    issueDate?: Date;
    dueDate?: Date | null;
    note?: string | null;
    computed: Computed;
  },
) {
  const { tenantId, customerId, currency, note, computed } = args;
  const invoiceNumber = await nextDocNumber(tx, tenantId, "INVOICE", "INV-");
  const [arAccount, revenueAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "1100", "Accounts Receivable", "ASSET"),
    ensureLedgerAccount(tx, tenantId, "4000", "Sales Revenue", "REVENUE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: `Invoice ${invoiceNumber}`,
    reference: invoiceNumber,
    lines: {
      create: [
        { accountId: arAccount.id, debit: computed.total, credit: 0, memo: invoiceNumber },
        { accountId: revenueAccount.id, debit: 0, credit: computed.total, memo: invoiceNumber },
      ],
    },
  });

  return tx.invoice.create({
    data: {
      tenantId,
      invoiceNumber,
      customerId,
      status: "UNPAID",
      issueDate: args.issueDate ?? new Date(),
      dueDate: args.dueDate ?? null,
      currency,
      subtotal: computed.subtotal,
      taxTotal: computed.taxTotal,
      total: computed.total,
      note: note || null,
      journalEntryId: journalEntry.id,
      lines: {
        create: computed.linesWithTax.map((l) => ({
          productId: l.productId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRateId: l.taxRateId || null,
          lineTotal: l.lineTotal + l.tax,
        })),
      },
    },
  });
}

// ── Payments / Treasury (hnerve-gap-map.md "Payments" row) ──────────────

export async function getInvoicePaidTotal(tx: Tx, invoiceId: string): Promise<number> {
  const agg = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  return Number(agg._sum.amount ?? 0);
}

export function statusForPaid(total: number, paid: number): string {
  if (paid <= 0) return "UNPAID";
  if (paid < total) return "PARTIAL";
  if (paid === total) return "PAID";
  return "OVERPAID";
}

// Posts a Payment + its JournalEntry (Treasury debit / AR credit). Payments
// are deliberately immutable once created (decision #2 on JournalEntry) —
// no update/delete action exists; a mistaken payment needs a reversing
// entry, not an edit.
export async function postPayment(
  tx: Tx,
  args: {
    tenantId: string;
    customerId: string;
    invoiceId?: string | null;
    treasuryId: string;
    amount: number;
    currency: string;
    method: string;
    paidAt?: Date;
    note?: string | null;
  },
) {
  const { tenantId, customerId, invoiceId, treasuryId, amount, currency, method, note } = args;
  const treasury = await tx.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
  if (treasury.tenantId !== tenantId) throw new Error("Cross-tenant treasury");

  const paymentNumber = await nextDocNumber(tx, tenantId, "PAYMENT", "PAY-");
  const [arAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "1100", "Accounts Receivable", "ASSET"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: `Payment ${paymentNumber}`,
    reference: paymentNumber,
    lines: {
      create: [
        { accountId: treasury.ledgerAccountId, debit: amount, credit: 0, memo: paymentNumber },
        { accountId: arAccount.id, debit: 0, credit: amount, memo: paymentNumber },
      ],
    },
  });

  return tx.payment.create({
    data: {
      tenantId,
      paymentNumber,
      customerId,
      invoiceId: invoiceId || null,
      treasuryId,
      amount,
      currency,
      method,
      paidAt: args.paidAt ?? new Date(),
      note: note || null,
      journalEntryId: journalEntry.id,
    },
  });
}
