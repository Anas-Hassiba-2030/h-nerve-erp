// AR/AP ageing engine (docs/HOURANI-ERP-GAPS.md — ranked #3 in the gap
// list: "who owes me money, who do I owe, and how overdue"). Pure —
// no DB/Prisma imports — so it's unit-testable and shared by both the
// receivables (Invoice) and payables (PurchaseInvoice) call sites,
// which pass the same row shape after their own Prisma includes.
//
// Bucketing is anchored on dueDate (falling back to issueDate when a
// document has none — an estimate-less on-account invoice, say), not
// issueDate always, because "overdue" is a due-date concept.

export type AgeingBucketKey = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";

export const AGEING_BUCKETS: { key: AgeingBucketKey; ar: string; en: string }[] = [
  { key: "current", ar: "غير مستحقة بعد", en: "Current" },
  { key: "d1_30", ar: "1-30 يوم", en: "1-30 days" },
  { key: "d31_60", ar: "31-60 يوم", en: "31-60 days" },
  { key: "d61_90", ar: "61-90 يوم", en: "61-90 days" },
  { key: "d90_plus", ar: "أكثر من 90 يوم", en: "90+ days" },
];

// Documents in these statuses never posted a real receivable/payable
// (DRAFT) or were voided (CANCELLED) — they carry no outstanding balance
// regardless of what `total` says, so they're excluded before bucketing.
const EXCLUDED_STATUSES = new Set(["DRAFT", "CANCELLED"]);

// Below this, a total/paid mismatch is float rounding, not a real balance.
const EPSILON = 0.005;

export interface AgeingDocInput {
  id: string;
  number: string;
  partyId: string;
  partyName: string;
  status: string;
  issueDate: Date;
  dueDate: Date | null;
  total: number;
  paid: number;
  currency: string;
}

export interface AgeingRow extends AgeingDocInput {
  outstanding: number;
  daysOverdue: number;
  bucket: AgeingBucketKey;
}

export interface AgeingPartyTotal {
  partyId: string;
  partyName: string;
  buckets: Record<AgeingBucketKey, number>;
  total: number;
}

export interface AgeingReport {
  rows: AgeingRow[];
  byParty: AgeingPartyTotal[];
  bucketTotals: Record<AgeingBucketKey, number>;
  grandTotal: number;
}

export function daysOverdue(dueDate: Date | null, issueDate: Date, asOf: Date): number {
  const base = dueDate ?? issueDate;
  const ms = asOf.getTime() - base.getTime();
  return Math.floor(ms / 86_400_000);
}

export function bucketFor(days: number): AgeingBucketKey {
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

function emptyBuckets(): Record<AgeingBucketKey, number> {
  return { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
}

export function buildAgeingReport(docs: AgeingDocInput[], asOf: Date): AgeingReport {
  const rows: AgeingRow[] = [];

  for (const doc of docs) {
    if (EXCLUDED_STATUSES.has(doc.status)) continue;
    const outstanding = Math.round((doc.total - doc.paid) * 100) / 100;
    if (outstanding <= EPSILON) continue; // fully paid (or overpaid — never negative-owed here)

    const days = daysOverdue(doc.dueDate, doc.issueDate, asOf);
    rows.push({ ...doc, outstanding, daysOverdue: days, bucket: bucketFor(days) });
  }

  const byPartyMap = new Map<string, AgeingPartyTotal>();
  const bucketTotals = emptyBuckets();
  let grandTotal = 0;

  for (const row of rows) {
    let party = byPartyMap.get(row.partyId);
    if (!party) {
      party = { partyId: row.partyId, partyName: row.partyName, buckets: emptyBuckets(), total: 0 };
      byPartyMap.set(row.partyId, party);
    }
    party.buckets[row.bucket] = Math.round((party.buckets[row.bucket] + row.outstanding) * 100) / 100;
    party.total = Math.round((party.total + row.outstanding) * 100) / 100;

    bucketTotals[row.bucket] = Math.round((bucketTotals[row.bucket] + row.outstanding) * 100) / 100;
    grandTotal = Math.round((grandTotal + row.outstanding) * 100) / 100;
  }

  const byParty = [...byPartyMap.values()].sort((a, b) => b.total - a.total);
  rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { rows, byParty, bucketTotals, grandTotal };
}
