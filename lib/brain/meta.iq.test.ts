// Unit tests for Brain-IQ scoring (Phase 10).
//
// The file's own header says "the headline number is *provable*" via these
// tests. Pinned contract: monotone in every component, base 80, max 160.

import { describe, it, expect } from "vitest";
import { scoreFromComponents, clamp01, type IQComponents } from "./meta.iq";

const ZERO: IQComponents = {
  accuracy: 0,
  decisionVelocity: 0,
  outcomeQuality: 0,
  userTrust: 0,
};
const FULL: IQComponents = {
  accuracy: 1,
  decisionVelocity: 1,
  outcomeQuality: 1,
  userTrust: 1,
};

describe("scoreFromComponents — the headline Brain-IQ number", () => {
  it("scores 80 at the floor (all components 0)", () => {
    expect(scoreFromComponents(ZERO)).toBe(80);
  });

  it("scores 160 at the ceiling (all components 1)", () => {
    expect(scoreFromComponents(FULL)).toBe(160);
  });

  it("midpoint scores 120 (every component at 0.5)", () => {
    expect(scoreFromComponents({
      accuracy: 0.5, decisionVelocity: 0.5, outcomeQuality: 0.5, userTrust: 0.5,
    })).toBe(120);
  });

  it("is monotone non-decreasing in every component", () => {
    // For each component, increasing its value (others held at 0) must not
    // decrease the score. This is the pitch-critical invariant the header
    // names.
    const keys: (keyof IQComponents)[] = ["accuracy", "decisionVelocity", "outcomeQuality", "userTrust"];
    for (const k of keys) {
      let prev = -Infinity;
      for (const v of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
        const c = { ...ZERO, [k]: v };
        const s = scoreFromComponents(c);
        expect(s).toBeGreaterThanOrEqual(prev);
        prev = s;
      }
    }
  });

  it("weights accuracy and outcomeQuality more than the other two", () => {
    // Per the weights (25/15/25/15), a unit of accuracy or outcome > velocity or trust.
    const onlyAccuracy = scoreFromComponents({ ...ZERO, accuracy: 1 });        // 80 + 25 = 105
    const onlyVelocity = scoreFromComponents({ ...ZERO, decisionVelocity: 1 }); // 80 + 15 = 95
    expect(onlyAccuracy).toBeGreaterThan(onlyVelocity);
    const onlyOutcome = scoreFromComponents({ ...ZERO, outcomeQuality: 1 });   // 80 + 25 = 105
    const onlyTrust = scoreFromComponents({ ...ZERO, userTrust: 1 });          // 80 + 15 = 95
    expect(onlyOutcome).toBeGreaterThan(onlyTrust);
  });

  it("returns an integer (math.round)", () => {
    const s = scoreFromComponents({ accuracy: 0.123, decisionVelocity: 0.456, outcomeQuality: 0.789, userTrust: 0.321 });
    expect(Number.isInteger(s)).toBe(true);
  });
});

describe("clamp01 — defensive normalizer", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBeCloseTo(0.42);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(99)).toBe(1);
  });
  it("returns 0 for non-finite", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
  });
});
