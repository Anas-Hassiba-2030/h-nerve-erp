import { describe, it, expect } from "vitest";
import { computeSaleTotals } from "./pos";

describe("computeSaleTotals", () => {
  it("sums line totals for subtotal", () => {
    const r = computeSaleTotals({
      lines: [
        { productId: "a", quantity: 2, unitPrice: 5 },
        { productId: "b", quantity: 3, unitPrice: 1.5 },
      ],
    });
    expect(r.subtotal).toBe(14.5);
    expect(r.total).toBe(14.5);
  });

  it("applies discount then tax to reach total", () => {
    const r = computeSaleTotals({
      lines: [{ productId: "a", quantity: 1, unitPrice: 100 }],
      discountTotal: 10,
      taxTotal: 4.5,
    });
    expect(r.total).toBe(94.5);
  });

  it("rounds fractional cents", () => {
    const r = computeSaleTotals({
      lines: [{ productId: "a", quantity: 3, unitPrice: 3.333 }],
    });
    expect(r.subtotal).toBe(10);
  });

  it("throws on a negative total", () => {
    expect(() =>
      computeSaleTotals({
        lines: [{ productId: "a", quantity: 1, unitPrice: 10 }],
        discountTotal: 50,
      }),
    ).toThrow(/negative/);
  });
});
