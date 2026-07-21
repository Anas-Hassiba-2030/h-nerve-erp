// Master Production Schedule math (Odoo mrp.mps, translated) — pure
// functions only, unit-tested in mps.test.ts. The /admin/mps console +
// server actions do the DB work.
//
// Deliberately single-level: indirect demand nets in a component's
// SIBLING finished products' own MANUAL forecast (never a computed
// suggestion), so there is no recursion / circular netting across
// products. Odoo's own docs warn against running MPS and reorder rules
// on the same product — enforced at the action layer (saveMpsForecast /
// saveReorderRule reject each other), not here.

export type MpsPeriodRow = {
  period: string; // "YYYY-MM"
  /** Manually entered planner demand for this period, this product. */
  forecastedDemand: number;
  /** Indirect demand from sibling finished products' BOMs, precomputed
   * by explodeIndirectDemand and passed in — this function stays pure. */
  indirectDemand: number;
  safetyStockTarget: number;
  minToReplenish: number;
  maxToReplenish: number;
};

export type MpsPeriodResult = MpsPeriodRow & {
  totalDemand: number;
  openingStock: number;
  suggestedReplenishment: number;
  forecastedStock: number;
};

/**
 * Suggested replenishment for one period. Triggered when opening stock
 * cannot cover total demand + safety stock target; clamped to
 * [min, max] like a reorder rule, floor 0 (min itself may be 0).
 */
export function mpsSuggestedReplenishment(args: {
  totalDemand: number;
  safetyStockTarget: number;
  openingStock: number;
  minToReplenish: number;
  maxToReplenish: number;
}): number {
  const gap = args.totalDemand + args.safetyStockTarget - args.openingStock;
  if (gap <= 0) return 0;
  let qty = Math.max(gap, args.minToReplenish);
  // 0 = "no cap" (Odoo default); a real cap never clamps below min.
  if (args.maxToReplenish > 0) qty = Math.min(qty, Math.max(args.maxToReplenish, args.minToReplenish));
  return Math.max(0, qty);
}

/**
 * Rolls a product's periods forward in order: each period's opening
 * stock is the PRIOR period's forecasted ending stock (the signature
 * MPS behaviour — a shortfall or surplus carries into the next period).
 * `currentOnHand` seeds period 0's opening stock from the real ledger.
 */
export function rollForwardMps(rows: MpsPeriodRow[], currentOnHand: number): MpsPeriodResult[] {
  let opening = currentOnHand;
  const out: MpsPeriodResult[] = [];
  for (const row of rows) {
    const totalDemand = row.forecastedDemand + row.indirectDemand;
    const suggestedReplenishment = mpsSuggestedReplenishment({
      totalDemand,
      safetyStockTarget: row.safetyStockTarget,
      openingStock: opening,
      minToReplenish: row.minToReplenish,
      maxToReplenish: row.maxToReplenish,
    });
    const forecastedStock = opening + suggestedReplenishment - totalDemand;
    out.push({ ...row, totalDemand, openingStock: opening, suggestedReplenishment, forecastedStock });
    opening = forecastedStock;
  }
  return out;
}

export type BomComponentLine = { parentProductId: string; componentProductId: string; qtyPerUnit: number };
export type ParentDemand = { productId: string; period: string; forecastedDemand: number };

/**
 * Single-level BOM explosion: for one component product, sums
 * qtyPerUnit * forecastedDemand across every parent BOM that consumes
 * it, per period. Uses parents' MANUAL forecast only — never a parent's
 * own computed suggestedReplenishment — so this never recurses even if
 * the parent is itself a component somewhere else.
 */
export function explodeIndirectDemand(
  componentProductId: string,
  bomLines: BomComponentLine[],
  parentDemands: ParentDemand[],
): Map<string, number> {
  const parentQty = new Map<string, number>(); // parentProductId -> qtyPerUnit (sum if multiple BOMs)
  for (const line of bomLines) {
    if (line.componentProductId !== componentProductId) continue;
    parentQty.set(line.parentProductId, (parentQty.get(line.parentProductId) ?? 0) + line.qtyPerUnit);
  }
  const byPeriod = new Map<string, number>();
  if (parentQty.size === 0) return byPeriod;
  for (const d of parentDemands) {
    const qtyPerUnit = parentQty.get(d.productId);
    if (!qtyPerUnit || d.forecastedDemand <= 0) continue;
    byPeriod.set(d.period, (byPeriod.get(d.period) ?? 0) + qtyPerUnit * d.forecastedDemand);
  }
  return byPeriod;
}

/** Next N "YYYY-MM" period keys starting at `anchor` (inclusive). */
export function generatePeriods(anchor: Date, count: number): string[] {
  const out: string[] = [];
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
