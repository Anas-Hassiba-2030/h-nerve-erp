// Multi-currency + FX revaluation — docs/HOURANI-ERP-GAPS.md #4 🔴.
// JOD is the implicit base currency (never stored in ExchangeRate — always
// rate 1). Two responsibilities:
//   1. Rate-at-transaction stamping — postInvoiceFromComputed (invoicing.ts)
//      calls getRateForCurrency at issue time and posts the JOD-equivalent
//      to the ledger, storing the stamped rate on Invoice.fxRate.
//   2. Period-end revaluation — runFxRevaluation re-reads the CURRENT rate
//      for every open foreign-currency invoice, posts the JOD delta as an
//      FX Gain/Loss journal line, and advances Invoice.fxRate to the new
//      rate (so the next revaluation deltas from this one, not from issue).

import type { prisma as prismaType } from "@/lib/db/db";
import { createPostedJournalEntry } from "./accounting";
import { ensureLedgerAccount, ensureOpenPeriod } from "./invoicing";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure ──────────────────────────────────────────────────────────────

export interface RateRow {
  currency: string;
  rate: number;
  asOf: Date;
}

/** Most recent rate with asOf <= `on`, for `currency`. JOD is always 1. */
export function latestRateAsOf(rates: RateRow[], currency: string, on: Date): number {
  if (currency === "JOD") return 1;
  const candidates = rates
    .filter((r) => r.currency === currency && r.asOf.getTime() <= on.getTime())
    .sort((a, b) => b.asOf.getTime() - a.asOf.getTime());
  return candidates.length > 0 ? candidates[0].rate : 1;
}

export interface RevalInput {
  id: string;
  currency: string;
  total: number;
  fxRate: number;
}

export interface RevalLine {
  invoiceId: string;
  currency: string;
  jodBefore: number;
  jodAfter: number;
  gainLoss: number;
  newRate: number;
}

/**
 * For every non-JOD invoice, compares JOD value at its stamped fxRate vs
 * the current rate. Only returns lines with a nonzero delta (nothing to
 * post otherwise). gainLoss > 0 means the foreign currency strengthened
 * since the rate was stamped — the receivable is now worth MORE JOD (a
 * gain); < 0 means it weakened (a loss).
 */
export function revalueOpenInvoices(invoices: RevalInput[], currentRates: Map<string, number>): RevalLine[] {
  const out: RevalLine[] = [];
  for (const inv of invoices) {
    if (inv.currency === "JOD") continue;
    const newRate = currentRates.get(inv.currency);
    if (newRate === undefined) continue;
    const jodBefore = r2(inv.total * inv.fxRate);
    const jodAfter = r2(inv.total * newRate);
    const gainLoss = r2(jodAfter - jodBefore);
    if (gainLoss === 0) continue;
    out.push({ invoiceId: inv.id, currency: inv.currency, jodBefore, jodAfter, gainLoss, newRate });
  }
  return out;
}

// ── DB-touching ──────────────────────────────────────────────────────

/** Latest ExchangeRate row for `currency` with asOf <= `on`; 1 for JOD or
 *  when no rate has been entered yet (documented fallback — an invoice in
 *  an unrated currency posts at par until someone enters a rate). */
export async function getRateForCurrency(tx: Tx, tenantId: string, currency: string, on: Date): Promise<number> {
  if (currency === "JOD") return 1;
  const row = await tx.exchangeRate.findFirst({
    where: { tenantId, currency, asOf: { lte: on } },
    orderBy: { asOf: "desc" },
  });
  return row ? Number(row.rate) : 1;
}

export async function setExchangeRate(
  tx: Tx,
  args: { tenantId: string; currency: string; rate: number; asOf: Date },
) {
  return tx.exchangeRate.upsert({
    where: { tenantId_currency_asOf: { tenantId: args.tenantId, currency: args.currency, asOf: args.asOf } },
    create: args,
    update: { rate: args.rate },
  });
}

/**
 * Period-end revaluation. Finds every open (not DRAFT/CANCELLED, not fully
 * paid off in JOD terms — we revalue any invoice still carrying an AR
 * balance) foreign-currency invoice, posts the JOD gain/loss to a single
 * FX Gain/Loss account, and advances each invoice's fxRate baseline.
 */
export async function runFxRevaluation(
  tx: Tx,
  args: { tenantId: string; asOf?: Date },
): Promise<{ posted: number; totalGainLoss: number; lines: RevalLine[] }> {
  const asOf = args.asOf ?? new Date();
  const { tenantId } = args;

  const [invoices, rates] = await Promise.all([
    tx.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
        currency: { not: "JOD" },
        status: { notIn: ["DRAFT", "CANCELLED", "PAID"] },
      },
      select: { id: true, currency: true, total: true, fxRate: true },
    }),
    tx.exchangeRate.findMany({ where: { tenantId, asOf: { lte: asOf } } }),
  ]);
  if (invoices.length === 0) return { posted: 0, totalGainLoss: 0, lines: [] };

  const currencies = [...new Set(invoices.map((i) => i.currency))];
  const currentRates = new Map(
    currencies.map((c) => [c, latestRateAsOf(rates.map((r) => ({ ...r, rate: Number(r.rate) })), c, asOf)]),
  );

  const lines = revalueOpenInvoices(
    invoices.map((i) => ({ id: i.id, currency: i.currency, total: Number(i.total), fxRate: Number(i.fxRate) })),
    currentRates,
  );
  if (lines.length === 0) return { posted: 0, totalGainLoss: 0, lines: [] };

  const totalGainLoss = r2(lines.reduce((sum, l) => sum + l.gainLoss, 0));

  const [arAccount, fxAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "1100", "Accounts Receivable", "ASSET"),
    ensureLedgerAccount(tx, tenantId, "7900", "FX Gain / Loss", "REVENUE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const memo = `FX revaluation ${asOf.toISOString().slice(0, 10)}`;
  await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: memo,
    reference: memo,
    lines: {
      create:
        totalGainLoss >= 0
          ? [
              { accountId: arAccount.id, debit: totalGainLoss, credit: 0, memo },
              { accountId: fxAccount.id, debit: 0, credit: totalGainLoss, memo },
            ]
          : [
              { accountId: fxAccount.id, debit: -totalGainLoss, credit: 0, memo },
              { accountId: arAccount.id, debit: 0, credit: -totalGainLoss, memo },
            ],
    },
  });

  await Promise.all(
    lines.map((l) =>
      tx.invoice.updateMany({ where: { id: l.invoiceId }, data: { fxRate: l.newRate } }),
    ),
  );

  return { posted: lines.length, totalGainLoss, lines };
}
