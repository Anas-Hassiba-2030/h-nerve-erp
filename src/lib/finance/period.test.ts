// lib/period.ts — the 24H/7D/30D/QTD/YTD selector behind every analytics
// range and export window. A wrong range silently shifts every chart in
// the pitch. Pure (uses `now` internally — assert invariants, not exact ms).

import { describe, it, expect } from "vitest";
import { periodToRange, isValidPeriod, type Period } from "@/lib/finance/period";

const DAY = 24 * 60 * 60 * 1000;

describe("isValidPeriod — guard with 30D default", () => {
  it("passes through the five valid codes", () => {
    for (const p of ["24H", "7D", "30D", "QTD", "YTD"] as Period[]) {
      expect(isValidPeriod(p)).toBe(p);
    }
  });
  it("anything invalid (garbage / null / undefined / '') becomes 30D", () => {
    expect(isValidPeriod("zzz")).toBe("30D");
    expect(isValidPeriod(null)).toBe("30D");
    expect(isValidPeriod(undefined)).toBe("30D");
    expect(isValidPeriod("")).toBe("30D");
    expect(isValidPeriod("7d")).toBe("30D"); // case-sensitive
  });
});

describe("periodToRange — fixed windows are exact", () => {
  it("24H / 7D / 30D span exactly N days back from now", () => {
    for (const [p, n] of [["24H", 1], ["7D", 7], ["30D", 30]] as const) {
      const r = periodToRange(p);
      expect(r.days).toBe(n);
      expect(r.label).toBe(p);
      expect(r.end.getTime() - r.start.getTime()).toBe(n * DAY);
    }
  });

  it("an unknown period defaults to the 30D window", () => {
    const r = periodToRange("BOGUS" as Period);
    expect(r.days).toBe(30);
    expect(r.end.getTime() - r.start.getTime()).toBe(30 * DAY);
  });
});

describe("periodToRange — calendar windows (QTD / YTD)", () => {
  it("YTD starts on Jan 1 of the current year and has ≥1 day", () => {
    const r = periodToRange("YTD");
    expect(r.start.getFullYear()).toBe(new Date().getFullYear());
    expect(r.start.getMonth()).toBe(0);
    expect(r.start.getDate()).toBe(1);
    expect(r.days).toBeGreaterThanOrEqual(1);
    expect(r.start.getTime()).toBeLessThanOrEqual(r.end.getTime());
  });

  it("QTD starts on the first day of the current quarter (month % 3 === 0)", () => {
    const r = periodToRange("QTD");
    expect(r.start.getMonth() % 3).toBe(0);
    expect(r.start.getDate()).toBe(1);
    expect(r.days).toBeGreaterThanOrEqual(1);
    expect(r.days).toBeLessThanOrEqual(93);
    expect(r.start.getTime()).toBeLessThanOrEqual(r.end.getTime());
  });
});
