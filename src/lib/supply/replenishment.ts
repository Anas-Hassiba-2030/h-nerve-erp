// Replenishment math (Odoo stock.warehouse.orderpoint, translated) —
// pure functions only, unit-tested in replenishment.test.ts. The
// /admin/replenishment console + server actions do the DB work.

export type ReorderInput = {
  onHand: number;
  minQty: number;
  maxQty: number;
  /** Pack/pallet size the order snaps to; ≥ 1. */
  qtyMultiple: number;
};

/**
 * Suggested order quantity for one product. Not triggered (on-hand at or
 * above min) → 0. Triggered → order back up to max, rounded DOWN to the
 * multiple (Odoo semantics: stay ≤ max); when the gap is smaller than
 * one multiple, order a single multiple anyway — a triggered rule must
 * never suggest zero, or the product would sit below min forever.
 */
export function suggestOrderQty(input: ReorderInput): number {
  const { onHand, minQty, maxQty } = input;
  const multiple = Math.max(1, Math.floor(input.qtyMultiple));
  if (onHand >= minQty) return 0;
  const need = Math.max(0, maxQty - onHand);
  const snapped = Math.floor(need / multiple) * multiple;
  return snapped > 0 ? snapped : multiple;
}

export type NeedLine = {
  productId: string;
  supplierId: string | null;
  orderQty: number;
};

export type SupplierDraft = { supplierId: string; lines: { productId: string; quantity: number }[] };

/**
 * Groups triggered needs into one draft-PO batch per supplier (Odoo
 * groups replenishment RFQs by vendor). Needs without a supplier are
 * returned separately — the console surfaces them as "assign a supplier
 * first" instead of silently dropping them.
 */
export function groupNeedsBySupplier(needs: NeedLine[]): {
  drafts: SupplierDraft[];
  unassigned: NeedLine[];
} {
  const bySupplier = new Map<string, SupplierDraft>();
  const unassigned: NeedLine[] = [];
  for (const n of needs) {
    if (n.orderQty <= 0) continue;
    if (!n.supplierId) {
      unassigned.push(n);
      continue;
    }
    const cur = bySupplier.get(n.supplierId) ?? { supplierId: n.supplierId, lines: [] };
    cur.lines.push({ productId: n.productId, quantity: n.orderQty });
    bySupplier.set(n.supplierId, cur);
  }
  return { drafts: [...bySupplier.values()], unassigned };
}
