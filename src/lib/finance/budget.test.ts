import { describe, it, expect } from "vitest";
import { budgetVsActual } from "./budget";

const line = (over: Partial<{ code: string; name: string; amount: number }>) => ({
  code: "4000",
  name: "Sales Revenue",
  amount: 1000,
  ...over,
});

describe("budgetVsActual", () => {
  it("only includes accounts with a budget set", () => {
    const result = budgetVsActual(
      [line({ code: "4000" }), line({ code: "5001", name: "COGS" })],
      new Map([["4000", 900]]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("4000");
  });

  it("computes variance as actual minus budget", () => {
    const result = budgetVsActual([line({ code: "4000", amount: 1200 })], new Map([["4000", 1000]]));
    expect(result[0].variance).toBe(200);
    expect(result[0].pctUsed).toBe(120);
  });

  it("handles a zero budget with zero actual as pctUsed 0", () => {
    const result = budgetVsActual([line({ code: "4000", amount: 0 })], new Map([["4000", 0]]));
    expect(result[0].pctUsed).toBe(0);
    expect(result[0].variance).toBe(0);
  });

  it("handles a zero budget with nonzero actual as Infinity", () => {
    const result = budgetVsActual([line({ code: "4000", amount: 50 })], new Map([["4000", 0]]));
    expect(result[0].pctUsed).toBe(Infinity);
    expect(result[0].variance).toBe(50);
  });

  it("returns an empty array when no lines have a budget", () => {
    expect(budgetVsActual([line({})], new Map())).toEqual([]);
  });
});
