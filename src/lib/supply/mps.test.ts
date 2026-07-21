import { describe, it, expect } from "vitest";
import {
  mpsSuggestedReplenishment,
  rollForwardMps,
  explodeIndirectDemand,
  generatePeriods,
} from "./mps";

describe("mpsSuggestedReplenishment", () => {
  it("suggests nothing when opening stock covers demand + safety stock", () => {
    expect(
      mpsSuggestedReplenishment({ totalDemand: 10, safetyStockTarget: 5, openingStock: 20, minToReplenish: 0, maxToReplenish: 0 }),
    ).toBe(0);
  });

  it("suggests the exact gap when triggered and no min/max set", () => {
    expect(
      mpsSuggestedReplenishment({ totalDemand: 10, safetyStockTarget: 5, openingStock: 3, minToReplenish: 0, maxToReplenish: 0 }),
    ).toBe(12);
  });

  it("floors the suggestion at minToReplenish", () => {
    expect(
      mpsSuggestedReplenishment({ totalDemand: 10, safetyStockTarget: 0, openingStock: 8, minToReplenish: 20, maxToReplenish: 0 }),
    ).toBe(20);
  });

  it("caps the suggestion at maxToReplenish when set", () => {
    expect(
      mpsSuggestedReplenishment({ totalDemand: 100, safetyStockTarget: 0, openingStock: 0, minToReplenish: 0, maxToReplenish: 30 }),
    ).toBe(30);
  });

  it("never caps below min even if max < min (misconfigured)", () => {
    expect(
      mpsSuggestedReplenishment({ totalDemand: 100, safetyStockTarget: 0, openingStock: 0, minToReplenish: 40, maxToReplenish: 10 }),
    ).toBe(40);
  });
});

describe("rollForwardMps", () => {
  it("carries a period's ending stock as the next period's opening stock", () => {
    const rows = [
      { period: "2026-08", forecastedDemand: 10, indirectDemand: 0, safetyStockTarget: 0, minToReplenish: 0, maxToReplenish: 0 },
      { period: "2026-09", forecastedDemand: 10, indirectDemand: 0, safetyStockTarget: 0, minToReplenish: 0, maxToReplenish: 0 },
      { period: "2026-10", forecastedDemand: 10, indirectDemand: 0, safetyStockTarget: 0, minToReplenish: 0, maxToReplenish: 0 },
    ];
    const out = rollForwardMps(rows, 25);
    // Aug: opening 25, demand 10, no trigger (25>=10) -> ending 15
    expect(out[0]).toMatchObject({ openingStock: 25, suggestedReplenishment: 0, forecastedStock: 15 });
    // Sep: opening 15, demand 10 -> ending 5
    expect(out[1]).toMatchObject({ openingStock: 15, suggestedReplenishment: 0, forecastedStock: 5 });
    // Oct: opening 5, demand 10, gap 5 -> replenish 5 -> ending 0
    expect(out[2]).toMatchObject({ openingStock: 5, suggestedReplenishment: 5, forecastedStock: 0 });
  });

  it("adds indirect demand into total demand each period", () => {
    const rows = [
      { period: "2026-08", forecastedDemand: 5, indirectDemand: 15, safetyStockTarget: 0, minToReplenish: 0, maxToReplenish: 0 },
    ];
    const out = rollForwardMps(rows, 10);
    expect(out[0].totalDemand).toBe(20);
    expect(out[0].suggestedReplenishment).toBe(10); // gap = 20-10
    expect(out[0].forecastedStock).toBe(0);
  });

  it("handles an empty row list", () => {
    expect(rollForwardMps([], 100)).toEqual([]);
  });
});

describe("explodeIndirectDemand", () => {
  const bomLines = [
    { parentProductId: "basket", componentProductId: "jar-honey", qtyPerUnit: 2 },
    { parentProductId: "basket", componentProductId: "jar-jam", qtyPerUnit: 1 },
    { parentProductId: "gift-box", componentProductId: "jar-honey", qtyPerUnit: 3 },
  ];

  it("sums qtyPerUnit * parent demand across every parent BOM, per period", () => {
    const demands = [
      { productId: "basket", period: "2026-08", forecastedDemand: 10 },
      { productId: "gift-box", period: "2026-08", forecastedDemand: 5 },
      { productId: "basket", period: "2026-09", forecastedDemand: 4 },
    ];
    const out = explodeIndirectDemand("jar-honey", bomLines, demands);
    expect(out.get("2026-08")).toBe(2 * 10 + 3 * 5); // 35
    expect(out.get("2026-09")).toBe(2 * 4); // 8
  });

  it("returns an empty map for a component that is not in any BOM", () => {
    const out = explodeIndirectDemand("unrelated-product", bomLines, []);
    expect(out.size).toBe(0);
  });

  it("ignores zero/negative parent demand", () => {
    const demands = [{ productId: "basket", period: "2026-08", forecastedDemand: 0 }];
    const out = explodeIndirectDemand("jar-honey", bomLines, demands);
    expect(out.has("2026-08")).toBe(false);
  });

  it("never recurses — only uses the parent's own manual demand passed in", () => {
    // jar-honey is itself never a parentProductId in bomLines, so even if
    // some OTHER component netted demand onto jar-honey indirectly, this
    // function has no path to chain through it — single level only.
    const demands = [{ productId: "jar-honey", period: "2026-08", forecastedDemand: 999 }];
    const out = explodeIndirectDemand("some-sub-component", bomLines, demands);
    expect(out.size).toBe(0);
  });
});

describe("generatePeriods", () => {
  it("generates N consecutive YYYY-MM keys starting at the anchor month", () => {
    expect(generatePeriods(new Date(Date.UTC(2026, 6, 15)), 3)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("rolls over year boundaries", () => {
    expect(generatePeriods(new Date(Date.UTC(2026, 10, 1)), 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});
