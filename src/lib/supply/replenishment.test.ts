import { describe, it, expect } from "vitest";
import { suggestOrderQty, groupNeedsBySupplier } from "./replenishment";

describe("suggestOrderQty", () => {
  it("suggests nothing when on-hand is at or above min", () => {
    expect(suggestOrderQty({ onHand: 10, minQty: 10, maxQty: 50, qtyMultiple: 1 })).toBe(0);
    expect(suggestOrderQty({ onHand: 60, minQty: 10, maxQty: 50, qtyMultiple: 1 })).toBe(0);
  });

  it("orders back up to max when triggered", () => {
    expect(suggestOrderQty({ onHand: 4, minQty: 10, maxQty: 50, qtyMultiple: 1 })).toBe(46);
  });

  it("snaps down to the multiple while staying under max (Odoo)", () => {
    // need = 46, multiple 12 → 3×12 = 36 (≤ max)
    expect(suggestOrderQty({ onHand: 4, minQty: 10, maxQty: 50, qtyMultiple: 12 })).toBe(36);
  });

  it("orders one multiple when the gap is smaller than a multiple", () => {
    // need = 6 < multiple 12 → still order 12, never 0 on a triggered rule
    expect(suggestOrderQty({ onHand: 4, minQty: 5, maxQty: 10, qtyMultiple: 12 })).toBe(12);
  });

  it("handles negative on-hand (driven below zero)", () => {
    expect(suggestOrderQty({ onHand: -5, minQty: 10, maxQty: 50, qtyMultiple: 1 })).toBe(55);
  });

  it("treats a sub-1 multiple as 1", () => {
    expect(suggestOrderQty({ onHand: 0, minQty: 5, maxQty: 20, qtyMultiple: 0 })).toBe(20);
  });
});

describe("groupNeedsBySupplier", () => {
  it("groups lines into one draft per supplier", () => {
    const { drafts, unassigned } = groupNeedsBySupplier([
      { productId: "p1", supplierId: "s1", orderQty: 10 },
      { productId: "p2", supplierId: "s1", orderQty: 5 },
      { productId: "p3", supplierId: "s2", orderQty: 7 },
    ]);
    expect(drafts).toHaveLength(2);
    expect(drafts.find((d) => d.supplierId === "s1")?.lines).toHaveLength(2);
    expect(unassigned).toHaveLength(0);
  });

  it("surfaces supplier-less needs instead of dropping them", () => {
    const { drafts, unassigned } = groupNeedsBySupplier([
      { productId: "p1", supplierId: null, orderQty: 10 },
    ]);
    expect(drafts).toHaveLength(0);
    expect(unassigned).toHaveLength(1);
  });

  it("skips zero-quantity needs", () => {
    const { drafts, unassigned } = groupNeedsBySupplier([
      { productId: "p1", supplierId: "s1", orderQty: 0 },
    ]);
    expect(drafts).toHaveLength(0);
    expect(unassigned).toHaveLength(0);
  });
});
