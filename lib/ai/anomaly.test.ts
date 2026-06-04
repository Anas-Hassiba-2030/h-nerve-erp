// lib/anomaly.ts — the statistical engine behind "trustworthy analytics"
// (the objection the pitch lives or dies on). Pure math, deterministic.

import { describe, it, expect } from "vitest";
import {
  detectZScoreAnomalies,
  detectTrendReversal,
  buildAnomaliesFromSeries,
} from "@/lib/ai/anomaly";

const pt = (label: string, value: number) => ({ label, value });

describe("detectZScoreAnomalies", () => {
  it("needs ≥4 points (no false signals on tiny samples)", () => {
    expect(detectZScoreAnomalies([pt("a", 1), pt("b", 2), pt("c", 3)])).toEqual([]);
  });

  it("a flat series (sd=0) yields NO anomalies (no divide-by-zero noise)", () => {
    expect(
      detectZScoreAnomalies([pt("a", 10), pt("b", 10), pt("c", 10), pt("d", 10), pt("e", 10)]),
    ).toEqual([]);
  });

  it("flags exactly the outlier, with its expected (mean) value", () => {
    const r = detectZScoreAnomalies([
      pt("a", 10), pt("b", 10), pt("c", 10), pt("d", 10), pt("e", 100),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].index).toBe(4);
    expect(r[0].value).toBe(100);
    expect(r[0].expected).toBe(28); // mean of [10,10,10,10,100]
  });

  it("respects a stricter threshold (z=3 → the z=2 outlier no longer flagged)", () => {
    const series = [pt("a", 10), pt("b", 10), pt("c", 10), pt("d", 10), pt("e", 100)];
    expect(detectZScoreAnomalies(series, { thresholdZ: 3 })).toEqual([]);
  });
});

describe("detectTrendReversal", () => {
  it("needs ≥ window*2 points", () => {
    expect(detectTrendReversal([1, 2, 3, 4, 5])).toBeNull();
  });

  it("detects an up→down reversal", () => {
    expect(detectTrendReversal([1, 2, 3, 3, 2, 1])).toEqual({
      reversed: true,
      oldDirection: "up",
      newDirection: "down",
    });
  });

  it("returns null for a steady monotonic trend (no reversal)", () => {
    expect(detectTrendReversal([1, 2, 3, 4, 5, 6])).toBeNull();
  });
});

describe("buildAnomaliesFromSeries (composition)", () => {
  const label = { ar: "إيراد", en: "revenue" };
  const ctx = { ar: "أرينا", en: "Arena" };

  it("a calm series produces no anomalies", () => {
    const flat = [10, 10, 10, 10, 10, 10].map((v, i) => pt(`d${i}`, v));
    expect(buildAnomaliesFromSeries(label, ctx, flat)).toEqual([]);
  });

  it("a clear spike produces at least one explained anomaly", () => {
    const spike = [10, 10, 10, 10, 10, 100].map((v, i) => pt(`d${i}`, v));
    const out = buildAnomaliesFromSeries(label, ctx, spike);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].ar.headline).toBeTruthy();
    expect(out[0].en.headline).toBeTruthy();
  });
});
