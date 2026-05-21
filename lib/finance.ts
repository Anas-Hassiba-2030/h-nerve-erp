// lib/finance.ts — single source of truth for per-tenant financial
// roll-ups shown on multiple screens. Was duplicated inline:
//   /workspace command center used a 90d Transaction filter via
//   WorkspaceFinancials
//   /markets Hourani Group Equities used a 30d filter × 8 P/E proxy
// Two queries, slightly different windows, surfaced different JOD
// values for the same metric. Pitch killer if a CEO opens both.
// This module exports one helper. Both screens call it.
//
// CROSS-TENANT INTENT: callers pass the Company.id explicitly; we
// run via prismaUnscoped because /markets reads every company at
// once and /workspace passes the active company.

import { prismaUnscoped } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trailing-30-day REVENUE total for a given company, in JOD.
 * Source: Transaction rows where kind === "REVENUE" and occurredAt
 * is within the last 30 calendar days. Decimal precision matches
 * the Transaction.amount column (Float on Postgres).
 */
export async function getCompanyRevenue30d(companyId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const agg = await prismaUnscoped.transaction.aggregate({
    where: {
      companyId,
      kind: "REVENUE",
      occurredAt: { gte: since },
    },
    _sum: { amount: true },
  });
  return Math.round((agg._sum.amount ?? 0) * 100) / 100;
}

/**
 * Same as getCompanyRevenue30d but for many companies in one round-trip.
 * Returns a Map<companyId, revenue30d>. Used by /markets to render
 * the Hourani Equities grid without N+1 queries.
 */
export async function getCompanyRevenue30dMap(
  companyIds: string[],
): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map();
  const since = new Date(Date.now() - 30 * DAY_MS);
  const rows = await prismaUnscoped.transaction.groupBy({
    by: ["companyId"],
    where: {
      companyId: { in: companyIds },
      kind: "REVENUE",
      occurredAt: { gte: since },
    },
    _sum: { amount: true },
  });
  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.companyId, Math.round((r._sum.amount ?? 0) * 100) / 100);
  }
  // Fill zeros for companies with no qualifying transactions so the
  // caller can iterate without null checks.
  for (const id of companyIds) {
    if (!out.has(id)) out.set(id, 0);
  }
  return out;
}

/**
 * P/E proxy valuation: trailing 30d revenue × 8 (annualization is
 * baked into the multiplier). Used by /markets Hourani Equities
 * cards. Returns 0 if revenue is 0.
 */
export function notionalValuationFromRevenue30d(revenue30d: number): number {
  return Math.round(revenue30d * 8);
}
