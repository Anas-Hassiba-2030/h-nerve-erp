// lib/empire/summary.test.ts — Phase 19 empire-summary pure helpers.
// The aggregator itself needs prismaUnscoped (cross-tenant DB) and is not
// unit-tested here; these are the DB-free date/math primitives it relies on.

import { describe, it, expect } from "vitest";
import {
  startOfMonth,
  addMonths,
  monthKey,
  pctDelta,
  bucketByMonth,
  occupancyPct,
} from "./summary";

describe("startOfMonth", () => {
  it("snaps to the first UTC day, zeroing the time", () => {
    const d = new Date(Date.UTC(2026, 4, 29, 13, 45, 7)); // May 29 2026 13:45
    const s = startOfMonth(d);
    expect(s.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("addMonths", () => {
  it("advances and rewinds whole months", () => {
    const base = new Date(Date.UTC(2026, 4, 1));
    expect(monthKey(addMonths(base, 1))).toBe("2026-06");
    expect(monthKey(addMonths(base, -1))).toBe("2026-04");
  });
  it("rolls across a year boundary backwards", () => {
    const jan = new Date(Date.UTC(2026, 0, 1));
    expect(monthKey(addMonths(jan, -1))).toBe("2025-12");
  });
  it("rolls across a year boundary forwards", () => {
    const dec = new Date(Date.UTC(2026, 11, 1));
    expect(monthKey(addMonths(dec, 1))).toBe("2027-01");
  });
});

describe("monthKey", () => {
  it("zero-pads the month to YYYY-MM", () => {
    expect(monthKey(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(monthKey(new Date(Date.UTC(2026, 8, 30)))).toBe("2026-09");
  });
});

describe("pctDelta", () => {
  it("computes a signed period-over-period ratio", () => {
    expect(pctDelta(110, 100)).toBeCloseTo(0.1, 5);
    expect(pctDelta(90, 100)).toBeCloseTo(-0.1, 5);
  });
  it("flat when equal", () => {
    expect(pctDelta(100, 100)).toBe(0);
  });
  it("prev=0 → +100% if current positive, else flat (never NaN/Infinity)", () => {
    expect(pctDelta(50, 0)).toBe(1);
    expect(pctDelta(0, 0)).toBe(0);
    expect(Number.isFinite(pctDelta(999, 0))).toBe(true);
  });
});

describe("occupancyPct", () => {
  it("rounds occupied/total to a whole percent", () => {
    expect(occupancyPct(30, 100)).toBe(30);
    expect(occupancyPct(1, 3)).toBe(33);
    expect(occupancyPct(2, 3)).toBe(67);
  });
  it("0 total rooms → 0 (no divide-by-zero)", () => {
    expect(occupancyPct(5, 0)).toBe(0);
    expect(occupancyPct(0, 0)).toBe(0);
  });
  it("full house → 100", () => {
    expect(occupancyPct(40, 40)).toBe(100);
  });
});

describe("bucketByMonth", () => {
  const now = new Date(Date.UTC(2026, 4, 15)); // May 2026

  it("returns one slot per month, oldest → newest", () => {
    const out = bucketByMonth([], 6, now);
    expect(out).toHaveLength(6);
    expect(out).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("sums values into the correct month bucket", () => {
    const items = [
      { date: new Date(Date.UTC(2026, 4, 1)), value: 10 }, // May → last slot
      { date: new Date(Date.UTC(2026, 4, 20)), value: 5 }, // May → last slot
      { date: new Date(Date.UTC(2026, 3, 10)), value: 7 }, // Apr → slot 4
    ];
    const out = bucketByMonth(items, 6, now);
    // window = Dec, Jan, Feb, Mar, Apr, May
    expect(out[5]).toBe(15); // May
    expect(out[4]).toBe(7); // Apr
    expect(out[3]).toBe(0); // Mar
  });

  it("ignores items outside the window", () => {
    const items = [
      { date: new Date(Date.UTC(2025, 0, 1)), value: 999 }, // way before window
      { date: new Date(Date.UTC(2026, 4, 1)), value: 3 }, // May
    ];
    const out = bucketByMonth(items, 6, now);
    expect(out.reduce((a, b) => a + b, 0)).toBe(3); // only the in-window item counts
  });

  it("honors the months argument length", () => {
    expect(bucketByMonth([], 3, now)).toHaveLength(3);
    expect(bucketByMonth([], 12, now)).toHaveLength(12);
  });

  it("places a current-month item in the final slot", () => {
    const out = bucketByMonth([{ date: now, value: 42 }], 6, now);
    expect(out[5]).toBe(42);
    expect(out.slice(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });
});
