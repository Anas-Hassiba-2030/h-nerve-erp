// lib/empire/aggregator.test.ts — Phase 19 Empire grid (/admin/empire).
//
// getEmpireTiles() reads four tables through the scoped `prisma` client, so we
// mock @/lib/db: each model method is a vi.fn() scripted per test. No DB, no
// network — fits the pure-unit suite. We assert the AGGREGATION logic: the
// self tile, real tenant tiles, deterministic synthetic padding to 8, the
// real-first / IQ-desc ordering, the IQ clamp, and industry inference.

import { vi, describe, it, expect, beforeEach } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    tenant: { findMany: vi.fn() },
    brainIQHistory: { findMany: vi.fn() },
    plan: { findMany: vi.fn() },
    aIInsight: { count: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import { getEmpireTiles } from "./aggregator";

/** ISO-snapped weekly IQ history, oldest → newest. */
function iqHistory(values: number[]): Array<{ iq: number; snappedAt: Date }> {
  const week = 7 * 24 * 60 * 60 * 1000;
  const base = Date.UTC(2026, 0, 1);
  return values.map((iq, i) => ({ iq, snappedAt: new Date(base + i * week) }));
}

/** Default empty wiring; individual tests override what they care about. */
function wire(opts: {
  tenants?: any[];
  iq?: Array<{ iq: number; snappedAt: Date }>;
  plans?: any[];
  insights?: number;
} = {}) {
  prisma.tenant.findMany.mockResolvedValue(opts.tenants ?? []);
  prisma.brainIQHistory.findMany.mockResolvedValue(opts.iq ?? []);
  prisma.plan.findMany.mockResolvedValue(opts.plans ?? []);
  prisma.aIInsight.count.mockResolvedValue(opts.insights ?? 0);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEmpireTiles — shape & padding", () => {
  it("always returns exactly 8 tiles, padded with synthetic siblings", async () => {
    wire();
    const tiles = await getEmpireTiles();
    expect(tiles).toHaveLength(8);
  });

  it("puts the real self tile first and synthetic tiles after", async () => {
    wire();
    const tiles = await getEmpireTiles();
    expect(tiles[0].synthetic).toBe(false);
    expect(tiles[0].key).toBe("self:hourani");
    // Exactly one real tile (self) + 7 synthetic fillers.
    expect(tiles.filter((t) => !t.synthetic)).toHaveLength(1);
    expect(tiles.filter((t) => t.synthetic)).toHaveLength(7);
  });

  it("synthetic tiles carry stable synth: keys (deterministic, no shuffle)", async () => {
    wire();
    const a = await getEmpireTiles();
    const b = await getEmpireTiles();
    expect(a.map((t) => t.key)).toEqual(b.map((t) => t.key));
    expect(a.map((t) => t.iq)).toEqual(b.map((t) => t.iq));
  });
});

describe("getEmpireTiles — the self tile", () => {
  it("derives live IQ + 1-week delta + an 8-point sparkline from default history", async () => {
    wire({ iq: iqHistory([110, 112, 118, 120, 121, 119, 125, 130, 133]) });
    const tiles = await getEmpireTiles();
    const self = tiles.find((t) => t.key === "self:hourani")!;
    expect(self.iq).toBe(133); // newest
    expect(self.iqDelta1w).toBe(133 - 130); // newest minus one week ago (prev point)
    expect(self.spark).toHaveLength(8); // last 8 only
    expect(self.spark[self.spark.length - 1].iq).toBe(133);
    // Sparkline timestamps serialize to ISO.
    expect(self.spark[0].snappedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("falls back to IQ 100 / flat delta with no history", async () => {
    wire();
    const self = (await getEmpireTiles()).find((t) => t.key === "self:hourani")!;
    expect(self.iq).toBe(100);
    expect(self.iqDelta1w).toBe(0);
    expect(self.spark).toEqual([]);
  });

  it("surfaces the latest plan as the self tile's decision", async () => {
    wire({
      insights: 7,
      plans: [
        {
          goal: "خفض الهدر",
          goalEn: "Cut waste",
          status: "ACTIVE",
          committedAt: new Date(Date.UTC(2026, 4, 1)),
          targetMetric: "waste_pct",
          targetDelta: -12,
        },
      ],
    });
    const self = (await getEmpireTiles()).find((t) => t.key === "self:hourani")!;
    expect(self.insightsOpen).toBe(7);
    expect(self.plansActive).toBe(1);
    expect(self.decisions7d).toBe(1);
    expect(self.latestDecision).toMatchObject({
      goal: "خفض الهدر",
      goalEn: "Cut waste",
      status: "ACTIVE",
      targetMetric: "waste_pct",
      targetDelta: -12,
    });
    expect(self.latestDecision!.committedAt).toMatch(/^2026-05-01T/);
  });

  it("leaves latestDecision null and counts at 0 with no plan", async () => {
    wire();
    const self = (await getEmpireTiles()).find((t) => t.key === "self:hourani")!;
    expect(self.latestDecision).toBeNull();
    expect(self.plansActive).toBe(0);
    expect(self.decisions7d).toBe(0);
  });
});

describe("getEmpireTiles — real tenant tiles", () => {
  const tenant = {
    id: "t1",
    slug: "maha-dairy",
    name: "Maha Dairy",
    region: "JO · Irbid",
    tier: "growth",
    status: "ACTIVE",
  };

  it("renders a real tile per ACTIVE tenant, keyed tenant:<slug>", async () => {
    wire({ tenants: [tenant], iq: iqHistory([120, 122, 124]) });
    const tiles = await getEmpireTiles();
    const t = tiles.find((x) => x.key === "tenant:maha-dairy");
    expect(t).toBeDefined();
    expect(t!.synthetic).toBe(false);
    expect(t!.region).toBe("JO · Irbid");
    expect(t!.tier).toBe("growth");
  });

  it("infers industry from the tenant name (dairy → ألبان / Dairy)", async () => {
    wire({ tenants: [tenant], iq: iqHistory([120, 122, 124]) });
    const t = (await getEmpireTiles()).find((x) => x.key === "tenant:maha-dairy")!;
    expect(t.industry).toBe("Dairy");
    expect(t.industryAr).toBe("ألبان");
  });

  it("clamps jittered tenant IQ into the [70,180] band", async () => {
    // Extreme history; whatever the per-slug offset is, the result stays clamped.
    wire({ tenants: [tenant], iq: iqHistory([500, 500, 500]) });
    const t = (await getEmpireTiles()).find((x) => x.key === "tenant:maha-dairy")!;
    expect(t.iq).toBeLessThanOrEqual(180);
    expect(t.iq).toBeGreaterThanOrEqual(70);
    for (const p of t.spark) {
      expect(p.iq).toBeLessThanOrEqual(180);
      expect(p.iq).toBeGreaterThanOrEqual(70);
    }
  });

  it("orders real tenants ahead of synthetic and by IQ descending", async () => {
    const t2 = { ...tenant, id: "t2", slug: "kasbah-resorts", name: "Kasbah Resorts" };
    wire({ tenants: [tenant, t2], iq: iqHistory([120, 122, 124]) });
    const tiles = await getEmpireTiles();
    const firstSyntheticIdx = tiles.findIndex((t) => t.synthetic);
    const reals = tiles.slice(0, firstSyntheticIdx);
    // All reals come before any synthetic.
    expect(tiles.slice(firstSyntheticIdx).every((t) => t.synthetic)).toBe(true);
    // Reals are sorted by IQ desc.
    for (let i = 1; i < reals.length; i++) {
      expect(reals[i - 1].iq).toBeGreaterThanOrEqual(reals[i].iq);
    }
  });

  it("does not add synthetic fillers once real tiles already reach 8", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      ...tenant,
      id: `t${i}`,
      slug: `tenant-${i}`,
      name: `Tenant ${i}`,
    }));
    wire({ tenants: many, iq: iqHistory([120, 122, 124]) });
    const tiles = await getEmpireTiles();
    expect(tiles).toHaveLength(8);
    expect(tiles.every((t) => !t.synthetic)).toBe(true);
  });
});

describe("getEmpireTiles — synthetic siblings", () => {
  it("span varied industries with sane IQ/pulse values and 8-point sparks", async () => {
    wire();
    const synth = (await getEmpireTiles()).filter((t) => t.synthetic);
    expect(synth.length).toBeGreaterThan(0);
    for (const s of synth) {
      expect(s.iq).toBeGreaterThanOrEqual(70);
      expect(s.iq).toBeLessThanOrEqual(180);
      expect(s.spark).toHaveLength(8);
      expect(s.insightsOpen).toBeGreaterThanOrEqual(0);
      expect(s.plansActive).toBeGreaterThanOrEqual(0);
      expect(s.key.startsWith("synth:")).toBe(true);
    }
    // The grid demos more than one industry.
    expect(new Set(synth.map((s) => s.industry)).size).toBeGreaterThan(1);
  });
});
