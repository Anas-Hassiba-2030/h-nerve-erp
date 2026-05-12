// Alert rule evaluator — runs the active AlertRule rows from the database
// against live data, emits EngineInsight entries when thresholds trip, and
// honors per-rule cooldowns. Designed to be called from runEngine() or any
// `/insights` server action via `evaluateAndPersistAlerts()`.
//
// Lives in a separate file from lib/alertEngine.ts (which holds the kind
// catalogue and seed routine) per the explicit module split.

import "server-only";
import { prisma } from "./db";
import type { AlertKind, AlertSeverity } from "./alertEngine";
import type { EngineInsight } from "./aiEngine";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

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

// Rule shape we read — mirrors the AlertRule model fields we need.
type Rule = {
  id: string;
  kind: string;
  name: string;
  nameEn: string | null;
  severity: string;
  threshold: number;
  scopeCompanyId: string | null;
  cooldownHours: number;
  lastTriggered: Date | null;
};

export type FiredAlert = {
  ruleId: string;
  kind: AlertKind;
  insight: EngineInsight;
};

function severityOf(rule: Rule): AlertSeverity {
  const s = rule.severity as AlertSeverity;
  return s === "INFO" || s === "WARN" || s === "CRITICAL" || s === "OPPORTUNITY"
    ? s
    : "WARN";
}

// ──────────────────────────────────────────────────────────────────
// Per-kind evaluators. Each returns 0..N insights (multiple records may
// match a single rule, e.g. several companies dropping revenue).
// Threshold semantics match the catalogue in lib/alertEngine.ts:
//   - percent kinds: stored as the percentage NUMBER (25 = 25%)
//   - hour kinds:    stored in hours
//   - day kinds:     stored in days
//   - count kinds:   stored as a count
// ──────────────────────────────────────────────────────────────────

async function evalRevenueDrop(rule: Rule): Promise<EngineInsight[]> {
  const dropFrac = rule.threshold / 100;
  const now = Date.now();
  const past14 = new Date(now - 14 * DAY_MS);
  const past28 = new Date(now - 28 * DAY_MS);

  const companyWhere = rule.scopeCompanyId ? { id: rule.scopeCompanyId } : {};
  const [companies, txs] = await Promise.all([
    prisma.company.findMany({ where: companyWhere }),
    prisma.transaction.findMany({
      where: {
        occurredAt: { gte: past28 },
        ...(rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {}),
      },
    }),
  ]);

  const out: EngineInsight[] = [];
  for (const c of companies) {
    const recent = txs
      .filter((t) => t.kind === "REVENUE" && t.companyId === c.id && t.occurredAt >= past14)
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
    if (delta <= -dropFrac) {
      out.push({
        module: "FINANCE",
        severity: severityOf(rule),
        title_ar: `[${rule.name}] تراجع إيرادات ${c.name} ${fmtPct(Math.abs(delta), 1)}`,
        title_en: `[${rule.nameEn ?? rule.name}] ${c.nameEn} revenue down ${fmtPct(Math.abs(delta), 1)}`,
        body_ar:
          `أطلقت قاعدة "${rule.name}" (عتبة ${rule.threshold}%) — ${c.name} حقّق ` +
          `${fmtMoney(recent)} في آخر 14 يوم مقابل ${fmtMoney(previous)} للأسبوعين السابقين. ` +
          `الإجراء المقترح: مراجعة عاجلة للتسعير والحملات.`,
        body_en:
          `Rule "${rule.nameEn ?? rule.name}" (threshold ${rule.threshold}%) fired — ${c.nameEn} earned ` +
          `${fmtMoney(recent)} in the last 14 days vs ${fmtMoney(previous)} the prior 14. ` +
          `Recommended: urgent pricing/campaign review.`,
      });
    }
  }
  return out;
}

async function evalOccupancyHigh(rule: Rule): Promise<EngineInsight[]> {
  const occFrac = rule.threshold / 100;
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * DAY_MS);
  const hotels = await prisma.hotel.findMany({
    where: rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {},
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
    const occ = Math.min(1, occupied / h.totalRooms);
    if (occ >= occFrac) {
      out.push({
        module: "HOTELS",
        severity: severityOf(rule),
        title_ar: `[${rule.name}] إشغال ${h.name} ${fmtPct(occ, 0)}`,
        title_en: `[${rule.nameEn ?? rule.name}] ${h.nameEn ?? h.name} at ${fmtPct(occ, 0)} occupancy`,
        body_ar:
          `أطلقت قاعدة "${rule.name}" (عتبة ${rule.threshold}%) — ${h.name} يحقّق ${fmtPct(occ, 0)} إشغال للأسبوع القادم ` +
          `(${fmtNum(occupied)} غرفة من ${fmtNum(h.totalRooms)}). تنبيه المها ولوران لتجهيز الإمدادات مسبقاً.`,
        body_en:
          `Rule "${rule.nameEn ?? rule.name}" (threshold ${rule.threshold}%) fired — ${h.nameEn ?? h.name} sits at ${fmtPct(occ, 0)} ` +
          `for the upcoming week (${fmtNum(occupied)}/${fmtNum(h.totalRooms)}). Pre-stage Maha + Loran supply.`,
      });
    }
  }
  return out;
}

async function evalOccupancyLow(rule: Rule): Promise<EngineInsight[]> {
  const occFrac = rule.threshold / 100;
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * DAY_MS);
  const hotels = await prisma.hotel.findMany({
    where: rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {},
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
    if (!h.totalRooms || h.bookings.length === 0) continue;
    const occupied = h.bookings.reduce((a, b) => a + b.rooms, 0);
    const occ = occupied / h.totalRooms;
    if (occ <= occFrac) {
      out.push({
        module: "HOTELS",
        severity: severityOf(rule),
        title_ar: `[${rule.name}] إشغال ${h.name} ${fmtPct(occ, 0)} فقط`,
        title_en: `[${rule.nameEn ?? rule.name}] ${h.nameEn ?? h.name} only ${fmtPct(occ, 0)} occupied`,
        body_ar:
          `أطلقت قاعدة "${rule.name}" (حد ${rule.threshold}%) — ${h.name} عند ${fmtPct(occ, 0)} للأسبوع القادم. ` +
          `الإجراء المقترح: حملة سعرية أو شراكة وكالة سفر.`,
        body_en:
          `Rule "${rule.nameEn ?? rule.name}" (min ${rule.threshold}%) fired — ${h.nameEn ?? h.name} at ${fmtPct(occ, 0)} for next week. ` +
          `Recommended: pricing campaign or travel agency partnership.`,
      });
    }
  }
  return out;
}

async function evalExpirySoon(rule: Rule): Promise<EngineInsight[]> {
  const hours = rule.threshold;
  const now = new Date();
  const horizon = new Date(now.getTime() + hours * HOUR_MS);
  const expiring = await prisma.dairyBatch.findMany({
    where: {
      expiryDate: { gte: now, lte: horizon },
      status: { in: ["READY", "QC", "IN_PRODUCTION"] },
      ...(rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {}),
    },
  });
  if (expiring.length === 0) return [];
  const totalLiters = expiring.reduce((a, b) => a + b.quantityLiters, 0);
  return [
    {
      module: "DAIRY",
      severity: severityOf(rule),
      title_ar: `[${rule.name}] صلاحية ${expiring.length} دفعة قريبة (${fmtNum(totalLiters)}L)`,
      title_en: `[${rule.nameEn ?? rule.name}] ${expiring.length} dairy batches expiring (${fmtNum(totalLiters)}L)`,
      body_ar:
        `أطلقت قاعدة "${rule.name}" (نافذة ${hours} ساعة) — ${expiring.length} دفعة بإجمالي ` +
        `${fmtNum(totalLiters)} لتر تنتهي صلاحيتها قريباً ولم تُوزّع. الإجراء: أولوية توزيع لفنادق أرينا أو خصم سريع.`,
      body_en:
        `Rule "${rule.nameEn ?? rule.name}" (${hours}h window) fired — ${expiring.length} batches totaling ` +
        `${fmtNum(totalLiters)} L expire soon and aren't distributed. Action: priority delivery to Arena or flash discount.`,
    },
  ];
}

async function evalFarmCritical(rule: Rule): Promise<EngineInsight[]> {
  const minCount = Math.max(1, Math.round(rule.threshold));
  const farms = await prisma.farm.findMany({
    where: {
      alertLevel: "CRITICAL",
      ...(rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {}),
    },
  });
  if (farms.length < minCount) return [];
  return [
    {
      module: "FARMS",
      severity: severityOf(rule),
      title_ar: `[${rule.name}] ${farms.length} مزرعة في حالة حرجة`,
      title_en: `[${rule.nameEn ?? rule.name}] ${farms.length} farm${farms.length === 1 ? "" : "s"} CRITICAL`,
      body_ar:
        `أطلقت قاعدة "${rule.name}" — ${farms.length} مزرعة وصلت لحالة حرجة. ` +
        `أبرزها: ${farms.slice(0, 3).map((f) => f.name).join("، ")}. الإجراء: زيارة ميدانية فورية وفحص الري.`,
      body_en:
        `Rule "${rule.nameEn ?? rule.name}" fired — ${farms.length} farm${farms.length === 1 ? "" : "s"} in CRITICAL state. ` +
        `Notable: ${farms.slice(0, 3).map((f) => f.nameEn ?? f.name).join(", ")}. Action: immediate field visit + irrigation check.`,
    },
  ];
}

async function evalEsgGap(rule: Rule): Promise<EngineInsight[]> {
  const minGap = rule.threshold;
  const scores = await prisma.sustainabilityScore.findMany({
    orderBy: [{ year: "desc" }, { period: "desc" }],
    include: { company: true },
  });
  if (scores.length === 0) return [];
  const latest = new Map<string, (typeof scores)[number]>();
  for (const s of scores) if (!latest.has(s.companyId)) latest.set(s.companyId, s);
  const values = [...latest.values()];
  if (values.length === 0) return [];
  const avg = values.reduce((a, s) => a + s.overall, 0) / values.length;

  const out: EngineInsight[] = [];
  const target = rule.scopeCompanyId
    ? values.filter((s) => s.companyId === rule.scopeCompanyId)
    : values;
  for (const s of target) {
    const gap = avg - s.overall;
    if (gap >= minGap) {
      out.push({
        module: "FINANCE",
        severity: severityOf(rule),
        title_ar: `[${rule.name}] فجوة ESG لـ ${s.company.name} (${gap.toFixed(1)} نقطة)`,
        title_en: `[${rule.nameEn ?? rule.name}] ${s.company.nameEn} ESG gap (${gap.toFixed(1)} pts)`,
        body_ar:
          `أطلقت قاعدة "${rule.name}" — ESG ${s.company.name} عند ${s.overall.toFixed(1)} مقابل متوسط ` +
          `${avg.toFixed(1)} للمجموعة. الإجراء: خطة تحسين بيئي/اجتماعي للربع القادم.`,
        body_en:
          `Rule "${rule.nameEn ?? rule.name}" fired — ${s.company.nameEn} ESG sits at ${s.overall.toFixed(1)} vs ` +
          `group avg ${avg.toFixed(1)}. Action: environmental/social plan for next quarter.`,
      });
    }
  }
  return out;
}

async function evalStaleForecast(rule: Rule): Promise<EngineInsight[]> {
  const days = Math.max(1, Math.round(rule.threshold));
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const stale = await prisma.supplyForecast.findMany({
    where: {
      status: "DRAFT",
      deletedAt: null,
      createdAt: { lt: cutoff },
      ...(rule.scopeCompanyId ? { sourceCompanyId: rule.scopeCompanyId } : {}),
    },
  });
  if (stale.length === 0) return [];
  return [
    {
      module: "SUPPLY",
      severity: severityOf(rule),
      title_ar: `[${rule.name}] ${stale.length} تنبؤ بانتظار قرار منذ +${days} يوم`,
      title_en: `[${rule.nameEn ?? rule.name}] ${stale.length} forecasts stale for ${days}+ days`,
      body_ar:
        `أطلقت قاعدة "${rule.name}" — ${stale.length} تنبؤ AI بحالة DRAFT لأكثر من ${days} يوم. ` +
        `الإجراء: مراجعة سريعة من القيادة قبل تآكل دقة الإشارة.`,
      body_en:
        `Rule "${rule.nameEn ?? rule.name}" fired — ${stale.length} AI forecasts pending decision for ${days}+ days. ` +
        `Action: leadership quick-review before signal accuracy erodes.`,
    },
  ];
}

async function evalMarginTop(rule: Rule): Promise<EngineInsight[]> {
  const marginFrac = rule.threshold / 100;
  const now = new Date();
  const past90 = new Date(now.getTime() - 90 * DAY_MS);
  const [companies, txs] = await Promise.all([
    prisma.company.findMany({
      where: rule.scopeCompanyId ? { id: rule.scopeCompanyId } : {},
    }),
    prisma.transaction.findMany({
      where: {
        occurredAt: { gte: past90 },
        ...(rule.scopeCompanyId ? { companyId: rule.scopeCompanyId } : {}),
      },
    }),
  ]);

  const out: EngineInsight[] = [];
  for (const c of companies) {
    const rev = txs
      .filter((t) => t.companyId === c.id && t.kind === "REVENUE")
      .reduce((a, t) => a + t.amount, 0);
    const exp = txs
      .filter((t) => t.companyId === c.id && t.kind === "EXPENSE")
      .reduce((a, t) => a + t.amount, 0);
    if (rev <= 0) continue;
    const margin = (rev - exp) / rev;
    if (margin >= marginFrac) {
      out.push({
        module: "FINANCE",
        severity: severityOf(rule),
        title_ar: `[${rule.name}] هامش ${c.name} ${fmtPct(margin, 1)}`,
        title_en: `[${rule.nameEn ?? rule.name}] ${c.nameEn} margin ${fmtPct(margin, 1)}`,
        body_ar:
          `أطلقت قاعدة "${rule.name}" (عتبة ${rule.threshold}%) — ${c.name} يحقق هامش ${fmtPct(margin, 1)} على إيراد ` +
          `${fmtMoney(rev)} في 90 يوم. الإجراء المقترح: تخصيص نسبة أعلى من ميزانية النمو لهذه الوحدة.`,
        body_en:
          `Rule "${rule.nameEn ?? rule.name}" (threshold ${rule.threshold}%) fired — ${c.nameEn} hits ${fmtPct(margin, 1)} margin on ` +
          `${fmtMoney(rev)} revenue over 90d. Recommended: allocate a larger share of growth budget here.`,
      });
    }
  }
  return out;
}

const EVALUATORS: Record<
  AlertKind,
  (rule: Rule) => Promise<EngineInsight[]>
> = {
  REVENUE_DROP: evalRevenueDrop,
  OCCUPANCY_HIGH: evalOccupancyHigh,
  OCCUPANCY_LOW: evalOccupancyLow,
  EXPIRY_SOON: evalExpirySoon,
  FARM_CRITICAL: evalFarmCritical,
  ESG_GAP: evalEsgGap,
  STALE_FORECAST: evalStaleForecast,
  MARGIN_TOP: evalMarginTop,
};

/**
 * Walk every active AlertRule, evaluate per-kind, honor cooldowns, and
 * return the insights each rule decided to emit. Side effects: rules that
 * actually fire get `lastTriggered` and `triggerCount` updated.
 *
 * Resilient — one failing rule doesn't break the sweep.
 */
export async function evaluateActiveAlerts(): Promise<FiredAlert[]> {
  const now = new Date();
  const rules = await prisma.alertRule.findMany({
    where: { isActive: true },
  });

  const fired: FiredAlert[] = [];
  for (const rule of rules) {
    // Cooldown — skip if the rule fired within the cooldown window.
    if (rule.lastTriggered) {
      const sinceMs = now.getTime() - rule.lastTriggered.getTime();
      if (sinceMs < rule.cooldownHours * HOUR_MS) continue;
    }

    const evaluator = EVALUATORS[rule.kind as AlertKind];
    if (!evaluator) continue; // Unknown kind (e.g. CUSTOM_*) — skip silently.

    let insights: EngineInsight[] = [];
    try {
      insights = await evaluator(rule);
    } catch {
      // Resilience: a single broken evaluator can't poison the run.
      continue;
    }

    if (insights.length === 0) continue;

    // Mark the rule as triggered and bump the counter.
    await prisma.alertRule.update({
      where: { id: rule.id },
      data: {
        lastTriggered: now,
        triggerCount: { increment: 1 },
      },
    });

    for (const insight of insights) {
      fired.push({
        ruleId: rule.id,
        kind: rule.kind as AlertKind,
        insight,
      });
    }
  }

  return fired;
}

/**
 * Convenience wrapper for the /insights flow: evaluates active alerts, then
 * persists each as an AIInsight row using the same dedupe rule as
 * lib/aiEngine's `persistInsights` (skip if an identical title appeared in
 * the last 24h on a non-deleted insight).
 */
export async function evaluateAndPersistAlerts(
  authorId: string | null,
  locale: "ar" | "en" = "ar",
): Promise<{ fired: number; created: number; skipped: number }> {
  const fired = await evaluateActiveAlerts();
  if (fired.length === 0) return { fired: 0, created: 0, skipped: 0 };

  const last24h = new Date(Date.now() - 24 * HOUR_MS);
  const existing = await prisma.aIInsight.findMany({
    where: { createdAt: { gte: last24h }, deletedAt: null },
    select: { title: true },
  });
  const seen = new Set(existing.map((e) => e.title.trim().toLowerCase()));

  let created = 0;
  let skipped = 0;
  for (const f of fired) {
    const title = locale === "ar" ? f.insight.title_ar : f.insight.title_en;
    const body = locale === "ar" ? f.insight.body_ar : f.insight.body_en;
    const key = title.trim().toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    await prisma.aIInsight.create({
      data: {
        module: f.insight.module,
        severity: f.insight.severity,
        title,
        body,
        authorId,
        status: "OPEN",
      },
    });
    created += 1;
  }
  return { fired: fired.length, created, skipped };
}
