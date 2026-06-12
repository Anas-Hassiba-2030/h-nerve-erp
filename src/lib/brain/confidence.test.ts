import { describe, expect, it } from "vitest";
import { score } from "./confidence";
import type { VerificationReport } from "./verifier";

function fakeReport(coverage: number): VerificationReport {
  return {
    total: 10,
    verified: Math.round(coverage * 10),
    unverified: 10 - Math.round(coverage * 10),
    coverage,
    claims: [],
    trustLevel: coverage >= 0.8 ? "high" : coverage >= 0.5 ? "medium" : "low",
  };
}

describe("confidence.score", () => {
  it("returns high confidence when every signal is strong", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const result = score({
      verification: fakeReport(1.0),
      dataAsOf: now,
      supportingPoints: 50,
      graphSupports: true,
      now,
    });
    expect(result.label).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(0.9);
  });

  it("returns low confidence when verification fails", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const result = score({
      verification: fakeReport(0.1),
      dataAsOf: now,
      supportingPoints: 50,
      graphSupports: true,
      now,
    });
    expect(result.label).toBe("low");
  });

  it("degrades on stale data", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const stale = new Date("2026-01-01T00:00:00Z"); // 5 months old
    const result = score({
      verification: fakeReport(1.0),
      dataAsOf: stale,
      supportingPoints: 50,
      graphSupports: true,
      now,
    });
    expect(result.factors.freshness).toBe(0);
    expect(result.score).toBeLessThan(0.85);
  });

  it("treats missing inputs as neutral (0.5)", () => {
    const result = score({});
    expect(result.factors.verification).toBe(0.5);
    expect(result.factors.freshness).toBe(0.5);
    expect(result.factors.density).toBe(0.5);
    expect(result.factors.graph).toBe(0.5);
    expect(result.label).toBe("medium");
  });

  it("density scales logarithmically", () => {
    const base = { verification: fakeReport(1), dataAsOf: Date.now(), graphSupports: true };
    const one = score({ ...base, supportingPoints: 1 }).factors.density;
    const thirty = score({ ...base, supportingPoints: 30 }).factors.density;
    const hundred = score({ ...base, supportingPoints: 100 }).factors.density;
    expect(one).toBeLessThan(thirty);
    expect(thirty).toBeLessThanOrEqual(hundred);
    expect(hundred).toBeLessThanOrEqual(1);
  });

  it("penalizes when graph contradicts the claim", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const supported = score({
      verification: fakeReport(0.8),
      dataAsOf: now,
      supportingPoints: 10,
      graphSupports: true,
      now,
    });
    const opposed = score({
      verification: fakeReport(0.8),
      dataAsOf: now,
      supportingPoints: 10,
      graphSupports: false,
      now,
    });
    expect(supported.score).toBeGreaterThan(opposed.score);
  });
});
