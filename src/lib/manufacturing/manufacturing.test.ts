import { describe, it, expect } from "vitest";
import { rollupCost } from "./manufacturing";

describe("rollupCost", () => {
  it("sums material cost across components and runs", () => {
    const r = rollupCost({
      components: [
        { quantity: 2, unitCost: 5 },
        { quantity: 1, unitCost: 10 },
      ],
      laborCost: 0,
      overheadCost: 0,
      runs: 3,
      outputQty: 1,
    });
    expect(r.materialCost).toBe(60); // (2*5 + 1*10) * 3
    expect(r.totalCost).toBe(60);
    expect(r.outputUnits).toBe(3);
    expect(r.unitCost).toBe(20);
  });

  it("adds per-run labor and overhead", () => {
    const r = rollupCost({
      components: [{ quantity: 1, unitCost: 4 }],
      laborCost: 3,
      overheadCost: 2,
      runs: 2,
      outputQty: 1,
    });
    expect(r.laborCost).toBe(6);
    expect(r.overheadCost).toBe(4);
    expect(r.totalCost).toBe(18); // 8 material + 6 labor + 4 overhead
    expect(r.unitCost).toBe(9);
  });

  it("spreads cost across multi-unit output", () => {
    const r = rollupCost({
      components: [{ quantity: 10, unitCost: 1 }],
      laborCost: 5,
      overheadCost: 0,
      runs: 1,
      outputQty: 5,
    });
    expect(r.outputUnits).toBe(5);
    expect(r.unitCost).toBe(3); // 15 / 5
  });

  it("rounds unit cost to 2 decimals", () => {
    const r = rollupCost({
      components: [{ quantity: 1, unitCost: 10 }],
      laborCost: 0,
      overheadCost: 0,
      runs: 1,
      outputQty: 3,
    });
    expect(r.unitCost).toBe(3.33);
  });

  it("throws on zero output units", () => {
    expect(() =>
      rollupCost({ components: [], laborCost: 0, overheadCost: 0, runs: 0, outputQty: 1 }),
    ).toThrow(/zero output/);
  });
});
