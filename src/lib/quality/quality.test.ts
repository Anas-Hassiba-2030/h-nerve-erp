import { describe, it, expect } from "vitest";
import { evaluateMeasurement, lotStatusAfterCheck } from "./quality";

describe("evaluateMeasurement", () => {
  it("returns null for a pass/fail-only checkpoint (no thresholds)", () => {
    expect(evaluateMeasurement({ minValue: null, maxValue: null }, 5)).toBeNull();
  });

  it("returns null when a numeric checkpoint has no measured value", () => {
    expect(evaluateMeasurement({ minValue: 0, maxValue: 10 }, null)).toBeNull();
  });

  it("passes a value within [min, max]", () => {
    expect(evaluateMeasurement({ minValue: 4, maxValue: 6.5 }, 5)).toBe(true);
  });

  it("fails a value below min", () => {
    expect(evaluateMeasurement({ minValue: 4, maxValue: 6.5 }, 3.9)).toBe(false);
  });

  it("fails a value above max", () => {
    expect(evaluateMeasurement({ minValue: 4, maxValue: 6.5 }, 6.51)).toBe(false);
  });

  it("passes exactly at the boundary (inclusive)", () => {
    expect(evaluateMeasurement({ minValue: 4, maxValue: 6.5 }, 4)).toBe(true);
    expect(evaluateMeasurement({ minValue: 4, maxValue: 6.5 }, 6.5)).toBe(true);
  });

  it("handles a min-only or max-only checkpoint", () => {
    expect(evaluateMeasurement({ minValue: 4, maxValue: null }, 100)).toBe(true);
    expect(evaluateMeasurement({ minValue: null, maxValue: 10 }, 100)).toBe(false);
  });
});

describe("lotStatusAfterCheck", () => {
  it("quarantines on a failed check regardless of current status", () => {
    expect(lotStatusAfterCheck(false, "ACTIVE")).toBe("QUARANTINE");
    expect(lotStatusAfterCheck(false, "QUARANTINE")).toBe("QUARANTINE");
  });

  it("leaves status unchanged on a passed check — doesn't auto-release a hold", () => {
    expect(lotStatusAfterCheck(true, "ACTIVE")).toBe("ACTIVE");
    expect(lotStatusAfterCheck(true, "QUARANTINE")).toBe("QUARANTINE");
  });
});
