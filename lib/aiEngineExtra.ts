// AI Engine — extra heuristics (H8, H9, H10).
//
// Same EngineInsight contract as lib/aiEngine.ts so callers can concat the
// outputs without touching the original engine. Each heuristic is independent
// and bilingual.

import "server-only";
import { prisma } from "./db";
import type { EngineInsight } from "./aiEngine";

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number, d = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: d,
  }).format(n);

const fmtMoney = (n: number, c = "JOD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(n);

const DAY_MS = 24 * 60 * 60 * 1000;

/* ──────────────────────────────────────────────────────────────────
   H8 — CROSS-COMPANY SYNERGY
   When hotel occupancy AND dairy production both spike in the same
   week, surface a bundled-promotion opportunity. The two units are
   already coupled by the predictive supply chain, so a coordinated
   commercial push compounds value.
   ────────────────────────────────────────────────────────────────── */
async function crossCompanySynergyHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * DAY_MS);
  const past7 = new Date(now.getTime() - 7 * DAY_MS);
  const past14 = new Date(now.getTime() - 14 * DAY_MS);

  const [hotels, recentDairy, priorDairy] = await Promise.all([
    prisma.hotel.findMany({
      include: {
        bookings: {
          where: {
            checkIn: { lte: next7 },
            checkOut: { gte: now },
            status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
          },
        },
      },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      where: { productionDate: { gte: past7 } },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      where: { productionDate: { gte: past14, lt: past7 } },
    }),
  ]);

  // Group occupancy across all hotels with capacity.
  const totalRooms = hotels.reduce((a, h) => a + h.totalRooms, 0);
  const occupiedRooms = hotels.reduce(
    (a, h) => a + h.bookings.reduce((b, x) => b + x.rooms, 0),
    0,
  );
  if (totalRooms === 0) return [];
  const occ = Math.min(1, occupiedRooms / totalRooms);

  const recentLiters = recentDairy._sum.quantityLiters ?? 0;
  const priorLiters = priorDairy._sum.quantityLiters ?? 0;
  if (priorLiters === 0) return [];
  const dairyDelta = (recentLiters - priorLiters) / priorLiters;

  // Both criteria must spike together for the synergy signal to fire.
  const occupancyHigh = occ >= 0.7;
  const dairySpiking = dairyDelta >= 0.2;
  if (!occupancyHigh || !dairySpiking) return [];

  return [
    {
      module: "SUPPLY",
      severity: "OPPORTUNITY",
      title_ar: `تآزر ضيافة×ألبان: إشغال ${fmtPct(occ, 0)} مع قفزة إنتاج ${fmtPct(dairyDelta, 0)}`,
      title_en: `Hospitality×Dairy synergy: ${fmtPct(occ, 0)} occupancy + ${fmtPct(dairyDelta, 0)} dairy spike`,
      body_ar:
        `إشغال فنادق المجموعة عند ${fmtPct(occ, 0)} للأسبوع القادم (${fmtNum(occupiedRooms)}/${fmtNum(totalRooms)} غرفة)، ` +
        `وإنتاج المها قفز ${fmtPct(dairyDelta, 0)} مقارنة بالأسبوع السابق (${fmtNum(recentLiters)} لتر مقابل ${fmtNum(priorLiters)}). ` +
        `الإجراء المقترح: إطلاق عرض حزمة (إفطار فاخر + لتر هدية) لاستثمار التزامن وتحريك المخزون قبل تراكمه.`,
      body_en:
        `Group hotel occupancy is ${fmtPct(occ, 0)} for the upcoming week (${fmtNum(occupiedRooms)}/${fmtNum(totalRooms)} rooms), ` +
        `and Maha output jumped ${fmtPct(dairyDelta, 0)} vs the prior week (${fmtNum(recentLiters)}L vs ${fmtNum(priorLiters)}L). ` +
        `Recommended: launch a bundled promotion (premium breakfast + complimentary liter) to monetize the alignment before stock accumulates.`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   H9 — COHORT VELOCITY
   Tank Incubator programs that have been ACCELERATING for >12 weeks
   without graduating. A program stuck in the accelerator past three
   months almost always needs an intervention or a graceful exit.
   ────────────────────────────────────────────────────────────────── */
async function cohortVelocityHeuristic(): Promise<EngineInsight[]> {
  const cutoff = new Date(Date.now() - 12 * 7 * DAY_MS); // ~12 weeks ago
  const stuck = await prisma.program.findMany({
    where: {
      stage: "ACCELERATING",
      // updatedAt before the cutoff = haven't moved stage in 12+ weeks.
      updatedAt: { lt: cutoff },
    },
    include: { company: true },
  });
  if (stuck.length === 0) return [];

  // One aggregate insight + one targeted insight for the most stalled program.
  const oldest = stuck.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
  const weeksSince = Math.floor(
    (Date.now() - oldest.updatedAt.getTime()) / (7 * DAY_MS),
  );

  return [
    {
      module: "EDUCATION",
      severity: stuck.length >= 3 ? "WARN" : "INFO",
      title_ar: `${stuck.length} برنامج في التسريع منذ أكثر من 12 أسبوعاً`,
      title_en: `${stuck.length} program${stuck.length === 1 ? "" : "s"} stuck in ACCELERATING for 12+ weeks`,
      body_ar:
        `حاضنة The Tank لديها ${stuck.length} برنامج لم يغيّر مرحلته خلال آخر 12 أسبوع. ` +
        `الأقدم: "${oldest.name}" بقيادة ${oldest.founder} منذ ${weeksSince} أسبوعاً. ` +
        `الإجراء المقترح: مراجعة معايير التخرج، توفير موجّه استراتيجي، أو إنهاء العلاقة بشكل لائق.`,
      body_en:
        `The Tank has ${stuck.length} programs that haven't changed stage in 12+ weeks. ` +
        `Oldest: "${oldest.nameEn ?? oldest.name}" led by ${oldest.founder} for ${weeksSince} weeks. ` +
        `Recommended: revisit graduation criteria, assign a strategic mentor, or graceful off-ramp.`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   H10 — CASH-BURN PROJECTION
   Project current expense pace 30 days forward; if it exceeds the
   projected revenue trajectory, flag CRITICAL. Group-level — a
   per-company sweep would create noise; the group view is what
   leadership cares about.
   ────────────────────────────────────────────────────────────────── */
async function cashBurnProjectionHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * DAY_MS);

  const [revenueAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { kind: "REVENUE", occurredAt: { gte: past30 } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { kind: "EXPENSE", occurredAt: { gte: past30 } },
    }),
  ]);

  const recentRevenue = revenueAgg._sum.amount ?? 0;
  const recentExpense = expenseAgg._sum.amount ?? 0;

  // Need at least some signal to project anything.
  if (recentRevenue === 0 && recentExpense === 0) return [];

  // Daily averages → 30-day projections (linear extrapolation; deliberately
  // simple — leadership reads this as a directional signal, not a forecast).
  const projectedRevenue = recentRevenue;
  const projectedExpense = recentExpense;
  const projectedNet = projectedRevenue - projectedExpense;

  if (projectedExpense <= projectedRevenue) {
    // Healthy or break-even — no insight needed.
    return [];
  }

  const burn = projectedExpense - projectedRevenue;
  const burnPct = projectedRevenue > 0 ? burn / projectedRevenue : 1;

  return [
    {
      module: "FINANCE",
      severity: "CRITICAL",
      title_ar: `إنذار حرق نقدي: مصاريف 30 يوم متوقعة تتجاوز الإيرادات بـ ${fmtMoney(burn)}`,
      title_en: `Cash burn alert: 30-day projected expenses exceed revenue by ${fmtMoney(burn)}`,
      body_ar:
        `بمعدل آخر 30 يوم، المجموعة على مسار صرف ${fmtMoney(projectedExpense)} مقابل إيرادات متوقعة ${fmtMoney(projectedRevenue)} ` +
        `للشهر القادم — صافي ${fmtMoney(projectedNet)} (نسبة الحرق ${fmtPct(burnPct, 0)} من الإيراد). ` +
        `الإجراء المقترح: تجميد التوظيف، مراجعة العقود التشغيلية، تسريع تحصيل الذمم.`,
      body_en:
        `At the last 30-day pace, the group is on track to spend ${fmtMoney(projectedExpense)} against projected revenue ${fmtMoney(projectedRevenue)} ` +
        `over the next 30 days — net ${fmtMoney(projectedNet)} (${fmtPct(burnPct, 0)} burn relative to revenue). ` +
        `Recommended: hiring freeze, operational contract review, accelerate receivables collection.`,
    },
  ];
}

/** Run H8 + H9 + H10 in parallel and concat results. */
export async function runEngineExtra(): Promise<EngineInsight[]> {
  const results = await Promise.all([
    crossCompanySynergyHeuristic(),
    cohortVelocityHeuristic(),
    cashBurnProjectionHeuristic(),
  ]);
  return results.flat();
}
