// lib/exportAnalytics.ts — the math behind every branded HTML/CSV export
// and the dashboard "combined report" the pitch hands to leadership. Pure,
// no IO. Wrong KPI/tone/empty-handling = a wrong number in an investor's hand.

import { describe, it, expect } from "vitest";
import {
  monthlyTrend,
  periodDelta,
  financeAnalytics,
  hotelsAnalytics,
  dairyAnalytics,
  sustainabilityAnalytics,
  marketsAnalytics,
} from "@/lib/export/exportAnalytics";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe("monthlyTrend — shared 12-window primitive", () => {
  it("empty input → all-zero values, one entry per window", () => {
    const r = monthlyTrend([], 12);
    expect(r.values).toHaveLength(12);
    expect(r.labels).toHaveLength(12);
    expect(r.values.every((v) => v === 0)).toBe(true);
  });
  it("honours the months argument (length follows it)", () => {
    expect(monthlyTrend([], 3).values).toHaveLength(3);
  });
  it("a recent item lands in the most-recent (last) bucket", () => {
    const r = monthlyTrend([{ amount: 500, date: daysAgo(1) }], 12);
    expect(r.values[11]).toBe(500);
    expect(r.values.slice(0, 11).every((v) => v === 0)).toBe(true);
  });
});

describe("periodDelta — half-vs-half % change", () => {
  it("needs ≥4 points", () => {
    expect(periodDelta([1, 2, 3])).toBeNull();
  });
  it("zero earlier-half → null (no divide-by-zero)", () => {
    expect(periodDelta([0, 0, 5, 5])).toBeNull();
  });
  it("growth is positive, decline is negative", () => {
    expect(periodDelta([10, 10, 20, 20])).toEqual({ pct: 1, positive: true });
    const d = periodDelta([10, 10, 5, 5]);
    expect(d!.pct).toBeCloseTo(-0.5);
    expect(d!.positive).toBe(false);
  });
  it("flat series → 0%, still counts as positive (>=0)", () => {
    expect(periodDelta([10, 10, 10, 10])).toEqual({ pct: 0, positive: true });
  });
});

describe("financeAnalytics — totals, tone, safety", () => {
  it("empty tx is safe: zeroed KPIs, no distribution, never throws", () => {
    const a = financeAnalytics([]);
    expect(a.kpis).toHaveLength(5);
    expect(a.distribution).toBeNull();
    expect(a.commentary_en).toContain("0");
  });
  it("net-negative flips the Net KPI tone to rose", () => {
    const tx = [
      { kind: "REVENUE", amount: 100, currency: "JOD", category: "sales", occurredAt: daysAgo(5), companyId: "c1" },
      { kind: "EXPENSE", amount: 400, currency: "JOD", category: "rent", occurredAt: daysAgo(5), companyId: "c1" },
    ];
    const net = financeAnalytics(tx).kpis.find((k) => k.label_en === "Net")!;
    expect(net.tone).toBe("rose");
  });
  it("net-positive keeps the Net KPI tone emerald + builds a category distribution", () => {
    const tx = [
      { kind: "REVENUE", amount: 900, currency: "JOD", category: "sales", occurredAt: daysAgo(5), companyId: "c1" },
      { kind: "EXPENSE", amount: 100, currency: "JOD", category: "rent", occurredAt: daysAgo(5), companyId: "c1" },
    ];
    const a = financeAnalytics(tx);
    expect(a.kpis.find((k) => k.label_en === "Net")!.tone).toBe("emerald");
    expect(a.distribution?.buckets[0].label).toBe("rent");
  });
});

describe("hotelsAnalytics — cancel-rate tone gate (>10% = rose + ⚠)", () => {
  const bk = (status: string) => ({
    revenue: 1000, rooms: 1, checkIn: daysAgo(10), checkOut: daysAgo(8),
    status, hotel: { totalRooms: 10, name: "H", tier: "LUX" },
  });
  it("low cancellations stay slate, no warning glyph", () => {
    const a = hotelsAnalytics([bk("CONFIRMED"), bk("CONFIRMED"), bk("CHECKED_IN")]);
    expect(a.kpis.find((k) => k.label_en === "Cancel rate")!.tone).toBe("slate");
    expect(a.commentary_en).not.toContain("⚠");
  });
  it(">10% cancellations → rose tone + ⚠ in commentary", () => {
    const a = hotelsAnalytics([bk("CANCELLED"), bk("CONFIRMED")]); // 50%
    expect(a.kpis.find((k) => k.label_en === "Cancel rate")!.tone).toBe("rose");
    expect(a.commentary_en).toContain("⚠");
  });
});

describe("dairyAnalytics — empty safety + grade-A rate", () => {
  it("empty batches: 6 KPIs, no throw, zeroed", () => {
    const a = dairyAnalytics([]);
    expect(a.kpis).toHaveLength(6);
    expect(a.kpis.find((k) => k.label_en === "Grade-A rate")!.value).toContain("0%");
  });
  it("all grade-A → 100% and emerald tone", () => {
    const b = (g: string) => ({
      quantityLiters: 100, qualityGrade: g, fatContent: 3, productionDate: daysAgo(5),
      expiryDate: daysAgo(-30), status: "READY", product: "Milk",
    });
    const k = dairyAnalytics([b("A"), b("A")]).kpis.find((x) => x.label_en === "Grade-A rate")!;
    expect(k.tone).toBe("emerald");
    expect(k.value).toContain("100%");
  });
});

describe("sustainabilityAnalytics — explicit empty branch", () => {
  it("no scores → empty KPIs + the bilingual 'no data' commentary", () => {
    const a = sustainabilityAnalytics([]);
    expect(a.kpis).toEqual([]);
    expect(a.commentary_ar).toBe("لا توجد بيانات ESG.");
    expect(a.commentary_en).toBe("No ESG data.");
  });
});

describe("marketsAnalytics — gainers/losers/flat partition", () => {
  it("counts each bucket and signs the average", () => {
    const s = (changePct: number) => ({ changePct, region: "MENA", exchange: "ASE", lastPrice: 10 });
    const a = marketsAnalytics([s(2), s(-1), s(0)]);
    const get = (l: string) => a.kpis.find((k) => k.label_en === l)!.value;
    expect(get("Gainers")).toBe("1");
    expect(get("Losers")).toBe("1");
    expect(get("Flat")).toBe("1");
    expect(get("Avg change").startsWith("+")).toBe(true); // (2-1+0)/3 = +0.33
  });
});
