// Landed cost allocation — docs/HOURANI-ERP-GAPS.md #8 🟠. Pure — no DB
// imports. Spreads one lump sum (freight/customs/clearing) across a
// receipt's lines, proportionally by value or by quantity. Every
// allocated amount is rounded to 2dp and the rounding remainder is
// folded into the LARGEST line so the allocated total always equals
// the input exactly — a landed-cost run that doesn't foot to the invoice
// is worse than not having one.

export type AllocationMethod = "BY_VALUE" | "BY_QUANTITY";

export interface AllocationInput {
  movementId: string;
  productId: string;
  quantity: number;
  /** quantity × unit cost at receipt — the basis for BY_VALUE allocation. */
  baseValue: number;
}

export interface AllocationResult {
  movementId: string;
  productId: string;
  allocatedAmount: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function allocateLandedCost(
  lines: AllocationInput[],
  totalAmount: number,
  method: AllocationMethod = "BY_VALUE",
): AllocationResult[] {
  if (lines.length === 0 || totalAmount <= 0) return [];

  // BY_VALUE with an all-zero value basis (e.g. unitCost never recorded)
  // can't proportion anything — fall back to BY_QUANTITY rather than
  // silently allocating 0 to everyone.
  const totalValue = lines.reduce((s, l) => s + l.baseValue, 0);
  const useQuantity = method === "BY_QUANTITY" || totalValue <= 0;
  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  if (useQuantity && totalQuantity <= 0) return [];

  const weights = lines.map((l) => (useQuantity ? l.quantity / totalQuantity : l.baseValue / totalValue));
  const rounded = weights.map((w) => r2(totalAmount * w));

  // Distribute the rounding remainder onto the single largest line so
  // SUM(allocated) === totalAmount exactly, not off by a cent.
  const remainder = r2(totalAmount - rounded.reduce((s, v) => s + v, 0));
  if (remainder !== 0) {
    let largestIdx = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[largestIdx]) largestIdx = i;
    }
    rounded[largestIdx] = r2(rounded[largestIdx] + remainder);
  }

  return lines.map((l, i) => ({ movementId: l.movementId, productId: l.productId, allocatedAmount: rounded[i] }));
}
