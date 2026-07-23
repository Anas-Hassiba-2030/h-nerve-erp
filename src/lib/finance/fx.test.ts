import { describe, it, expect } from "vitest";
import { latestRateAsOf, revalueOpenInvoices, type RateRow, type RevalInput } from "./fx";

describe("latestRateAsOf", () => {
  it("returns 1 for JOD regardless of rates", () => {
    expect(latestRateAsOf([], "JOD", new Date("2026-01-01"))).toBe(1);
  });

  it("returns 1 when no rate exists yet for the currency", () => {
    expect(latestRateAsOf([], "USD", new Date("2026-01-01"))).toBe(1);
  });

  it("picks the most recent rate on or before the date", () => {
    const rates: RateRow[] = [
      { currency: "USD", rate: 0.71, asOf: new Date("2026-01-01") },
      { currency: "USD", rate: 0.709, asOf: new Date("2026-02-01") },
    ];
    expect(latestRateAsOf(rates, "USD", new Date("2026-02-15"))).toBe(0.709);
  });

  it("ignores rates after the date", () => {
    const rates: RateRow[] = [
      { currency: "USD", rate: 0.71, asOf: new Date("2026-01-01") },
      { currency: "USD", rate: 0.709, asOf: new Date("2026-02-01") },
    ];
    expect(latestRateAsOf(rates, "USD", new Date("2026-01-15"))).toBe(0.71);
  });
});

describe("revalueOpenInvoices", () => {
  it("skips JOD invoices", () => {
    const invoices: RevalInput[] = [{ id: "a", currency: "JOD", total: 1000, fxRate: 1 }];
    expect(revalueOpenInvoices(invoices, new Map([["JOD", 1]]))).toEqual([]);
  });

  it("skips invoices with no current rate available", () => {
    const invoices: RevalInput[] = [{ id: "a", currency: "USD", total: 100, fxRate: 0.71 }];
    expect(revalueOpenInvoices(invoices, new Map())).toEqual([]);
  });

  it("skips invoices with zero delta", () => {
    const invoices: RevalInput[] = [{ id: "a", currency: "USD", total: 100, fxRate: 0.71 }];
    expect(revalueOpenInvoices(invoices, new Map([["USD", 0.71]]))).toEqual([]);
  });

  it("computes a gain when the foreign currency strengthens", () => {
    const invoices: RevalInput[] = [{ id: "a", currency: "USD", total: 100, fxRate: 0.71 }];
    const result = revalueOpenInvoices(invoices, new Map([["USD", 0.72]]));
    expect(result).toHaveLength(1);
    expect(result[0].jodBefore).toBe(71);
    expect(result[0].jodAfter).toBe(72);
    expect(result[0].gainLoss).toBe(1);
    expect(result[0].newRate).toBe(0.72);
  });

  it("computes a loss when the foreign currency weakens", () => {
    const invoices: RevalInput[] = [{ id: "a", currency: "USD", total: 100, fxRate: 0.71 }];
    const result = revalueOpenInvoices(invoices, new Map([["USD", 0.7]]));
    expect(result[0].gainLoss).toBe(-1);
  });
});
