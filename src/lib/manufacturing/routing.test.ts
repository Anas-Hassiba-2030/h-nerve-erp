import { describe, it, expect } from "vitest";
import {
  plannedWorkOrderMinutes,
  workOrderLaborCost,
  allocateByproductCost,
  workOrdersComplete,
  routingLaborTotal,
} from "./routing";
import { rollupCost } from "./manufacturing";

describe("plannedWorkOrderMinutes", () => {
  it("scales duration by runs at 100% efficiency", () => {
    expect(
      plannedWorkOrderMinutes({ durationMinutes: 30, runs: 4, efficiency: 100 }),
    ).toBe(120);
  });

  it("halves speed at 50% efficiency (Odoo time_efficiency)", () => {
    expect(
      plannedWorkOrderMinutes({ durationMinutes: 30, runs: 1, efficiency: 50 }),
    ).toBe(60);
  });

  it("adds setup and cleanup flat, not per run", () => {
    expect(
      plannedWorkOrderMinutes({
        durationMinutes: 10,
        runs: 3,
        efficiency: 100,
        setupMinutes: 15,
        cleanupMinutes: 5,
      }),
    ).toBe(50); // 15 + 5 + 30
  });

  it("throws on non-positive efficiency", () => {
    expect(() =>
      plannedWorkOrderMinutes({ durationMinutes: 10, runs: 1, efficiency: 0 }),
    ).toThrow(/efficiency/);
  });
});

describe("workOrderLaborCost", () => {
  it("charges minutes at the hourly rate", () => {
    expect(workOrderLaborCost({ minutes: 90, costPerHour: 12 })).toBe(18);
  });

  it("rounds to 2 decimals", () => {
    expect(workOrderLaborCost({ minutes: 50, costPerHour: 10 })).toBe(8.33);
  });
});

describe("allocateByproductCost", () => {
  it("gives the main output everything when there are no byproducts", () => {
    const a = allocateByproductCost({ totalCost: 100, outputUnits: 4, runs: 1, byproducts: [] });
    expect(a.main).toEqual({ cost: 100, unitCost: 25 });
    expect(a.byproducts).toEqual([]);
  });

  it("splits cost by share % and scales byproduct units by runs", () => {
    const a = allocateByproductCost({
      totalCost: 200,
      outputUnits: 10,
      runs: 2,
      byproducts: [{ quantity: 5, costSharePercent: 10 }],
    });
    expect(a.byproducts[0]).toEqual({ units: 10, cost: 20, unitCost: 2 });
    expect(a.main).toEqual({ cost: 180, unitCost: 18 });
  });

  it("zero-share byproducts enter stock at zero cost", () => {
    const a = allocateByproductCost({
      totalCost: 50,
      outputUnits: 1,
      runs: 1,
      byproducts: [{ quantity: 3, costSharePercent: 0 }],
    });
    expect(a.byproducts[0]).toEqual({ units: 3, cost: 0, unitCost: 0 });
    expect(a.main.cost).toBe(50);
  });

  it("throws when shares exceed 100%", () => {
    expect(() =>
      allocateByproductCost({
        totalCost: 10,
        outputUnits: 1,
        runs: 1,
        byproducts: [
          { quantity: 1, costSharePercent: 60 },
          { quantity: 1, costSharePercent: 50 },
        ],
      }),
    ).toThrow(/> 100%/);
  });

  it("throws on a positive share with zero yielded units", () => {
    expect(() =>
      allocateByproductCost({
        totalCost: 10,
        outputUnits: 1,
        runs: 1,
        byproducts: [{ quantity: 0, costSharePercent: 10 }],
      }),
    ).toThrow(/zero-quantity/);
  });
});

describe("workOrdersComplete", () => {
  it("passes with no work orders (v1 BOMs)", () => {
    expect(workOrdersComplete([])).toBe(true);
  });

  it("passes when every stage is DONE or CANCELLED", () => {
    expect(workOrdersComplete(["DONE", "CANCELLED", "DONE"])).toBe(true);
  });

  it("blocks on any open stage", () => {
    expect(workOrdersComplete(["DONE", "PENDING"])).toBe(false);
    expect(workOrdersComplete(["IN_PROGRESS"])).toBe(false);
  });
});

describe("routingLaborTotal", () => {
  it("sums only DONE stages and treats null frozen cost as zero", () => {
    expect(
      routingLaborTotal([
        { status: "DONE", laborCost: 12.5 },
        { status: "DONE", laborCost: null },
        { status: "CANCELLED", laborCost: 99 },
        { status: "PENDING", laborCost: 5 },
      ]),
    ).toBe(12.5);
  });
});

describe("rollupCost with routing labor", () => {
  it("adds whole-order routing labor on top of per-run flat labor", () => {
    const r = rollupCost({
      components: [{ quantity: 1, unitCost: 4 }],
      laborCost: 3,
      overheadCost: 0,
      runs: 2,
      outputQty: 1,
      routingLaborCost: 10,
    });
    expect(r.laborCost).toBe(16); // 3*2 flat + 10 routing
    expect(r.totalCost).toBe(24); // 8 material + 16 labor
  });

  it("is unchanged for v1 BOMs when routingLaborCost is omitted", () => {
    const r = rollupCost({
      components: [{ quantity: 1, unitCost: 4 }],
      laborCost: 3,
      overheadCost: 2,
      runs: 2,
      outputQty: 1,
    });
    expect(r.laborCost).toBe(6);
    expect(r.totalCost).toBe(18);
  });
});
