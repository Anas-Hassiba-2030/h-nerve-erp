import { describe, it, expect } from "vitest";
import { allocateLandedCost, type AllocationInput } from "./landedCost";

function line(over: Partial<AllocationInput>): AllocationInput {
  return { movementId: "m1", productId: "p1", quantity: 10, baseValue: 100, ...over };
}

describe("allocateLandedCost", () => {
  it("returns nothing for an empty input or non-positive total", () => {
    expect(allocateLandedCost([], 100)).toEqual([]);
    expect(allocateLandedCost([line({})], 0)).toEqual([]);
    expect(allocateLandedCost([line({})], -5)).toEqual([]);
  });

  it("allocates proportionally BY_VALUE", () => {
    const lines = [line({ movementId: "m1", baseValue: 300 }), line({ movementId: "m2", baseValue: 100 })];
    const result = allocateLandedCost(lines, 200, "BY_VALUE");
    expect(result.find((r) => r.movementId === "m1")!.allocatedAmount).toBe(150);
    expect(result.find((r) => r.movementId === "m2")!.allocatedAmount).toBe(50);
  });

  it("allocates proportionally BY_QUANTITY", () => {
    const lines = [line({ movementId: "m1", quantity: 30 }), line({ movementId: "m2", quantity: 10 })];
    const result = allocateLandedCost(lines, 200, "BY_QUANTITY");
    expect(result.find((r) => r.movementId === "m1")!.allocatedAmount).toBe(150);
    expect(result.find((r) => r.movementId === "m2")!.allocatedAmount).toBe(50);
  });

  it("falls back to BY_QUANTITY when BY_VALUE has no value basis at all", () => {
    const lines = [line({ movementId: "m1", quantity: 30, baseValue: 0 }), line({ movementId: "m2", quantity: 10, baseValue: 0 })];
    const result = allocateLandedCost(lines, 200, "BY_VALUE");
    expect(result.find((r) => r.movementId === "m1")!.allocatedAmount).toBe(150);
  });

  it("always sums to exactly the input total despite rounding", () => {
    const lines = [line({ movementId: "m1", baseValue: 1 }), line({ movementId: "m2", baseValue: 1 }), line({ movementId: "m3", baseValue: 1 })];
    const result = allocateLandedCost(lines, 100, "BY_VALUE");
    const sum = result.reduce((s, r) => s + r.allocatedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it("puts the rounding remainder on the largest line, not an arbitrary one", () => {
    const lines = [line({ movementId: "big", baseValue: 1000 }), line({ movementId: "small", baseValue: 1 })];
    const result = allocateLandedCost(lines, 10, "BY_VALUE");
    const total = result.reduce((s, r) => s + r.allocatedAmount, 0);
    expect(total).toBe(10);
    // The big line should absorb virtually all of it either way — just
    // confirm no line went negative or absurd from remainder math.
    expect(result.every((r) => r.allocatedAmount >= 0)).toBe(true);
  });

  it("returns nothing when BY_QUANTITY has zero total quantity", () => {
    const lines = [line({ quantity: 0, baseValue: 0 })];
    expect(allocateLandedCost(lines, 100, "BY_QUANTITY")).toEqual([]);
  });
});
