import { describe, it, expect } from "vitest";
import { clampDayOfMonth, computeNextRunDate, dueTemplates } from "./recurring";

describe("clampDayOfMonth", () => {
  it("clamps into 1-28", () => {
    expect(clampDayOfMonth(31)).toBe(28);
    expect(clampDayOfMonth(0)).toBe(1);
    expect(clampDayOfMonth(-5)).toBe(1);
    expect(clampDayOfMonth(15)).toBe(15);
  });
});

describe("computeNextRunDate", () => {
  it("returns this month's occurrence when the day hasn't passed yet", () => {
    const from = new Date(Date.UTC(2026, 6, 10)); // July 10
    const next = computeNextRunDate(from, 20);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2026, 6, 20)).toISOString());
  });

  it("rolls to next month when the day already passed", () => {
    const from = new Date(Date.UTC(2026, 6, 25)); // July 25
    const next = computeNextRunDate(from, 10);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2026, 7, 10)).toISOString());
  });

  it("rolls to next month when the day is exactly today (strictly after)", () => {
    const from = new Date(Date.UTC(2026, 6, 10));
    const next = computeNextRunDate(from, 10);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2026, 7, 10)).toISOString());
  });

  it("wraps December into January of the next year", () => {
    const from = new Date(Date.UTC(2026, 11, 25)); // Dec 25
    const next = computeNextRunDate(from, 5);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2027, 0, 5)).toISOString());
  });
});

describe("dueTemplates", () => {
  const asOf = new Date(Date.UTC(2026, 6, 15));
  it("includes active templates with nextRunDate on or before asOf", () => {
    const templates = [
      { id: "a", active: true, nextRunDate: new Date(Date.UTC(2026, 6, 15)) },
      { id: "b", active: true, nextRunDate: new Date(Date.UTC(2026, 6, 10)) },
    ];
    expect(dueTemplates(templates, asOf).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("excludes templates not yet due", () => {
    const templates = [{ id: "c", active: true, nextRunDate: new Date(Date.UTC(2026, 6, 20)) }];
    expect(dueTemplates(templates, asOf)).toEqual([]);
  });

  it("excludes inactive templates even if due", () => {
    const templates = [{ id: "d", active: false, nextRunDate: new Date(Date.UTC(2026, 6, 1)) }];
    expect(dueTemplates(templates, asOf)).toEqual([]);
  });
});
