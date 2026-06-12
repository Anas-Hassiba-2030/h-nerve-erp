// lib/empire/summary.ts
//
// Phase 19 (Mission B surface) — the holding-company god-view aggregator.
//
// Distinct from lib/empire/aggregator.ts (which builds the 8 brain-IQ tiles
// at /admin/empire). THIS module powers the new /empire boardroom: a
// consolidated JOD revenue rollup, four sector pulse cards, the live council
// feed, the top causal drivers, and brain activity by tenant.
//
// CROSS-TENANT BY DESIGN. The whole point of the empire view is to read
// ACROSS every Company and tenant at once, so every query goes through
// `prismaUnscoped`. The route that calls this (app/api/empire/summary) and
// the layout that renders it (app/empire/layout.tsx) gate to EXECUTIVE+ so
// only a holding-company owner reaches it. Results are ATTRIBUTED by
// companyId / Workflow.scope into separate cards — one tenant's numbers
// never bleed into another's panel — but the rollup spans all of them.
//
// Read-mostly: this only reads. It never mutates domain data (brain boundary).

import { prismaUnscoped } from "@/lib/db/db"; // CROSS-TENANT INTENT: holding-company rollup across all companies/tenants

// ─────────────────────────────────────────────────────────────────────
// Public shapes
// ─────────────────────────────────────────────────────────────────────

export type RevenueRollup = {
  currency: string;
  currentMonthJod: number;
  lastMonthJod: number;
  deltaPct: number; // signed ratio: 0.12 = +12%, -0.05 = −5%
};

export type SectorKey = "HOSPITALITY" | "DAIRY" | "AGRICULTURE" | "EDUCATION";

export type SectorSummary = {
  key: SectorKey;
  labelAr: string;
  labelEn: string;
  companyCount: number;
  kpiLabelAr: string;
  kpiLabelEn: string;
  kpiValue: number;
  kpiUnitAr: string;
  kpiUnitEn: string;
  spark: number[]; // last 6 monthly points, oldest → newest
};

export type CouncilFeedItem = {
  id: string;
  topic: string;
  status: string;
  confidence: number | null;
  ranAt: string; // ISO
};

export type CausalDriver = {
  id: string;
  fromLabel: string;
  toLabel: string;
  weight: number;
  confidence: number;
  kind: string;
  rationale: string | null;
};

export type BrainActivityRow = { scope: string; runs: number };

export type EmpireSummary = {
  generatedAt: string;
  revenue: RevenueRollup;
  sectors: SectorSummary[];
  council: CouncilFeedItem[];
  drivers: CausalDriver[];
  brainActivity: { totalRuns7d: number; byScope: BrainActivityRow[] };
};

const SPARK_MONTHS = 6;

// ─────────────────────────────────────────────────────────────────────
// Pure date / math helpers — exported for unit tests (no DB).
// ─────────────────────────────────────────────────────────────────────

/** First instant of the UTC month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Shift a date by `n` whole UTC months (n may be negative). */
export function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

/** "YYYY-MM" key for the UTC month of `d`. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Signed period-over-period ratio. prev > 0 → (cur−prev)/prev. When prev is
 * 0 we can't divide: any positive current reads as +100% (1), else flat (0).
 * Never returns NaN/Infinity.
 */
export function pctDelta(cur: number, prev: number): number {
  if (prev > 0) return (cur - prev) / prev;
  return cur > 0 ? 1 : 0;
}

/**
 * Bucket dated values into the last `months` UTC months ending at `now`,
 * oldest → newest. Returns a fixed-length array (one summed value per month;
 * gaps are 0). Items outside the window are ignored. Pure — `now` injected.
 */
export function bucketByMonth(
  items: Array<{ date: Date; value: number }>,
  months: number,
  now: Date,
): number[] {
  // Build the ordered window of month keys.
  const keys: string[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const k = monthKey(addMonths(now, -i));
    index.set(k, keys.length);
    keys.push(k);
  }
  const out = new Array<number>(months).fill(0);
  for (const it of items) {
    const slot = index.get(monthKey(it.date));
    if (slot !== undefined) out[slot] += it.value;
  }
  return out;
}

/** Occupancy percentage (0–100, integer). 0 total rooms → 0 (no divide-by-zero). */
export function occupancyPct(occupiedRooms: number, totalRooms: number): number {
  if (totalRooms <= 0) return 0;
  // Clamp to 0–100: overlapping/over-booked confirmed bookings can sum past
  // totalRooms, which must not render as e.g. "127%".
  return Math.max(0, Math.min(100, Math.round((occupiedRooms / totalRooms) * 100)));
}

// ─────────────────────────────────────────────────────────────────────
// The aggregator. `now` is injectable for determinism / testing.
// ─────────────────────────────────────────────────────────────────────

export async function getEmpireSummary(now: Date = new Date()): Promise<EmpireSummary> {
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(monthStart, -1);
  const sparkFloor = addMonths(monthStart, -(SPARK_MONTHS - 1));
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // Companies → sector buckets (one cheap query drives all four cards).
  const companies = await prismaUnscoped.company.findMany({
    select: { id: true, sector: true },
  });
  const idsBySector = (sector: SectorKey) =>
    companies.filter((c) => c.sector === sector).map((c) => c.id);
  const hotelCompanyIds = idsBySector("HOSPITALITY");
  const dairyCompanyIds = idsBySector("DAIRY");
  const agriCompanyIds = idsBySector("AGRICULTURE");
  const eduCompanyIds = idsBySector("EDUCATION");

  const [
    revenueTx,
    hotels,
    bookings,
    dairyBatches,
    farms,
    council,
    edgesCausal,
    workflowRuns,
    programs,
  ] = await Promise.all([
    // Consolidated JOD revenue — current + last month in one pull.
    prismaUnscoped.transaction.findMany({
      where: { kind: "REVENUE", currency: "JOD", occurredAt: { gte: lastMonthStart } },
      select: { amount: true, occurredAt: true },
    }),
    prismaUnscoped.hotel.findMany({
      where: { companyId: { in: hotelCompanyIds } },
      select: { id: true, totalRooms: true },
    }),
    // Bookings in the spark window (also covers "current" for occupancy).
    prismaUnscoped.booking.findMany({
      where: {
        hotel: { companyId: { in: hotelCompanyIds } },
        checkIn: { gte: sparkFloor },
      },
      select: { rooms: true, revenue: true, status: true, checkIn: true, checkOut: true },
    }),
    prismaUnscoped.dairyBatch.findMany({
      where: { companyId: { in: dairyCompanyIds }, productionDate: { gte: sparkFloor } },
      select: { quantityLiters: true, productionDate: true },
    }),
    prismaUnscoped.farm.findMany({
      where: { companyId: { in: agriCompanyIds } },
      select: { id: true, crops: { select: { status: true, expectedYieldKg: true, plantedAt: true } } },
    }),
    prismaUnscoped.councilSession.findMany({
      orderBy: { ranAt: "desc" },
      take: 5,
      select: { id: true, topic: true, status: true, confidence: true, ranAt: true },
    }),
    prismaUnscoped.brainEdge.findMany({
      orderBy: [{ confidence: "desc" }, { weight: "desc" }],
      take: 24, // over-fetch; we prefer causal/learned then trim to 3
      select: {
        id: true, kind: true, weight: true, confidence: true, rationale: true,
        from: { select: { label: true } },
        to: { select: { label: true } },
      },
    }),
    prismaUnscoped.workflowRun.findMany({
      where: { startedAt: { gte: sevenDaysAgo } },
      select: { workflow: { select: { scope: true } } },
    }),
    prismaUnscoped.program.findMany({
      where: { companyId: { in: eduCompanyIds } },
      select: { stage: true, teamSize: true, createdAt: true },
    }),
  ]);

  // ── Revenue rollup ──
  let currentMonthJod = 0;
  let lastMonthJod = 0;
  for (const tx of revenueTx) {
    if (tx.occurredAt >= monthStart) currentMonthJod += tx.amount;
    else lastMonthJod += tx.amount;
  }
  const revenue: RevenueRollup = {
    currency: "JOD",
    currentMonthJod: Math.round(currentMonthJod),
    lastMonthJod: Math.round(lastMonthJod),
    deltaPct: pctDelta(currentMonthJod, lastMonthJod),
  };

  // ── Hotel sector ──
  const totalRooms = hotels.reduce((s, h) => s + h.totalRooms, 0);
  const occupiedRooms = bookings
    .filter(
      (b) =>
        (b.status === "CONFIRMED" || b.status === "CHECKED_IN") &&
        b.checkIn <= now &&
        b.checkOut > now,
    )
    .reduce((s, b) => s + b.rooms, 0);
  const hotelSpark = bucketByMonth(
    bookings.map((b) => ({ date: b.checkIn, value: b.revenue })),
    SPARK_MONTHS,
    now,
  );
  const hotelSector: SectorSummary = {
    key: "HOSPITALITY",
    labelAr: "الضيافة",
    labelEn: "Hospitality",
    companyCount: hotelCompanyIds.length,
    kpiLabelAr: "الإشغال",
    kpiLabelEn: "Occupancy",
    kpiValue: occupancyPct(occupiedRooms, totalRooms),
    kpiUnitAr: "%",
    kpiUnitEn: "%",
    spark: hotelSpark,
  };

  // ── Dairy sector ──
  const dairyLitersThisMonth = dairyBatches
    .filter((b) => b.productionDate >= monthStart)
    .reduce((s, b) => s + b.quantityLiters, 0);
  const dairySpark = bucketByMonth(
    dairyBatches.map((b) => ({ date: b.productionDate, value: b.quantityLiters })),
    SPARK_MONTHS,
    now,
  );
  const dairySector: SectorSummary = {
    key: "DAIRY",
    labelAr: "الألبان",
    labelEn: "Dairy",
    companyCount: dairyCompanyIds.length,
    kpiLabelAr: "إنتاج الشهر",
    kpiLabelEn: "Output (mo)",
    kpiValue: Math.round(dairyLitersThisMonth),
    kpiUnitAr: "لتر",
    kpiUnitEn: "L",
    spark: dairySpark,
  };

  // ── Agriculture sector ──
  const crops = farms.flatMap((f) => f.crops);
  const activeCrops = crops.filter((c) => c.status === "GROWING").length;
  const agriSpark = bucketByMonth(
    crops.map((c) => ({ date: c.plantedAt, value: c.expectedYieldKg })),
    SPARK_MONTHS,
    now,
  );
  const agriSector: SectorSummary = {
    key: "AGRICULTURE",
    labelAr: "الزراعة",
    labelEn: "Agriculture",
    companyCount: agriCompanyIds.length,
    kpiLabelAr: "محاصيل نشطة",
    kpiLabelEn: "Active crops",
    kpiValue: activeCrops,
    kpiUnitAr: "محصول",
    kpiUnitEn: "crops",
    spark: agriSpark,
  };

  // ── Education sector ──
  // NOTE: the Program model carries no enrollment/attendance/completion
  // columns — the closest available signals are program count (activity) and
  // teamSize (an enrollment proxy). KPI = active programs; spark = monthly
  // cohort intake by createdAt. Documented intentionally.
  const eduSpark = bucketByMonth(
    programs.map((p) => ({ date: p.createdAt, value: 1 })),
    SPARK_MONTHS,
    now,
  );
  const eduSector: SectorSummary = {
    key: "EDUCATION",
    labelAr: "التعليم",
    labelEn: "Education",
    companyCount: eduCompanyIds.length,
    kpiLabelAr: "برامج نشطة",
    kpiLabelEn: "Active programs",
    kpiValue: programs.length,
    kpiUnitAr: "برنامج",
    kpiUnitEn: "programs",
    spark: eduSpark,
  };

  // ── Council feed ──
  const councilFeed: CouncilFeedItem[] = council.map((c) => ({
    id: c.id,
    topic: c.topic,
    status: c.status,
    confidence: c.confidence,
    ranAt: c.ranAt.toISOString(),
  }));

  // ── Causal drivers — prefer hand-authored/learned edges, fall back to any ──
  const preferred = edgesCausal.filter((e) => e.kind === "causal" || e.kind === "learned");
  const driverSource = (preferred.length >= 3 ? preferred : edgesCausal).slice(0, 3);
  const drivers: CausalDriver[] = driverSource.map((e) => ({
    id: e.id,
    fromLabel: e.from.label,
    toLabel: e.to.label,
    weight: e.weight,
    confidence: e.confidence,
    kind: e.kind,
    rationale: e.rationale,
  }));

  // ── Brain activity by tenant (Workflow.scope) ──
  const scopeCounts = new Map<string, number>();
  for (const r of workflowRuns) {
    const scope = r.workflow?.scope ?? "default";
    scopeCounts.set(scope, (scopeCounts.get(scope) ?? 0) + 1);
  }
  const byScope: BrainActivityRow[] = [...scopeCounts.entries()]
    .map(([scope, runs]) => ({ scope, runs }))
    .sort((a, b) => b.runs - a.runs);

  return {
    generatedAt: now.toISOString(),
    revenue,
    sectors: [hotelSector, dairySector, agriSector, eduSector],
    council: councilFeed,
    drivers,
    brainActivity: {
      totalRuns7d: workflowRuns.length,
      byScope,
    },
  };
}
