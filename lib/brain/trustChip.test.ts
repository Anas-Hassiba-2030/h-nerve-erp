// Pin the TrustChip thresholds + labels — must not drift from confidence.ts.

import { describe, it, expect } from "vitest";
import { trustBucket, trustLabel, trustPct } from "./trustChip";

describe("trustBucket", () => {
  it("classifies high ≥ 0.75", () => {
    expect(trustBucket(0.75)).toBe("high");
    expect(trustBucket(1)).toBe("high");
  });
  it("classifies medium in [0.45, 0.75)", () => {
    expect(trustBucket(0.45)).toBe("medium");
    expect(trustBucket(0.749)).toBe("medium");
  });
  it("classifies low < 0.45", () => {
    expect(trustBucket(0.449)).toBe("low");
    expect(trustBucket(0)).toBe("low");
  });
});

describe("trustLabel", () => {
  it("localizes bucket labels (ar/en)", () => {
    expect(trustLabel("high", "en")).toBe("Verified");
    expect(trustLabel("medium", "en")).toBe("Partial");
    expect(trustLabel("low", "en")).toBe("Unverified");
    expect(trustLabel("high", "ar")).toBe("موثوق");
    expect(trustLabel("medium", "ar")).toBe("جزئي");
    expect(trustLabel("low", "ar")).toBe("غير مؤكد");
  });
});

describe("trustPct", () => {
  it("rounds to a whole percent", () => {
    expect(trustPct(0.823)).toBe(82);
    expect(trustPct(0.825)).toBe(83); // round-half-to-even differs by engine; either is fine
  });
  it("clamps out-of-range scores", () => {
    expect(trustPct(1.5)).toBe(100);
    expect(trustPct(-0.2)).toBe(0);
  });
});
