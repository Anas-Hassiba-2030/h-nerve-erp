// lib/accounting.ts
//
// Phase 8 — double-entry accounting primitives. Pure, transaction-aware
// (every fn takes a Prisma.TransactionClient), no HTTP. ALL money math is
// Prisma.Decimal — never JS floats (spec "What NOT to do"). The spec's
// pseudocode balance check used `+` on numbers; that is deliberately NOT
// followed — Decimal throughout, per decision #8 + the stated principle.
//
// Invariants:
//  - A POSTED JournalEntry always has SUM(debits) == SUM(credits)
//    (checked before any write; throws otherwise — never persists an
//    unbalanced entry).
//  - Callers round each contributing line to 2dp (ROUND_HALF_EVEN) and
//    sum the already-rounded amounts, so both JE sides are built from
//    identical rounded numbers → exact balance. The 0.001 tolerance
//    here is defense-in-depth: if it ever fires, it's a real bug.
//  - getLedgerAccount fails LOUD (throws) if a code is missing — never
//    silently post to the wrong account. The CoA must be seeded for the
//    tenant before any JE-generating event (decision #6/#9).

import { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

// Prisma 6's Rust-free client no longer exposes the Prisma.Decimal.Value
// namespace type. This is the same accepted-input union (decimal.js Value).
type DecimalInput = string | number | Prisma.Decimal;

/** Standard Hourani CoA codes — single source of truth, imported by the
 *  seed script AND every wiring call so a code can never be transposed. */
export const ACCT = {
  INVENTORY: "1001",
  CASH: "1101",
  AR: "1201",
  AP: "2001",
  RETAINED_EARNINGS: "3001",
  REVENUE: "4001",
  COGS: "5001",
  INVENTORY_ADJUSTMENT: "5002",
} as const;

const D = (v: DecimalInput | null | undefined): Prisma.Decimal =>
  new Prisma.Decimal(v ?? 0);
const ZERO = new Prisma.Decimal(0);
// Defense-in-depth only; correctness comes from caller-side rounding.
const TOLERANCE = new Prisma.Decimal("0.001");

/** Round a money amount to 2dp, banker's rounding. Callers use this for
 *  each contributing line BEFORE summing into a JE line. */
export function money(v: DecimalInput): Prisma.Decimal {
  return new Prisma.Decimal(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
}

/**
 * Find-or-create the monthly FinancialPeriod for `date`. Lazy upsert —
 * the seed script does NOT pre-create periods. Idempotent.
 */
export async function getOrCreatePeriod(db: Db, tenantId: string, date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  return db.financialPeriod.upsert({
    where: { tenantId_year_month: { tenantId, year, month } },
    create: { tenantId, year, month },
    update: {},
  });
}

/**
 * Fetch a ledger account by (tenantId, code). Throws if absent — fail
 * loud, never post to a wrong/None account (decision #8).
 */
export async function getLedgerAccount(db: Db, tenantId: string, code: string) {
  const acct = await db.ledgerAccount.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (!acct) {
    throw new Error(
      `Ledger account ${code} not found for tenant ${tenantId} — seed the Chart of Accounts first`,
    );
  }
  return acct;
}

export type JournalLineInput = {
  accountCode: string;
  debit?: DecimalInput | null;
  credit?: DecimalInput | null;
  memo?: string | null;
};

/**
 * Validate balance, resolve accounts, create the JournalEntry + lines.
 *
 * - Both sides total 0 → returns `null` ("nothing to post"; caller
 *   needn't guard null-cost / WAC=0 cases).
 * - SUM(debits) ≠ SUM(credits) beyond TOLERANCE → throws, no write.
 * - Period CLOSED → throws (future-proofs Phase 11; all OPEN today).
 * - Any unknown accountCode → throws listing every missing code at once.
 * Default status POSTED with postedAt = now.
 */
export async function postJournalEntry(
  db: Db,
  input: {
    tenantId: string;
    description: string;
    reference?: string | null;
    /** Period is derived from this date (default: now). */
    date?: Date;
    status?: "DRAFT" | "POSTED";
    reversesId?: string | null;
    lines: JournalLineInput[];
  },
): Promise<{ id: string } | null> {
  const lines = input.lines ?? [];
  const totalDebits = lines.reduce((s, l) => s.plus(D(l.debit)), ZERO);
  const totalCredits = lines.reduce((s, l) => s.plus(D(l.credit)), ZERO);

  // Degenerate (e.g. PO line with no unitCost, or WAC=0): skip silently.
  if (totalDebits.isZero() && totalCredits.isZero()) return null;

  if (totalDebits.minus(totalCredits).abs().greaterThan(TOLERANCE)) {
    throw new Error(
      `Unbalanced journal entry: debits ${totalDebits.toString()} ≠ credits ${totalCredits.toString()}`,
    );
  }

  const period = await getOrCreatePeriod(
    db,
    input.tenantId,
    input.date ?? new Date(),
  );
  if (period.status === "CLOSED") {
    throw new Error(
      `Financial period ${period.year}-${String(period.month).padStart(2, "0")} is CLOSED — cannot post`,
    );
  }

  const codes = [...new Set(lines.map((l) => l.accountCode))];
  const accounts = await db.ledgerAccount.findMany({
    where: { tenantId: input.tenantId, code: { in: codes } },
    select: { id: true, code: true },
  });
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));
  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length) {
    throw new Error(
      `Ledger account(s) not found for tenant ${input.tenantId}: ${missing.join(", ")} — seed the Chart of Accounts first`,
    );
  }

  const status = input.status ?? "POSTED";
  const data = {
    tenantId: input.tenantId,
    periodId: period.id,
    description: input.description,
    reference: input.reference ?? null,
    reversesId: input.reversesId ?? null,
    lines: {
      create: lines.map((l) => ({
        accountId: byCode.get(l.accountCode)!,
        debit: D(l.debit),
        credit: D(l.credit),
        memo: l.memo ?? null,
      })),
    },
  };
  if (status === "POSTED") return createPostedJournalEntry(db, data);
  return db.journalEntry.create({
    data: { ...data, status, postedAt: null },
    select: { id: true },
  });
}

/**
 * D1-safe replacement for `journalEntry.create({ status: "POSTED", ... })`.
 *
 * Cloudflare D1 has no interactive transactions — `$transaction(callback)`
 * executes its statements WITHOUT atomicity, so a crash between the entry
 * INSERT and its line INSERTs could otherwise leave a partial POSTED entry
 * that silently corrupts every report built on JournalLine aggregates.
 *
 * Instead: write the entry (with its nested lines) as DRAFT first, then flip
 * it to POSTED with a single atomic UPDATE only after every line has landed.
 * Every ledger reader (admin/journal, admin/accounts, statements) counts only
 * status="POSTED" rows, so an interrupted write leaves an inert DRAFT orphan —
 * never a partial entry in the books. Costs one extra UPDATE per entry.
 */
export async function createPostedJournalEntry(
  db: Db,
  data: Omit<Prisma.JournalEntryUncheckedCreateInput, "status" | "postedAt">,
): Promise<{ id: string }> {
  const entry = await db.journalEntry.create({
    data: { ...data, status: "DRAFT", postedAt: null },
    select: { id: true },
  });
  await db.journalEntry.update({
    where: { id: entry.id },
    data: { status: "POSTED", postedAt: new Date() },
    select: { id: true },
  });
  return entry;
}

/**
 * Weighted-average unit cost = Σ(delta × unitCost) / Σ(delta) over
 * COSTED inflows only (IMPORT|RECEIVED, unitCost not null, not
 * soft-deleted). Perpetual moving average over all inflows ever (the
 * pool is NOT depleted on sale) — exactly the spec formula (decision
 * #5/#8); a deliberate simplification. Returns Decimal(0) when there is
 * no costed inflow (caller then skips the COGS side → no degenerate JE).
 */
export async function getWeightedAverageCost(
  db: Db,
  productId: string,
): Promise<Prisma.Decimal> {
  const moves = await db.inventoryMovement.findMany({
    where: {
      productId,
      deletedAt: null,
      type: { in: ["IMPORT", "RECEIVED"] },
      unitCost: { not: null },
    },
    select: { delta: true, unitCost: true },
  });
  let qty = ZERO;
  let value = ZERO;
  for (const m of moves) {
    const d = new Prisma.Decimal(m.delta);
    qty = qty.plus(d);
    value = value.plus(d.times(D(m.unitCost)));
  }
  if (qty.isZero()) return ZERO;
  return value.dividedBy(qty);
}

/**
 * Create a reversing entry: a new POSTED JE mirroring `journalEntryId`
 * with debit↔credit swapped, linked via reversesId. Balance is
 * preserved automatically (swapping keeps the two sums equal). Posts in
 * the CURRENT period (standard practice — you reverse in the open
 * period, not the original's). NOT auto-called anywhere this phase.
 */
export async function reverseJournalEntry(
  db: Db,
  journalEntryId: string,
  reason: string,
): Promise<{ id: string } | null> {
  const orig = await db.journalEntry.findUnique({
    where: { id: journalEntryId },
    include: { lines: { include: { account: { select: { code: true } } } } },
  });
  if (!orig) throw new Error(`journal entry ${journalEntryId} not found`);
  if (orig.reversesId) {
    throw new Error("cannot reverse a reversing entry");
  }
  return postJournalEntry(db, {
    tenantId: orig.tenantId,
    description: `Reversal of ${orig.reference ?? orig.id}: ${reason}`,
    reference: orig.reference,
    reversesId: orig.id,
    lines: orig.lines.map((l) => ({
      accountCode: l.account.code,
      // swap: original debit becomes a credit and vice-versa
      debit: D(l.credit),
      credit: D(l.debit),
      memo: l.memo,
    })),
  });
}
