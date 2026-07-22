// Lot / batch traceability — the pure core (Odoo `stock.lot` + the FEFO
// removal strategy, translated). No Prisma, no I/O: every function here takes
// plain rows and returns plain results so the rules are unit-testable and the
// DB layer stays a thin caller. See prisma/schema/lots.prisma for the shape.
//
// FEFO = First-Expired-First-Out. For perishables this is the ONLY correct
// removal strategy: FIFO ships the oldest *received* stock, which for a
// warehouse that receives out of order means shipping something that outlives
// what is quietly rotting behind it.

/** The subset of a StockLot row the pure engine needs. */
export type LotRow = {
  id: string;
  lotNumber: string;
  /** null = tracked but non-perishable. */
  expiryDate: Date | null;
  quantity: number;
  /** ACTIVE | QUARANTINE | EXPIRED | CONSUMED */
  status: string;
};

/** One line of a FEFO allocation: take `qty` from `lotId`. */
export type Allocation = {
  lotId: string;
  lotNumber: string;
  qty: number;
  expiryDate: Date | null;
};

export type AllocationResult = {
  lines: Allocation[];
  /** Demand that could NOT be covered by allocatable lots. 0 = fully covered. */
  shortfall: number;
};

/** Only ACTIVE lots with stock left may be shipped or consumed. */
export function isAllocatable(lot: LotRow): boolean {
  return lot.status === "ACTIVE" && lot.quantity > 0;
}

/**
 * FEFO ordering: soonest expiry first; a lot with NO expiry sorts last (it
 * never spoils, so it is always the last thing you should ship). Ties break on
 * lotNumber so the order is deterministic — an allocation that reshuffles
 * between two identical calls is impossible to audit.
 */
export function sortFefo(lots: LotRow[]): LotRow[] {
  return [...lots].sort((a, b) => {
    const ax = a.expiryDate ? a.expiryDate.getTime() : Number.POSITIVE_INFINITY;
    const bx = b.expiryDate ? b.expiryDate.getTime() : Number.POSITIVE_INFINITY;
    if (ax !== bx) return ax - bx;
    return a.lotNumber.localeCompare(b.lotNumber);
  });
}

/**
 * Allocate `demand` units across `lots` using FEFO.
 *
 * Returns a shortfall rather than throwing: a partial pick is a real business
 * situation (ship what you have, backorder the rest), and the caller — not this
 * function — decides whether to accept it.
 */
export function allocateFefo(lots: LotRow[], demand: number): AllocationResult {
  const want = Math.max(0, Math.floor(demand));
  if (want === 0) return { lines: [], shortfall: 0 };

  const lines: Allocation[] = [];
  let remaining = want;

  for (const lot of sortFefo(lots.filter(isAllocatable))) {
    if (remaining === 0) break;
    const take = Math.min(remaining, lot.quantity);
    if (take <= 0) continue;
    lines.push({ lotId: lot.id, lotNumber: lot.lotNumber, qty: take, expiryDate: lot.expiryDate });
    remaining -= take;
  }

  return { lines, shortfall: remaining };
}

/**
 * Shelf-life status for one lot at a given moment.
 *
 * EXPIRED is inclusive of the expiry date having PASSED, not of the expiry day
 * itself — food dated 21 July is saleable throughout 21 July. Callers pass the
 * clock in (`now`) so the result is deterministic in tests and honours the
 * app's Time Machine cursor rather than reading a hidden global.
 */
export type ExpiryState = "OK" | "EXPIRING" | "EXPIRED" | "NO_EXPIRY";

export function expiryState(
  lot: Pick<LotRow, "expiryDate">,
  now: Date,
  warnWithinDays = 14,
): ExpiryState {
  if (!lot.expiryDate) return "NO_EXPIRY";
  const days = daysUntilExpiry(lot, now);
  if (days === null) return "NO_EXPIRY";
  if (days < 0) return "EXPIRED";
  if (days <= warnWithinDays) return "EXPIRING";
  return "OK";
}

/** Whole days from `now` to expiry. Negative = already expired. */
export function daysUntilExpiry(lot: Pick<LotRow, "expiryDate">, now: Date): number | null {
  if (!lot.expiryDate) return null;
  const MS_PER_DAY = 86_400_000;
  // Compare calendar DAYS in UTC, not raw millisecond deltas: a lot expiring
  // "today at 00:00" evaluated at 14:00 must read as 0 days left, not -1.
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const b = Date.UTC(
    lot.expiryDate.getUTCFullYear(),
    lot.expiryDate.getUTCMonth(),
    lot.expiryDate.getUTCDate(),
  );
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Default expiry for a newly received/produced lot, from the product's shelf
 * life. Null shelf life = the operator must supply the date themselves; we do
 * NOT invent one, because a wrong expiry on food is worse than a blank field.
 */
export function defaultExpiry(producedAt: Date, shelfLifeDays: number | null | undefined): Date | null {
  if (shelfLifeDays == null || shelfLifeDays <= 0) return null;
  return new Date(producedAt.getTime() + shelfLifeDays * 86_400_000);
}

/**
 * Split a set of lots into the buckets an expiry dashboard renders. Lots that
 * are already CONSUMED or empty are dropped — they cannot cause a loss.
 */
export function bucketByExpiry(
  lots: LotRow[],
  now: Date,
  warnWithinDays = 14,
): { expired: LotRow[]; expiring: LotRow[]; ok: LotRow[] } {
  const expired: LotRow[] = [];
  const expiring: LotRow[] = [];
  const ok: LotRow[] = [];
  for (const lot of lots) {
    if (lot.quantity <= 0 || lot.status === "CONSUMED") continue;
    switch (expiryState(lot, now, warnWithinDays)) {
      case "EXPIRED":
        expired.push(lot);
        break;
      case "EXPIRING":
        expiring.push(lot);
        break;
      default:
        ok.push(lot);
    }
  }
  return {
    expired: sortFefo(expired),
    expiring: sortFefo(expiring),
    ok: sortFefo(ok),
  };
}

/**
 * Value at risk: the money sitting in stock that will spoil within the warning
 * window if nothing is done. This is the number that makes expiry a board-level
 * metric rather than a warehouse chore.
 */
export function valueAtRisk(
  lots: LotRow[],
  unitCost: number,
  now: Date,
  warnWithinDays = 14,
): { expiredValue: number; expiringValue: number } {
  const { expired, expiring } = bucketByExpiry(lots, now, warnWithinDays);
  const sum = (rows: LotRow[]) => rows.reduce((t, l) => t + l.quantity, 0) * Math.max(0, unitCost);
  return { expiredValue: sum(expired), expiringValue: sum(expiring) };
}

/**
 * Apply an allocation to lot rows, returning the NEW quantities and statuses.
 * Pure — the caller persists the result. A lot drained to zero flips to
 * CONSUMED so it drops out of every allocatable query without being deleted
 * (the movements referencing it must stay readable).
 */
export function applyAllocation(
  lots: LotRow[],
  result: AllocationResult,
): Array<{ id: string; quantity: number; status: string }> {
  const taken = new Map(result.lines.map((l) => [l.lotId, l.qty]));
  const out: Array<{ id: string; quantity: number; status: string }> = [];
  for (const lot of lots) {
    const take = taken.get(lot.id);
    if (!take) continue;
    const quantity = Math.max(0, lot.quantity - take);
    out.push({ id: lot.id, quantity, status: quantity === 0 ? "CONSUMED" : lot.status });
  }
  return out;
}
