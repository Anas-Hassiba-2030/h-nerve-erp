import { describe, it, expect } from "vitest";
import { clipToBudget, expectedValue, remainingBudget, type ProposalCandidate } from "./budget";

const p = (id: string, value: number | undefined, confidence: number): ProposalCandidate => ({
  id,
  title: `proposal ${id}`,
  estimatedValueJod: value,
  confidence,
});

describe("expectedValue", () => {
  it("discounts a claim by how much the agent believes it", () => {
    expect(expectedValue(p("a", 1000, 0.5))).toBe(500);
  });

  it("treats an unquantified proposal as zero so it can never outrank a quantified one", () => {
    expect(expectedValue(p("a", undefined, 0.99))).toBe(0);
    expect(expectedValue(p("b", 10, 0.1))).toBeGreaterThan(expectedValue(p("a", undefined, 0.99)));
  });

  it("clamps a nonsense confidence rather than letting it buy the top slot", () => {
    expect(expectedValue(p("a", 100, 3))).toBe(100);
    expect(expectedValue(p("b", 100, -2))).toBe(0);
  });
});

describe("remainingBudget", () => {
  it("never goes negative when the cap is already overspent", () => {
    expect(remainingBudget({ dailyCap: 5, usedToday: 9 })).toBe(0);
  });
});

describe("clipToBudget", () => {
  it("ranks by expected value, not by raw claimed value", () => {
    // The speculative 50k guess must lose to the near-certain 4k saving —
    // this is the ordering that keeps managers reading the queue.
    const out = clipToBudget([p("speculative", 50_000, 0.05), p("solid", 4_000, 0.9)], {
      dailyCap: 1,
      usedToday: 0,
    });
    expect(out.surfaced.map((s) => s.id)).toEqual(["solid"]);
  });

  it("enforces the daily cap", () => {
    const out = clipToBudget(
      [p("a", 100, 1), p("b", 90, 1), p("c", 80, 1), p("d", 70, 1)],
      { dailyCap: 2, usedToday: 0 },
    );
    expect(out.surfaced).toHaveLength(2);
    expect(out.remaining).toBe(0);
  });

  it("accounts for proposals already surfaced today", () => {
    const out = clipToBudget([p("a", 100, 1), p("b", 90, 1)], { dailyCap: 3, usedToday: 2 });
    expect(out.surfaced.map((s) => s.id)).toEqual(["a"]);
  });

  it("surfaces nothing once the budget is spent, and says so", () => {
    const out = clipToBudget([p("a", 100, 1)], { dailyCap: 2, usedToday: 2 });
    expect(out.surfaced).toHaveLength(0);
    expect(out.suppressed[0]?.reason).toMatch(/already spent/i);
  });

  it("NEVER drops a candidate silently — everything is either surfaced or explained", () => {
    const candidates = [p("a", 100, 1), p("b", 90, 0.9), p("c", 5, 0.1), p("d", undefined, 0.8)];
    const out = clipToBudget(candidates, {
      dailyCap: 1,
      usedToday: 0,
      minConfidence: 0.2,
      minExpectedValueJod: 10,
    });
    const accounted = out.surfaced.length + out.suppressed.length;
    expect(accounted).toBe(candidates.length);
  });

  it("gives a distinct, readable reason for each kind of suppression", () => {
    const out = clipToBudget([p("lowconf", 10_000, 0.01), p("lowvalue", 5, 1)], {
      dailyCap: 5,
      usedToday: 0,
      minConfidence: 0.2,
      minExpectedValueJod: 100,
    });
    expect(out.surfaced).toHaveLength(0);
    const reasons = Object.fromEntries(out.suppressed.map((s) => [s.id, s.reason]));
    expect(reasons.lowconf).toMatch(/confidence/i);
    expect(reasons.lowvalue).toMatch(/expected value/i);
  });

  it("orders deterministically when expected values tie", () => {
    const a = clipToBudget([p("zeta", 100, 0.5), p("alpha", 100, 0.5)], { dailyCap: 2, usedToday: 0 });
    const b = clipToBudget([p("alpha", 100, 0.5), p("zeta", 100, 0.5)], { dailyCap: 2, usedToday: 0 });
    expect(a.surfaced.map((s) => s.id)).toEqual(b.surfaced.map((s) => s.id));
  });

  it("handles an empty batch without inventing work", () => {
    const out = clipToBudget([], { dailyCap: 5, usedToday: 0 });
    expect(out.surfaced).toHaveLength(0);
    expect(out.suppressed).toHaveLength(0);
    expect(out.remaining).toBe(5);
  });
});
