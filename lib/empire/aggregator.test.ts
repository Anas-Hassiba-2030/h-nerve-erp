// lib/empire/aggregator.test.ts — Phase 19 Empire grid (/admin/empire).
//
// Two test surfaces:
//  1. getEmpireTiles() — DB-mocked, exercises aggregation logic (self tile,
//     real tenant tiles, synthetic padding to 8, real-first/IQ-desc ordering).
//  2. Pure helpers (clampIq, hashOffset, industryGuess) — no DB, fully
//     deterministic; a bug here shows wrong IQ numbers / industry labels.

import { vi, describe, it, expect, beforeEach } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    tenant: { findMany: vi.fn() },
    brainIQHistory: { findMany: vi.fn() },
    plan: { findMany: vi.fn() },
    aIInsight: { count: vi.fn() },
  },
}));

vi.mock("@/lib/db/db", () => ({ prisma }));

import {
  getEmpireTiles,
  clampIq,
  hashOffset,
  industryGuess,
} from "./aggregator";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** ISO-snapped weekly IQ history, oldest → newest. */
function iqHistory(values: number[]): Array<{ iq: number; snappedAt: Date }> {
  const week = 7 * 24 * 60 * 60 * 1000;
  const base = Date.UTC(2026, 0, 1);
  return values.map((iq, i) => ({ iq, snappedAt: new Date(base + i * week) }));
}

/** Default empty wiring; individual tests override what they care about. */
function wire(
  opts: {
    tenants?: any[];
    iq?: Array<{ iq: number; snappedAt: Date }>;
    plans?: any[];
    insights?: number;
  } = {},
) {
  prisma.tenant.findMany.mockResolvedValue(opts.tenants ?? []);
  prisma.brainIQHistory.findMany.mockResolvedValue(opts.iq ?? []);
  prisma.plan.findMany.mockResolvedValue(opts.plans ?? []);
  prisma.aIInsight.count.mockResolvedValue(opts.insights ?? 0);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// getEmpireTiles — shape & padding
// ─────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────
// getEmpireTiles — the self tile
// ─────────────────────────────────────────────────────────────────────

describe("getEmpireTiles — the self tile", () => {
  it("derives live IQ + 1-week delta + an 8-point sparkline from default history", async () => {
    wire({ iq: iqHistory([110, 112, 118, 120, 121, 119, 125, 130, 133]) });
    const tiles = await getEmpireTiles();
    const self = tiles.find((t) => t.key === "self:hourani")!;
    expect(self.iq).toBe(133);
    expect(self.iqDelta1w).toBe(133 - 130);
    expect(self.spark).toHaveLength(8);
    expect(self.spark[self.spark.length - 1].iq).toBe(133);
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

// ─────────────────────────────────────────────────────────────────────
// getEmpireTiles — real tenant tiles
// ─────────────────────────────────────────────────────────────────────

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
    expect(tiles.slice(firstSyntheticIdx).every((t) => t.synthetic)).toBe(true);
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

// ─────────────────────────────────────────────────────────────────────
// getEmpireTiles — synthetic siblings
// ─────────────────────────────────────────────────────────────────────

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
    expect(new Set(synth.map((s) => s.industry)).size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// clampIq — pure helper
// ─────────────────────────────────────────────────────────────────────

describe("clampIq", () => {
  it("clamps below the floor up to 70", () => {
    expect(clampIq(0)).toBe(70);
    expect(clampIq(-50)).toBe(70);
    expect(clampIq(69.9)).toBe(70);
  });
  it("clamps above the ceiling down to 180", () => {
    expect(clampIq(200)).toBe(180);
    expect(clampIq(180.4)).toBe(180);
  });
  it("rounds in-range values to the nearest integer", () => {
    expect(clampIq(120.4)).toBe(120);
    expect(clampIq(120.5)).toBe(121);
    expect(clampIq(142)).toBe(142);
  });
  it("boundaries map to themselves", () => {
    expect(clampIq(70)).toBe(70);
    expect(clampIq(180)).toBe(180);
  });
  it("always returns an integer in [70,180] across a hostile range", () => {
    for (let v = -100; v <= 400; v += 7) {
      const r = clampIq(v);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(70);
      expect(r).toBeLessThanOrEqual(180);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// hashOffset — pure helper
// ─────────────────────────────────────────────────────────────────────

describe("hashOffset", () => {
  it("is deterministic — same seed + range yields the same value", () => {
    expect(hashOffset("blue-meadow", -6, 6)).toBe(hashOffset("blue-meadow", -6, 6));
    expect(hashOffset("kasbah", 0, 4)).toBe(hashOffset("kasbah", 0, 4));
  });
  it("stays within the inclusive [lo, hi] range", () => {
    for (const seed of ["a", "loran-agri", "x:i", "highland-mfg", "", "ω"]) {
      for (const [lo, hi] of [[-6, 6], [0, 4], [1, 6], [-3, 5]] as const) {
        const v = hashOffset(seed, lo, hi);
        expect(v, `${seed} in [${lo},${hi}]`).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
  it("a zero-width range (lo === hi) always returns that single value", () => {
    expect(hashOffset("anything", 5, 5)).toBe(5);
    expect(hashOffset("else", 0, 0)).toBe(0);
  });
  it("different seeds generally spread across the range (not all identical)", () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `tenant-${i}`);
    const values = new Set(seeds.map((s) => hashOffset(s, 0, 9)));
    expect(values.size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// industryGuess — pure helper
// ─────────────────────────────────────────────────────────────────────

describe("industryGuess", () => {
  it("classifies dairy names (incl. the Maha brand) → Dairy", () => {
    expect(industryGuess("Blue Meadow Dairy").en).toBe("Dairy");
    expect(industryGuess("Maha Foods").en).toBe("Dairy");
    expect(industryGuess("Mountain Cheese Co").en).toBe("Dairy");
  });
  it("classifies agriculture names (incl. Loran) → Agriculture", () => {
    expect(industryGuess("Loran Farms").en).toBe("Agriculture");
    expect(industryGuess("Sahara Agri Co.").en).toBe("Agriculture");
  });
  it("classifies hospitality names (incl. Arena) → Hospitality", () => {
    expect(industryGuess("Kasbah Resorts").en).toBe("Hospitality");
    expect(industryGuess("Arena Amman").en).toBe("Hospitality");
  });
  it("classifies education names (incl. Tank) → Education", () => {
    expect(industryGuess("Olive Tree Schools").en).toBe("Education");
    expect(industryGuess("Tank Incubator").en).toBe("Education");
  });
  it("classifies logistics names → Logistics", () => {
    expect(industryGuess("Northbay Logistics").en).toBe("Logistics");
  });
  it("is case-insensitive", () => {
    expect(industryGuess("BLUE MEADOW DAIRY").en).toBe("Dairy");
    expect(industryGuess("loran").en).toBe("Agriculture");
  });
  it("falls back to Diversified for an unrecognized name", () => {
    expect(industryGuess("Rivermint Retail").en).toBe("Diversified");
    expect(industryGuess("").en).toBe("Diversified");
  });
  it("always returns a non-empty Arabic + English pair", () => {
    for (const name of ["Dairy X", "Agri Y", "Hotel Z", "School W", "Logistics V", "Unknown"]) {
      const g = industryGuess(name);
      expect(g.ar).toBeTruthy();
      expect(g.en).toBeTruthy();
    }
  });
});
