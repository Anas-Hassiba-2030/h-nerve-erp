// AI Insight Engine — heuristic-based generator that scans live data across
// every module and emits structured insights ready to be persisted as
// AIInsight rows. Each heuristic returns an array of insights it discovered.
//
// This is the heart of Phase D: the system tells the leadership what
// matters BEFORE they ask. Each heuristic is independent, fast, and
// produces bilingual output.

import "server-only";
import { prisma } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type EngineInsight = {
  module: "HOTELS" | "DAIRY" | "FARMS" | "SUPPLY" | "FINANCE" | "EDUCATION";
  severity: "INFO" | "WARN" | "CRITICAL" | "OPPORTUNITY";
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
};

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

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 1 — DAIRY EXPIRY RUSH
   Flags batches expiring in <72h that aren't yet distributed.
   ────────────────────────────────────────────────────────────────── */
async function dairyExpiryHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const next72 = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const expiring = await prisma.dairyBatch.findMany({
    where: {
      expiryDate: { gte: now, lte: next72 },
      status: { in: ["READY", "QC", "IN_PRODUCTION"] },
    },
  });
  if (expiring.length === 0) return [];

  const totalLiters = expiring.reduce((a, b) => a + b.quantityLiters, 0);
  return [
    {
      module: "DAIRY",
      severity: expiring.length >= 3 ? "CRITICAL" : "WARN",
      title_ar: `صلاحية ${expiring.length} دفعة ألبان قريبة (${fmtNum(totalLiters)}L)`,
      title_en: `${expiring.length} dairy batches near expiry (${fmtNum(totalLiters)}L)`,
      body_ar:
        `وجد المحرك ${expiring.length} دفعة (إجمالي ${fmtNum(totalLiters)} لتر) ` +
        `تنتهي صلاحيتها خلال 72 ساعة ولم تُوزّع بعد. ` +
        `الإجراء المقترح: إعطاء أولوية توزيع لها على فنادق أرينا أو إصدار خصم سريع.`,
      body_en:
        `Engine found ${expiring.length} batches (${fmtNum(totalLiters)} L total) ` +
        `expiring within 72h and not yet distributed. ` +
        `Recommended: prioritize delivery to Arena hotels or issue a flash discount.`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 2 — FARM SENSOR ALERT
   Any farm in CRITICAL / WARN state.
   ────────────────────────────────────────────────────────────────── */
async function farmAlertHeuristic(): Promise<EngineInsight[]> {
  const farms = await prisma.farm.findMany({
    where: { alertLevel: { in: ["WARN", "CRITICAL"] } },
  });
  if (farms.length === 0) return [];
  const out: EngineInsight[] = [];
  for (const f of farms) {
    const sev: EngineInsight["severity"] =
      f.alertLevel === "CRITICAL" ? "CRITICAL" : "WARN";
    out.push({
      module: "FARMS",
      severity: sev,
      title_ar: `تنبيه ${sev === "CRITICAL" ? "حرج" : "تحذيري"} في مزرعة ${f.name}`,
      title_en: `${sev === "CRITICAL" ? "Critical" : "Warning"} alert at ${f.nameEn ?? f.name}`,
      body_ar:
        `قراءات مستشعرات ${f.name} خرجت عن النطاق الطبيعي. ` +
        `حرارة: ${f.tempC ?? "—"}°C · رطوبة: ${f.humidity ?? "—"}% · رطوبة التربة: ${f.soilMoisture ?? "—"}%. ` +
        `الإجراء المقترح: زيارة ميدانية فورية وفحص نظام الري.`,
      body_en:
        `Sensors at ${f.nameEn ?? f.name} are out of normal range. ` +
        `Temp: ${f.tempC ?? "—"}°C · Humidity: ${f.humidity ?? "—"}% · Soil moisture: ${f.soilMoisture ?? "—"}%. ` +
        `Recommended: immediate field visit + irrigation check.`,
    });
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 3 — HOTEL OCCUPANCY OPPORTUNITY
   When a hotel has occupancy >= 80% for upcoming 7 days, push a
   forecast signal to dairy/produce.
   ────────────────────────────────────────────────────────────────── */
async function hotelOccupancyHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hotels = await prisma.hotel.findMany({
    include: {
      bookings: {
        where: {
          checkIn: { lte: next7 },
          checkOut: { gte: now },
          status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        },
      },
    },
  });
  const out: EngineInsight[] = [];
  for (const h of hotels) {
    if (!h.totalRooms) continue;
    const occupied = h.bookings.reduce((a, b) => a + b.rooms, 0);
    const occ = occupied / h.totalRooms;
    if (occ >= 0.8) {
      out.push({
        module: "HOTELS",
        severity: "OPPORTUNITY",
        title_ar: `إشغال مرتفع: ${h.name} (${fmtPct(occ, 0)}) — فرصة لتنسيق التوريد`,
        title_en: `High occupancy: ${h.nameEn ?? h.name} (${fmtPct(occ, 0)}) — supply chain opportunity`,
        body_ar:
          `${h.name} يحقق إشغال ${fmtPct(occ, 0)} للأسبوع القادم (${occupied} غرفة من ${h.totalRooms}). ` +
          `الإجراء المقترح: تنبيه المها ولوران مسبقاً لتجهيز إمدادات الإفطار والمطبخ.`,
        body_en:
          `${h.nameEn ?? h.name} hits ${fmtPct(occ, 0)} occupancy for the upcoming week (${occupied}/${h.totalRooms} rooms). ` +
          `Recommended: alert Maha and Loran ahead of time to pre-stage breakfast & kitchen supply.`,
      });
    } else if (occ <= 0.2 && h.bookings.length > 0) {
      out.push({
        module: "HOTELS",
        severity: "WARN",
        title_ar: `إشغال منخفض: ${h.name} (${fmtPct(occ, 0)}) — راجع التسعير`,
        title_en: `Low occupancy: ${h.nameEn ?? h.name} (${fmtPct(occ, 0)}) — pricing review`,
        body_ar:
          `${h.name} عند ${fmtPct(occ, 0)} للأسبوع القادم. ` +
          `الإجراء المقترح: حملة سعرية أو شراكة مع وكالات سفر إقليمية.`,
        body_en:
          `${h.nameEn ?? h.name} sitting at ${fmtPct(occ, 0)} for the upcoming week. ` +
          `Recommended: pricing campaign or regional travel agency partnership.`,
      });
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 4 — REVENUE TREND REVERSAL
   Compares last 14d to previous 14d revenue per company.
   ────────────────────────────────────────────────────────────────── */
async function revenueTrendHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const past14 = new Date(now.getTime() - 14 * dayMs);
  const past28 = new Date(now.getTime() - 28 * dayMs);

  const [companies, txs] = await Promise.all([
    prisma.company.findMany(),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: past28 } },
    }),
  ]);

  const out: EngineInsight[] = [];
  for (const c of companies) {
    const recent = txs
      .filter(
        (t) => t.kind === "REVENUE" && t.companyId === c.id && t.occurredAt >= past14,
      )
      .reduce((a, t) => a + t.amount, 0);
    const previous = txs
      .filter(
        (t) =>
          t.kind === "REVENUE" &&
          t.companyId === c.id &&
          t.occurredAt >= past28 &&
          t.occurredAt < past14,
      )
      .reduce((a, t) => a + t.amount, 0);

    if (previous === 0) continue;
    const delta = (recent - previous) / previous;

    if (delta <= -0.25) {
      out.push({
        module: "FINANCE",
        severity: "CRITICAL",
        title_ar: `تراجع إيرادات ${c.name} بنسبة ${fmtPct(Math.abs(delta), 1)}`,
        title_en: `Revenue drop at ${c.nameEn} by ${fmtPct(Math.abs(delta), 1)}`,
        body_ar:
          `إيرادات ${c.name} في آخر 14 يوم: ${fmtMoney(recent)} مقابل ${fmtMoney(previous)} ` +
          `في الأسبوعين السابقين — تراجع ${fmtPct(Math.abs(delta), 1)}. ` +
          `الإجراء المقترح: مراجعة عاجلة للتسعير، الحملات التسويقية، والمنافسة.`,
        body_en:
          `${c.nameEn} revenue last 14d: ${fmtMoney(recent)} vs ${fmtMoney(previous)} ` +
          `in the prior 14d — ${fmtPct(Math.abs(delta), 1)} drop. ` +
          `Recommended: urgent review of pricing, campaigns, competitive landscape.`,
      });
    } else if (delta >= 0.30) {
      out.push({
        module: "FINANCE",
        severity: "OPPORTUNITY",
        title_ar: `قفزة إيرادات ${c.name} +${fmtPct(delta, 1)}`,
        title_en: `${c.nameEn} revenue surge +${fmtPct(delta, 1)}`,
        body_ar:
          `إيرادات ${c.name} ارتفعت ${fmtPct(delta, 1)} في آخر 14 يوم (${fmtMoney(recent)}). ` +
          `الإجراء المقترح: استثمر في توسعة الطاقة، احجز موارد إضافية للطلب.`,
        body_en:
          `${c.nameEn} revenue jumped ${fmtPct(delta, 1)} in the last 14d (${fmtMoney(recent)}). ` +
          `Recommended: invest in capacity expansion, lock supplemental resources.`,
      });
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 5 — ESG GAP
   Companies whose ESG is below the group average.
   ────────────────────────────────────────────────────────────────── */
async function esgGapHeuristic(): Promise<EngineInsight[]> {
  const scores = await prisma.sustainabilityScore.findMany({
    orderBy: [{ year: "desc" }, { period: "desc" }],
    include: { company: true },
  });
  if (scores.length === 0) return [];

  // Latest score per company
  const latest = new Map<string, typeof scores[0]>();
  for (const s of scores) {
    if (!latest.has(s.companyId)) latest.set(s.companyId, s);
  }
  const values = [...latest.values()];
  if (values.length === 0) return [];

  const avg = values.reduce((a, s) => a + s.overall, 0) / values.length;
  const out: EngineInsight[] = [];
  for (const s of values) {
    const gap = s.overall - avg;
    if (gap <= -10) {
      out.push({
        module: "FINANCE",
        severity: "WARN",
        title_ar: `ESG ${s.company.name} تحت متوسط المجموعة`,
        title_en: `${s.company.nameEn} ESG below group average`,
        body_ar:
          `تقييم ESG لـ ${s.company.name} هو ${s.overall.toFixed(1)} مقابل ` +
          `${avg.toFixed(1)} متوسط المجموعة (فجوة ${gap.toFixed(1)} نقطة). ` +
          `الإجراء المقترح: خطة تحسين بيئي/اجتماعي للربع القادم.`,
        body_en:
          `${s.company.nameEn} ESG score is ${s.overall.toFixed(1)} vs ` +
          `group average ${avg.toFixed(1)} (${gap.toFixed(1)} point gap). ` +
          `Recommended: environmental/social improvement plan for next quarter.`,
      });
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 6 — STALE FORECAST DRAFTS
   Forecasts in DRAFT for >7 days waiting for approval.
   ────────────────────────────────────────────────────────────────── */
async function staleForecastsHeuristic(): Promise<EngineInsight[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await prisma.supplyForecast.findMany({
    where: {
      status: "DRAFT",
      deletedAt: null,
      createdAt: { lt: sevenDaysAgo },
    },
  });
  if (stale.length === 0) return [];
  return [
    {
      module: "SUPPLY",
      severity: "WARN",
      title_ar: `${stale.length} تنبؤات معلّقة بدون قرار منذ أسبوع`,
      title_en: `${stale.length} forecasts pending decision for over a week`,
      body_ar:
        `هناك ${stale.length} تنبؤ AI لم يُتخذ بشأنها قرار منذ 7 أيام أو أكثر. ` +
        `كل تأخير يقلل دقة الإشارة. الإجراء المقترح: مراجعة سريعة من قبل القيادة.`,
      body_en:
        `${stale.length} AI forecasts have been awaiting a decision for 7+ days. ` +
        `Every delay erodes signal accuracy. Recommended: leadership quick-review.`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   HEURISTIC 7 — TOP-MARGIN OPPORTUNITY
   Identify the highest-margin company and suggest doubling down.
   ────────────────────────────────────────────────────────────────── */
async function topMarginHeuristic(): Promise<EngineInsight[]> {
  const now = new Date();
  const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [companies, txs] = await Promise.all([
    prisma.company.findMany(),
    prisma.transaction.findMany({ where: { occurredAt: { gte: past90 } } }),
  ]);
  let best: { company: any; margin: number; revenue: number } | null = null;
  for (const c of companies) {
    const rev = txs
      .filter((t) => t.companyId === c.id && t.kind === "REVENUE")
      .reduce((a, t) => a + t.amount, 0);
    const exp = txs
      .filter((t) => t.companyId === c.id && t.kind === "EXPENSE")
      .reduce((a, t) => a + t.amount, 0);
    if (rev <= 0) continue;
    const margin = (rev - exp) / rev;
    if (!best || margin > best.margin) best = { company: c, margin, revenue: rev };
  }
  if (!best || best.margin < 0.4) return [];
  return [
    {
      module: "FINANCE",
      severity: "OPPORTUNITY",
      title_ar: `${best.company.name} بأعلى هامش في المجموعة (${fmtPct(best.margin, 1)})`,
      title_en: `${best.company.nameEn} leads group margin (${fmtPct(best.margin, 1)})`,
      body_ar:
        `${best.company.name} يحقق هامش ${fmtPct(best.margin, 1)} على إيراد ${fmtMoney(best.revenue)} ` +
        `في آخر 90 يوم. الإجراء المقترح: تخصيص نسبة أعلى من ميزانية النمو لهذه الوحدة.`,
      body_en:
        `${best.company.nameEn} achieves ${fmtPct(best.margin, 1)} margin on ${fmtMoney(best.revenue)} ` +
        `revenue over 90d. Recommended: allocate a larger share of growth budget here.`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   RUN ENGINE
   ────────────────────────────────────────────────────────────────── */
export async function runEngine(): Promise<EngineInsight[]> {
  const results = await Promise.all([
    dairyExpiryHeuristic(),
    farmAlertHeuristic(),
    hotelOccupancyHeuristic(),
    revenueTrendHeuristic(),
    esgGapHeuristic(),
    staleForecastsHeuristic(),
    topMarginHeuristic(),
  ]);
  return results.flat();
}

/* ══════════════════════════════════════════════════════════════════
   EXTRA HEURISTICS (H8–H10) — folded in from lib/aiEngineExtra.ts.
   Same EngineInsight contract; callers concat runEngine + runEngineExtra.
   ══════════════════════════════════════════════════════════════════ */

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

/** Persist the generated insights as AIInsight rows, deduping against
 *  existing OPEN insights with identical title in the last 24 hours. */
export async function persistInsights(
  insights: EngineInsight[],
  authorId: string | null,
  locale: "ar" | "en" = "ar",
): Promise<{ created: number; skipped: number }> {
  if (insights.length === 0) return { created: 0, skipped: 0 };

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.aIInsight.findMany({
    where: { createdAt: { gte: last24h }, deletedAt: null },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((e) => e.title.trim().toLowerCase()));

  let created = 0;
  let skipped = 0;
  for (const ins of insights) {
    const title = locale === "ar" ? ins.title_ar : ins.title_en;
    const body = locale === "ar" ? ins.body_ar : ins.body_en;
    if (existingTitles.has(title.trim().toLowerCase())) {
      skipped += 1;
      continue;
    }
    await prisma.aIInsight.create({
      data: {
        module: ins.module,
        severity: ins.severity,
        title,
        body,
        authorId,
        status: "OPEN",
      },
    });
    created += 1;
  }
  return { created, skipped };
}
