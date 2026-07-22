// Recurring invoices — docs/HOURANI-ERP-GAPS.md #11 ⚪. Monthly only (see
// prisma/schema/recurring.prisma's header for why no frequency selector).
// Date math (computeNextRunDate/dueTemplates) is pure, no DB imports.
// runDueRecurringInvoices below is the tx-taking poster — same pattern as
// lib/inventory/landedCost.ts's allocate+post split — called from both
// the manual "run now" action and the cron route so there's exactly one
// code path that turns a due template into a real Invoice.

/** Clamp to 1-28 so every month legitimately has that day. */
export function clampDayOfMonth(day: number): number {
  return Math.min(28, Math.max(1, Math.trunc(day)));
}

/**
 * The next occurrence of `dayOfMonth` strictly AFTER `from`. If `from`'s
 * own day-of-month hasn't been reached yet this month, that's the answer;
 * otherwise roll to next month. Used both to seed a template's initial
 * nextRunDate and to advance it after each run.
 */
export function computeNextRunDate(from: Date, dayOfMonth: number): Date {
  const day = clampDayOfMonth(dayOfMonth);
  const candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), day));
  if (candidate.getTime() > from.getTime()) return candidate;
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, day));
}

export interface DueTemplateInput {
  id: string;
  nextRunDate: Date;
  active: boolean;
}

/** Active templates whose nextRunDate has arrived (<= asOf). */
export function dueTemplates<T extends DueTemplateInput>(templates: T[], asOf: Date): T[] {
  return templates.filter((t) => t.active && t.nextRunDate.getTime() <= asOf.getTime());
}

// ── DB posting ───────────────────────────────────────────────────────────

import type { prisma as prismaType } from "@/lib/db/db";
import { computeLineTotals, postInvoiceFromComputed } from "@/lib/finance/invoicing";

type Tx = typeof prismaType;

/**
 * Finds every active, due RecurringInvoiceTemplate for `tenantId`, posts
 * a real Invoice for each (through the SAME postInvoiceFromComputed every
 * other invoice uses — AR debit / Revenue credit), then advances
 * nextRunDate and stamps lastRunAt. Returns how many were posted.
 */
export async function runDueRecurringInvoices(
  tx: Tx,
  args: { tenantId: string; asOf?: Date },
): Promise<{ posted: number; invoiceIds: string[] }> {
  const asOf = args.asOf ?? new Date();
  const templates = await tx.recurringInvoiceTemplate.findMany({
    where: { tenantId: args.tenantId, active: true, deletedAt: null, nextRunDate: { lte: asOf } },
  });
  const due = dueTemplates(templates, asOf);

  const invoiceIds: string[] = [];
  for (const t of due) {
    // Advance nextRunDate BEFORE posting: D1 $transaction callbacks run
    // without atomicity, so a crash mid-loop must fail toward under-billing
    // (this template just waits for the next manual run) rather than
    // double-billing (re-posting an invoice that already went out).
    await tx.recurringInvoiceTemplate.update({
      where: { id: t.id },
      data: { nextRunDate: computeNextRunDate(asOf, t.dayOfMonth), lastRunAt: asOf },
    });
    const computed = await computeLineTotals(tx, args.tenantId, [
      {
        description: t.description,
        quantity: 1,
        unitPrice: Number(t.amount),
      },
    ]);
    const invoice = await postInvoiceFromComputed(tx, {
      tenantId: args.tenantId,
      customerId: t.customerId,
      currency: t.currency,
      issueDate: asOf,
      note: `Recurring: ${t.description}`,
      computed,
    });
    invoiceIds.push(invoice.id);

    await tx.recurringInvoiceTemplate.update({
      where: { id: t.id },
      data: { nextRunDate: computeNextRunDate(asOf, t.dayOfMonth), lastRunAt: asOf },
    });
  }
  return { posted: due.length, invoiceIds };
}
