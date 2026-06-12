// lib/brain/meta.reflector.ts — the Brain IQ math. `score` is THE
// headline number in the pitch ("the best brain in the world", rises
// monotonically as the brain improves). If this drifts, goes non-monotone,
// or can ever render NaN / out of range, the pitch breaks on stage.
// scoreFromComponents + clamp01 are pure and deterministic — pin them.

import { describe, it, expect } from "vitest";
import {
  scoreFromComponents,
  clamp01,
  type IQComponents,
} from "./meta.iq";

const C = (
  accuracy: number,
  decisionVelocity: number,
  outcomeQuality: number,
  userTrust: number,
): IQComponents => ({ accuracy, decisionVelocity, outcomeQuality, userTrust });

// Deterministic sample grid over [0,1]^4 (5 points/axis = 625 combos).
const AXIS = [0, 0.25, 0.5, 0.75, 1];
const GRID: IQComponents[] = [];
for (const a of AXIS)
  for (const v of AXIS)
    for (const o of AXIS) for (const t of AXIS) GRID.push(C(a, v, o, t));

describe("scoreFromComponents — the public Brain IQ number", () => {
  it("anchors: all-zero → 80 (base), all-one → 160 (ceiling)", () => {
    expect(scoreFromComponents(C(0, 0, 0, 0))).toBe(80);
    expect(scoreFromComponents(C(1, 1, 1, 1))).toBe(160); // 80+25+15+25+15
  });

  it("exact component weights: accuracy=25, velocity=15, outcome=25, trust=15", () => {
    expect(scoreFromComponents(C(1, 0, 0, 0))).toBe(105); // 80 + 25
    expect(scoreFromComponents(C(0, 1, 0, 0))).toBe(95); // 80 + 15
    expect(scoreFromComponents(C(0, 0, 1, 0))).toBe(105); // 80 + 25
    expect(scoreFromComponents(C(0, 0, 0, 1))).toBe(95); // 80 + 15
  });

  it("is always an integer in [80,160] across the whole [0,1]^4 grid", () => {
    for (const g of GRID) {
      const s = scoreFromComponents(g);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(80);
      expect(s).toBeLessThanOrEqual(160);
    }
  });

  it("is deterministic — same components, same score", () => {
    const g = C(0.31, 0.62, 0.17, 0.93);
    expect(scoreFromComponents(g)).toBe(scoreFromComponents(g));
  });

  it("is monotone non-decreasing in every component (others held fixed)", () => {
    // The monotonicity claim that justifies the "rises as it improves"
    // story: improving any single axis never lowers the headline number.
    const base = C(0.4, 0.4, 0.4, 0.4);
    (["accuracy", "decisionVelocity", "outcomeQuality", "userTrust"] as const).forEach(
      (k) => {
        let prev = -Infinity;
        for (const step of AXIS) {
          const s = scoreFromComponents({ ...base, [k]: step });
          expect(s).toBeGreaterThanOrEqual(prev);
          prev = s;
        }
      },
    );
  });

  it("pairs with equal weight are symmetric (accuracy↔outcome, velocity↔trust)", () => {
    expect(scoreFromComponents(C(0.8, 0, 0.2, 0))).toBe(
      scoreFromComponents(C(0.2, 0, 0.8, 0)),
    );
    expect(scoreFromComponents(C(0, 0.8, 0, 0.2))).toBe(
      scoreFromComponents(C(0, 0.2, 0, 0.8)),
    );
  });
});

describe("clamp01 — the guard that keeps IQ finite", () => {
  it("passes through values already in [0,1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });

  it("clamps out-of-range values to the nearest bound", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-0.0001)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(1.0001)).toBe(1);
  });

  it("maps every non-finite input to 0 (never NaN/Infinity downstream)", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
    expect(clamp01(0 / 0)).toBe(0);
  });
});

describe("invariant: a clamped pipeline can never produce a broken IQ", () => {
  // computeIQ() wraps every raw ratio in clamp01 before scoring. Even if
  // upstream DB math yields NaN / negatives / >1 (division by zero,
  // dirty data), the headline number stays a clean integer in [80,160].
  it("hostile raw inputs still yield an integer in [80,160]", () => {
    const hostile = [NaN, Infinity, -Infinity, -5, 4, 1.5, -0.2, 0 / 0];
    for (const a of hostile)
      for (const v of hostile) {
        const s = scoreFromComponents(
          C(clamp01(a), clamp01(v), clamp01(a), clamp01(v)),
        );
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(80);
        expect(s).toBeLessThanOrEqual(160);
      }
  });
});
