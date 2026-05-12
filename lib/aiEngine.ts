// AI Insight Engine — heuristic-based generator that scans live data across
// every module and emits structured insights ready to be persisted as
// AIInsight rows. Each heuristic returns an array of insights it discovered.
//
// This is the heart of Phase D: the system tells the leadership what
// matters BEFORE they ask. Each heuristic is independent, fast, and
// produces bilingual output.

import "server-only";
import { prisma } from "./db";

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
