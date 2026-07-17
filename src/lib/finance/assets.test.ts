import { describe, expect, it } from "vitest";
import { bookValue, depreciationDue, monthlyStraightLine } from "./assets";

describe("monthlyStraightLine", () => {
  it("divides depreciable base over life", () => {
    expect(monthlyStraightLine(1200, 0, 12)).toBe(100);
    expect(monthlyStraightLine(1200, 200, 10)).toBe(100);
  });

  it("rounds to 2dp", () => {
    expect(monthlyStraightLine(1000, 0, 3)).toBe(333.33);
  });

  it("guards degenerate inputs", () => {
    expect(monthlyStraightLine(1000, 0, 0)).toBe(0);
    expect(monthlyStraightLine(100, 200, 12)).toBe(0); // salvage above cost
  });
});

describe("depreciationDue", () => {
  it("charges the flat monthly amount while book value remains", () => {
    expect(depreciationDue(1200, 0, 12, 0)).toBe(100);
    expect(depreciationDue(1200, 0, 12, 1100)).toBe(100);
  });

  it("caps the final month at the remainder (rounding drift)", () => {
    // 1000/3 = 333.33/mo; after two months accumulated 666.66, remainder 333.34
    expect(depreciationDue(1000, 0, 3, 666.66)).toBe(333.34);
  });

  it("returns 0 once fully depreciated", () => {
    expect(depreciationDue(1200, 0, 12, 1200)).toBe(0);
    expect(depreciationDue(1200, 200, 12, 1000)).toBe(0); // stops at salvage
  });
});

describe("bookValue", () => {
  it("cost minus accumulated, floored at salvage", () => {
    expect(bookValue(1200, 0, 300)).toBe(900);
    expect(bookValue(1200, 200, 1000)).toBe(200);
    expect(bookValue(1200, 200, 5000)).toBe(200); // never below salvage
  });
});
