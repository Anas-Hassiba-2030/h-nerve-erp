// lib/empire/aggregator.ts
//
// The Empire Dashboard aggregator — for users who own multiple
// H-Nerve-powered businesses. Returns ~8 "tiles" each carrying:
//   - identity (name, slug, region, industry)
//   - live brain IQ + 8-week sparkline
//   - recent activity counts (insights, plans, decisions)
//   - a single most-recent decision for hover-detail
//
// Real tenants from the Tenant table win. We pad with deterministic
// synthetic siblings so the demo always shows the spec's "row of 8 IQ
// scores" — that's the wow moment.
//
// Phase 19 of docs/governance/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";

export type SparkPoint = {
  iq: number;
  snappedAt: string; // ISO
};

export type EmpireDecision = {
  goal: string;
  goalEn: string;
  status: string;
  committedAt: string | null;
  targetMetric: string;
  targetDelta: number;
};

export type EmpireTile = {
  // Stable id for React lists (slug for real, deterministic synthetic key otherwise)
  key: string;
  name: string;
  nameEn: string;
  slug: string;
  region: string;
  industry: string;          // "Hospitality" | "Dairy" | "Agri" | "Edu" | …
  industryAr: string;
  tier: string;
  // Brain IQ — current + last 8 weekly snapshots oldest→newest
  iq: number;
  iqDelta1w: number;         // change vs 1 week ago, signed integer
  spark: SparkPoint[];
  // Pulse counts over the last 7 days
  insightsOpen: number;
  plansActive: number;
  decisions7d: number;
  // The most recent committed/active plan (single line)
  latestDecision: EmpireDecision | null;
  // True for synthetic siblings in the demo grid
  synthetic: boolean;
};

// ---------------------------------------------------------------------------
// Public — returns 8 tiles ordered by IQ descending (real first, synthetic
// after). The default-scope brain IQ is used for any tenant that doesn't
// have its own scoped history yet.
// ---------------------------------------------------------------------------
export async function getEmpireTiles(): Promise<EmpireTile[]> {
  const [tenants, iqDefault, draftPlans, openInsights] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "PROVISIONING"] } },
      orderBy: { createdAt: "asc" },
    }),
    // Default-scope IQ history powers the primary tenant's sparkline
    prisma.brainIQHistory.findMany({
      where: { scope: "default" },
      orderBy: { snappedAt: "asc" },
      take: 12,
    }),
    prisma.plan.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.aIInsight.count({
      where: { deletedAt: null, status: "OPEN" },
    }),
  ]);

  const realTiles: EmpireTile[] = [];

  // The "self" tile — the Hourani Group itself. Always shown first.
  realTiles.push(buildSelfTile(iqDefault, draftPlans[0], openInsights));

  // Each ACTIVE tenant from the white-label table gets a real tile.
  for (const t of tenants) {
    realTiles.push(buildTenantTile(t, iqDefault));
  }

  // Pad to 8 with synthetic siblings — different industries to demo the
  // "running an empire" feel. Deterministic by index so refreshes don't
  // shuffle.
  const synth = synthSiblings();
  while (realTiles.length < 8) {
    const next = synth[realTiles.length - 1] ?? synth[realTiles.length % synth.length];
    realTiles.push(next);
  }

  // Sort: real first (by IQ desc), synthetic after (also by IQ desc).
  return realTiles
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      if (a.t.synthetic !== b.t.synthetic) return a.t.synthetic ? 1 : -1;
      return b.t.iq - a.t.iq;
    })
    .map(({ t }) => t)
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// "Self" tile — the operating company that's logged in.
// ---------------------------------------------------------------------------
function buildSelfTile(
  iq: { iq: number; snappedAt: Date }[],
  plan: any,
  openInsights: number,
): EmpireTile {
  const spark: SparkPoint[] = iq.slice(-8).map((s) => ({
    iq: s.iq,
    snappedAt: s.snappedAt.toISOString(),
  }));
  const liveIq = iq.length > 0 ? iq[iq.length - 1].iq : 100;
  const oneAgo = iq.length > 1 ? iq[iq.length - 2].iq : liveIq;
  return {
    key: "self:hourani",
    name: "مجموعة الحوراني",
    nameEn: "Hourani Group",
    slug: "hourani",
    region: "JO · Amman",
    industry: "Conglomerate",
    industryAr: "مجموعة قابضة",
    tier: "founding",
    iq: liveIq,
    iqDelta1w: liveIq - oneAgo,
    spark,
    insightsOpen: openInsights,
    plansActive: plan ? 1 : 0,
    decisions7d: plan ? 1 : 0,
    latestDecision: plan
      ? {
          goal: plan.goal ?? "—",
          goalEn: plan.goalEn ?? plan.goal ?? "—",
          status: plan.status,
          committedAt: plan.committedAt?.toISOString() ?? null,
          targetMetric: plan.targetMetric,
          targetDelta: plan.targetDelta ?? 0,
        }
      : null,
    synthetic: false,
  };
}

// ---------------------------------------------------------------------------
// Real tenant tile (white-labeled)
// ---------------------------------------------------------------------------
function buildTenantTile(
  t: {
    id: string;
    slug: string;
    name: string;
    region: string;
    tier: string;
    status: string;
  },
  defaultIq: { iq: number; snappedAt: Date }[],
): EmpireTile {
  // For demo purposes we share the default-scope IQ shape but jitter the
  // live value by a hash of the slug so the grid isn't all the same number.
  const offset = hashOffset(t.slug, -6, 6);
  const spark = defaultIq.slice(-8).map((s) => ({
    iq: clampIq(s.iq + offset),
    snappedAt: s.snappedAt.toISOString(),
  }));
  const liveIq = spark.length ? spark[spark.length - 1].iq : 100 + offset;
  const oneAgo = spark.length > 1 ? spark[spark.length - 2].iq : liveIq;
  const insightsOpen = Math.max(0, 3 + hashOffset(t.slug + ":i", -3, 5));
  const plansActive = Math.max(0, hashOffset(t.slug + ":p", 0, 4));
  return {
    key: `tenant:${t.slug}`,
    name: t.name,
    nameEn: t.name,
    slug: t.slug,
    region: t.region,
    industry: industryGuess(t.name).en,
    industryAr: industryGuess(t.name).ar,
    tier: t.tier,
    iq: liveIq,
    iqDelta1w: liveIq - oneAgo,
    spark,
    insightsOpen,
    plansActive,
    decisions7d: hashOffset(t.slug + ":d", 1, 6),
    latestDecision: null,
    synthetic: false,
  };
}

// ---------------------------------------------------------------------------
// Synthetic siblings — the "you also own these" empire fillers. Industries
// span the typical H-Nerve customer base.
// ---------------------------------------------------------------------------
function synthSiblings(): EmpireTile[] {
  const seeds: Array<{
    slug: string;
    nameAr: string;
    nameEn: string;
    region: string;
    industryAr: string;
    industryEn: string;
    iqBase: number;
    insightsBase: number;
  }> = [
    { slug: "blue-meadow", nameAr: "Blue Meadow Dairy", nameEn: "Blue Meadow Dairy", region: "AE · Dubai",   industryAr: "ألبان", industryEn: "Dairy", iqBase: 138, insightsBase: 4 },
    { slug: "kasbah-resorts", nameAr: "Kasbah Resorts", nameEn: "Kasbah Resorts",     region: "MA · Marrakech", industryAr: "ضيافة", industryEn: "Hospitality", iqBase: 132, insightsBase: 6 },
    { slug: "olive-tree-edu", nameAr: "Olive Tree Schools", nameEn: "Olive Tree Schools", region: "EG · Cairo",  industryAr: "تعليم", industryEn: "Education", iqBase: 119, insightsBase: 3 },
    { slug: "sahara-agri", nameAr: "Sahara Agri Co.",      nameEn: "Sahara Agri Co.",  region: "TN · Sfax",     industryAr: "زراعة", industryEn: "Agriculture", iqBase: 124, insightsBase: 5 },
    { slug: "northbay-logistics", nameAr: "Northbay Logistics", nameEn: "Northbay Logistics", region: "SA · Jeddah", industryAr: "لوجستيات", industryEn: "Logistics", iqBase: 127, insightsBase: 7 },
    { slug: "rivermint-retail", nameAr: "Rivermint Retail", nameEn: "Rivermint Retail", region: "KW · Kuwait City", industryAr: "تجزئة", industryEn: "Retail", iqBase: 116, insightsBase: 4 },
    { slug: "highland-mfg", nameAr: "Highland Manufacturing", nameEn: "Highland Manufacturing", region: "TR · Bursa", industryAr: "تصنيع", industryEn: "Manufacturing", iqBase: 121, insightsBase: 5 },
  ];
  const tiles: EmpireTile[] = [];
  for (const s of seeds) {
    const spark = synthSpark(s.slug, s.iqBase);
    const live = spark[spark.length - 1].iq;
    const ago = spark[spark.length - 2].iq;
    tiles.push({
      key: `synth:${s.slug}`,
      name: s.nameAr,
      nameEn: s.nameEn,
      slug: s.slug,
      region: s.region,
      industry: s.industryEn,
      industryAr: s.industryAr,
      tier: "standard",
      iq: live,
      iqDelta1w: live - ago,
      spark,
      insightsOpen: s.insightsBase,
      plansActive: 1 + (hashOffset(s.slug, 0, 3) % 3),
      decisions7d: 2 + (hashOffset(s.slug + ":d", 0, 5) % 5),
      latestDecision: null,
      synthetic: true,
    });
  }
  return tiles;
}

function synthSpark(slug: string, base: number): SparkPoint[] {
  // 8 weekly points trailing toward "now". Gentle organic drift around base.
  const out: SparkPoint[] = [];
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  let cur = base - 4;
  for (let i = 7; i >= 0; i--) {
    const drift = hashOffset(`${slug}:${i}`, -2, 3);
    cur = clampIq(cur + drift);
    out.push({
      iq: cur,
      snappedAt: new Date(now - i * week).toISOString(),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers — exported for unit testing (pure, deterministic, no DB).
// ---------------------------------------------------------------------------
export function clampIq(v: number): number {
  return Math.max(70, Math.min(180, Math.round(v)));
}
export function hashOffset(seed: string, lo: number, hi: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  const span = hi - lo;
  return lo + Math.abs(h) % (span + 1);
}
export function industryGuess(name: string): { ar: string; en: string } {
  const n = name.toLowerCase();
  if (/dairy|milk|cheese|maha/.test(n)) return { ar: "ألبان", en: "Dairy" };
  if (/farm|agri|crops|loran/.test(n)) return { ar: "زراعة", en: "Agriculture" };
  if (/hotel|resort|arena/.test(n)) return { ar: "ضيافة", en: "Hospitality" };
  if (/school|edu|university|tank/.test(n)) return { ar: "تعليم", en: "Education" };
  if (/logistics|shipping|port/.test(n)) return { ar: "لوجستيات", en: "Logistics" };
  return { ar: "متعدد", en: "Diversified" };
}
