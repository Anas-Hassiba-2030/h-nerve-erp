// lib/utils.ts — the formatting layer EVERY screen and every financial
// figure in the pitch flows through. A silent regression here corrupts
// the whole demo. Pure, deterministic (forced en-US), zero IO.

import { describe, it, expect } from "vitest";
import {
  cn, formatMoney, formatNumber, formatPercent, formatDate,
  generateNumber, ar, loc, pickLocale, statusBadgeClass, severityBadge,
} from "./utils";

describe("pickLocale — paired bilingual DB fields", () => {
  it("returns the locale-correct side when both exist", () => {
    expect(pickLocale(true, "هدف", "Goal")).toBe("هدف");
    expect(pickLocale(false, "هدف", "Goal")).toBe("Goal");
  });
  it("falls back to the other side rather than showing empty", () => {
    // En requested but only the Arabic base is populated → show Arabic.
    expect(pickLocale(false, "هدف", null)).toBe("هدف");
    // Arabic requested but only En exists → show En.
    expect(pickLocale(true, "", "Goal")).toBe("Goal");
    expect(pickLocale(true, null, "Goal")).toBe("Goal");
  });
  it("returns empty string when both sides are missing", () => {
    expect(pickLocale(true, null, undefined)).toBe("");
    expect(pickLocale(false, "", "")).toBe("");
  });
});

describe("money & numbers (always en-US digits)", () => {
  it("formatMoney rounds to whole units and shows the currency + separators", () => {
    const s = formatMoney(1234567.6);
    expect(s).toContain("1,234,568");
    expect(s).toContain("JOD");
    expect(s).not.toMatch(/\.\d/); // no fraction digits
  });
  it("formatMoney coerces null/NaN to 0 (never NaN on screen)", () => {
    expect(formatMoney(0)).toContain("0");
    expect(formatMoney(null as unknown as number)).toContain("0");
    expect(formatMoney(NaN)).toContain("0");
  });
  it("formatNumber is exact en-US grouping", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(undefined as unknown as number)).toBe("0");
    expect(formatNumber(1.239, 2)).toBe("1.24");
  });
  it("formatPercent", () => {
    expect(formatPercent(0.2)).toBe("20%");
    expect(formatPercent(0.1234, 1)).toBe("12.3%");
  });
});

describe("dates — null safety (no exact-string assert: tz/ICU vary)", () => {
  it("nullish renders the em-dash sentinel, not 'Invalid Date'", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
  it("a real date renders something non-sentinel", () => {
    expect(formatDate(new Date("2026-05-16"))).not.toBe("—");
  });
});

describe("generateNumber", () => {
  it("is PREFIX-YYYYMMDD-NNNN", () => {
    expect(generateNumber("TX")).toMatch(/^TX-\d{8}-\d{4}$/);
  });
});

describe("dictionary + class helpers", () => {
  it("ar() falls back to the key, '—' for nullish", () => {
    expect(ar({ A: "أ" }, "A")).toBe("أ");
    expect(ar({ A: "أ" }, "ZZZ")).toBe("ZZZ");
    expect(ar({ A: "أ" }, null)).toBe("—");
  });
  it("loc() picks the locale dictionary", () => {
    const dAr = { X: "س" }, dEn = { X: "ex" };
    expect(loc(dAr, dEn, "ar", "X")).toBe("س");
    expect(loc(dAr, dEn, "en", "X")).toBe("ex");
    expect(loc(dAr, dEn, "en", "MISS")).toBe("MISS");
    expect(loc(dAr, dEn, "ar", null)).toBe("—");
  });
  it("statusBadgeClass / severityBadge map known + fall back safely", () => {
    expect(statusBadgeClass("ACTIVE")).toBe("badge-emerald");
    expect(statusBadgeClass("WAT")).toBe("badge-slate");
    expect(severityBadge("CRITICAL")).toBe("badge-red");
    expect(severityBadge("???")).toBe("badge-blue");
  });
  it("cn() merges and de-dupes tailwind classes", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
