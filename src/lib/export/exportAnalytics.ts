// Pure analytics helpers used by both HTML and CSV exports.
// Given a raw record set, return KPIs, trend series, distribution buckets,
// and a short bilingual commentary string suitable for executive readers.

export type KpiCard = {
  label_ar: string;
  label_en: string;
  value: string;
  delta?: { pct: number; positive: boolean } | null;
  tone?: "emerald" | "amber" | "rose" | "blue" | "violet" | "slate";
};

export type TrendSeries = {
  label_ar: string;
  label_en: string;
  values: number[];
  xLabels: string[];
  color: string;
};

export type DistributionBucket = {
  label: string;
  value: number;
  color: string;
};

export type ExportAnalytics = {
  kpis: KpiCard[];
  trend?: { title_ar: string; title_en: string; series: TrendSeries[] } | null;
  distribution?: {
    title_ar: string;
    title_en: string;
    buckets: DistributionBucket[];
  } | null;
  commentary_ar: string;
  commentary_en: string;
};

const fmtMoney = (n: number, c = "JOD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n || 0);

const fmtPct = (n: number, d = 1) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: d,
  }).format(n || 0);

const SECTOR_COLORS: Record<string, string> = {
  HOSPITALITY: "#b06a1a",
  DAIRY: "#0d7eaf",
  AGRICULTURE: "#0a7c4a",
  EDUCATION: "#5a3a8a",
  INVESTMENT: "#c69345",
  TRADE: "#1a4d6a",
  REVENUE: "#0a7c4a",
  EXPENSE: "#b91c1c",
  TRANSFER: "#7c3aed",
};

// Compute trend by month for the last 12 months.
export function monthlyTrend(
  items: Array<{ amount: number; date: Date }>,
  months = 12,
): { values: number[]; labels: string[] } {
  const now = new Date();
  const values: number[] = [];
  const labels: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  // Real calendar-month buckets (not fixed 30-day windows, which drift earlier
  // each month and can repeat/skip a calendar month in the labels).
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    values.push(
      items
        .filter((it) => it.date >= from && it.date < to)
        .reduce((a, x) => a + x.amount, 0),
    );
    labels.push(fmt.format(from));
  }
  return { values, labels };
}

// Compute % delta between two halves of a series.
export function periodDelta(values: number[]): { pct: number; positive: boolean } | null {
  if (values.length < 4) return null;
  const half = Math.floor(values.length / 2);
  const earlier = values.slice(0, half).reduce((a, b) => a + b, 0);
  const later = values.slice(half).reduce((a, b) => a + b, 0);
  if (earlier === 0) return null;
  const pct = (later - earlier) / earlier;
  return { pct, positive: pct >= 0 };
}

// =====================================================================
// FINANCE
// =====================================================================
export function financeAnalytics(tx: Array<{
  kind: string;
  amount: number;
  currency: string;
  category: string;
  occurredAt: Date;
  companyId: string;
}>): ExportAnalytics {
  const revenue = tx.filter((t) => t.kind === "REVENUE");
  const expense = tx.filter((t) => t.kind === "EXPENSE");
  const totalRev = revenue.reduce((a, t) => a + t.amount, 0);
  const totalExp = expense.reduce((a, t) => a + t.amount, 0);
  const net = totalRev - totalExp;
  const margin = totalRev > 0 ? net / totalRev : 0;

  const revTrend = monthlyTrend(
    revenue.map((t) => ({ amount: t.amount, date: t.occurredAt })),
  );
  const expTrend = monthlyTrend(
    expense.map((t) => ({ amount: t.amount, date: t.occurredAt })),
  );
  const revDelta = periodDelta(revTrend.values);

  // Category distribution (top 6 expense categories)
  const byCat: Record<string, number> = {};
  for (const t of expense) byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const palette = ["#0a7c4a", "#c69345", "#0d7eaf", "#7c3aed", "#b91c1c", "#475569"];

  return {
    kpis: [
      { label_ar: "إيراد", label_en: "Revenue", value: fmtMoney(totalRev), delta: revDelta, tone: "emerald" },
      { label_ar: "مصاريف", label_en: "Expenses", value: fmtMoney(totalExp), tone: "amber" },
      { label_ar: "صافي", label_en: "Net", value: fmtMoney(net), tone: net >= 0 ? "emerald" : "rose" },
      { label_ar: "هامش", label_en: "Margin", value: fmtPct(margin, 1), tone: "blue" },
      { label_ar: "معاملات", label_en: "Transactions", value: fmtNum(tx.length), tone: "slate" },
    ],
    trend: {
      title_ar: "النبض المالي — ١٢ شهر",
      title_en: "Financial pulse — 12 months",
      series: [
        { label_ar: "إيراد", label_en: "Revenue", values: revTrend.values, xLabels: revTrend.labels, color: "#0a7c4a" },
        { label_ar: "مصاريف", label_en: "Expenses", values: expTrend.values, xLabels: expTrend.labels, color: "#c69345" },
      ],
    },
    distribution: top.length
      ? {
          title_ar: "أعلى فئات المصاريف",
          title_en: "Top expense categories",
          buckets: top.map(([label, value], i) => ({ label, value, color: palette[i] })),
        }
      : null,
    commentary_ar: `هامش ${fmtPct(margin, 1)} على ${fmtNum(tx.length)} معاملة. صافي ${net >= 0 ? "إيجابي" : "سلبي"} بـ ${fmtMoney(Math.abs(net))}${
      revDelta ? ` · الإيراد ${revDelta.positive ? "نما" : "تراجع"} ${fmtPct(Math.abs(revDelta.pct), 1)} خلال آخر فترتين متماثلتين` : ""
    }.`,
    commentary_en: `Margin ${fmtPct(margin, 1)} across ${fmtNum(tx.length)} transactions. Net ${net >= 0 ? "positive" : "negative"} at ${fmtMoney(Math.abs(net))}${
      revDelta ? ` · revenue ${revDelta.positive ? "grew" : "declined"} ${fmtPct(Math.abs(revDelta.pct), 1)} between halves` : ""
    }.`,
  };
}

// =====================================================================
// HOTELS
// =====================================================================
export function hotelsAnalytics(bookings: Array<{
  revenue: number;
  rooms: number;
  checkIn: Date;
  checkOut: Date;
  status: string;
  hotel: { totalRooms: number; name: string; tier: string };
}>): ExportAnalytics {
  const totalRevenue = bookings.reduce((a, b) => a + b.revenue, 0);
  const totalNights = bookings.reduce((a, b) => {
    const n = Math.max(1, Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86400000));
    return a + n * b.rooms;
  }, 0);
  const adr = totalNights > 0 ? totalRevenue / totalNights : 0;
  const active = bookings.filter((b) => ["CONFIRMED", "CHECKED_IN"].includes(b.status)).length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const cancelRate = bookings.length > 0 ? cancelled / bookings.length : 0;

  const byTier: Record<string, number> = {};
  for (const b of bookings) byTier[b.hotel.tier] = (byTier[b.hotel.tier] ?? 0) + b.revenue;
  const palette = ["#b06a1a", "#0d7eaf", "#0a7c4a", "#7c3aed"];
  const tierBuckets = Object.entries(byTier)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  const revTrend = monthlyTrend(
    bookings.map((b) => ({ amount: b.revenue, date: b.checkIn })),
  );
  const revDelta = periodDelta(revTrend.values);

  return {
    kpis: [
      { label_ar: "إيراد", label_en: "Revenue", value: fmtMoney(totalRevenue), delta: revDelta, tone: "amber" },
      { label_ar: "حجوزات", label_en: "Bookings", value: fmtNum(bookings.length), tone: "blue" },
      { label_ar: "نشطة", label_en: "Active", value: fmtNum(active), tone: "emerald" },
      { label_ar: "متوسط الليلة", label_en: "ADR", value: fmtMoney(adr), tone: "violet" },
      { label_ar: "معدل الإلغاء", label_en: "Cancel rate", value: fmtPct(cancelRate, 1), tone: cancelRate > 0.1 ? "rose" : "slate" },
    ],
    trend: {
      title_ar: "إيرادات الحجوزات — ١٢ شهر",
      title_en: "Booking revenue — 12 months",
      series: [
        { label_ar: "إيراد", label_en: "Revenue", values: revTrend.values, xLabels: revTrend.labels, color: "#b06a1a" },
      ],
    },
    distribution: tierBuckets.length
      ? {
          title_ar: "الإيراد حسب فئة الفندق",
          title_en: "Revenue by hotel tier",
          buckets: tierBuckets,
        }
      : null,
    commentary_ar: `إيراد إجمالي ${fmtMoney(totalRevenue)} من ${fmtNum(bookings.length)} حجز · ADR = ${fmtMoney(adr)}. ${cancelRate > 0.1 ? `⚠ معدل إلغاء مرتفع ${fmtPct(cancelRate, 1)} يستحق المراجعة.` : `معدل الإلغاء صحي عند ${fmtPct(cancelRate, 1)}.`}`,
    commentary_en: `Total revenue ${fmtMoney(totalRevenue)} from ${fmtNum(bookings.length)} bookings · ADR = ${fmtMoney(adr)}. ${cancelRate > 0.1 ? `⚠ Elevated cancel rate ${fmtPct(cancelRate, 1)} merits review.` : `Healthy cancel rate at ${fmtPct(cancelRate, 1)}.`}`,
  };
}

// =====================================================================
// DAIRY
// =====================================================================
export function dairyAnalytics(batches: Array<{
  quantityLiters: number;
  qualityGrade: string;
  fatContent: number;
  productionDate: Date;
  expiryDate: Date;
  status: string;
  product: string;
}>): ExportAnalytics {
  const totalLiters = batches.reduce((a, b) => a + b.quantityLiters, 0);
  const gradeA = batches.filter((b) => b.qualityGrade === "A").length;
  const aRate = batches.length > 0 ? gradeA / batches.length : 0;
  const avgFat = batches.length > 0
    ? batches.reduce((a, b) => a + b.fatContent, 0) / batches.length
    : 0;
  const recalled = batches.filter((b) => b.status === "RECALLED").length;
  const now = new Date();
  const expiring = batches.filter(
    (b) => b.expiryDate >= now && (b.expiryDate.getTime() - now.getTime()) < 7 * 86400000 && b.status !== "RECALLED",
  ).length;

  const trend = monthlyTrend(
    batches.map((b) => ({ amount: b.quantityLiters, date: b.productionDate })),
  );
  const delta = periodDelta(trend.values);

  const byProduct: Record<string, number> = {};
  for (const b of batches) byProduct[b.product] = (byProduct[b.product] ?? 0) + b.quantityLiters;
  const palette = ["#0d7eaf", "#0a7c4a", "#c69345", "#7c3aed", "#b91c1c", "#475569"];
  const productBuckets = Object.entries(byProduct)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  return {
    kpis: [
      { label_ar: "إنتاج (لتر)", label_en: "Output (L)", value: fmtNum(totalLiters), delta, tone: "blue" },
      { label_ar: "دفعات", label_en: "Batches", value: fmtNum(batches.length), tone: "slate" },
      { label_ar: "نسبة درجة A", label_en: "Grade-A rate", value: fmtPct(aRate, 1), tone: aRate > 0.85 ? "emerald" : "amber" },
      { label_ar: "متوسط دهن", label_en: "Avg fat", value: avgFat.toFixed(2) + "%", tone: "violet" },
      { label_ar: "تنتهي ٧ أيام", label_en: "Exp. < 7d", value: fmtNum(expiring), tone: expiring > 0 ? "amber" : "slate" },
      { label_ar: "مسحوبة", label_en: "Recalled", value: fmtNum(recalled), tone: recalled > 0 ? "rose" : "slate" },
    ],
    trend: {
      title_ar: "حجم الإنتاج — ١٢ شهر",
      title_en: "Production volume — 12 months",
      series: [
        { label_ar: "لتر", label_en: "Liters", values: trend.values, xLabels: trend.labels, color: "#0d7eaf" },
      ],
    },
    distribution: productBuckets.length
      ? {
          title_ar: "الإنتاج حسب المنتج",
          title_en: "Output by product",
          buckets: productBuckets,
        }
      : null,
    commentary_ar: `${fmtNum(totalLiters)} لتر إجمالي عبر ${fmtNum(batches.length)} دفعة. درجة A تمثل ${fmtPct(aRate, 1)} من الإنتاج${expiring > 0 ? ` · ${fmtNum(expiring)} دفعة تنتهي خلال أسبوع تتطلب توزيع عاجل` : ""}.`,
    commentary_en: `${fmtNum(totalLiters)} liters total across ${fmtNum(batches.length)} batches. Grade-A makes up ${fmtPct(aRate, 1)} of output${expiring > 0 ? ` · ${fmtNum(expiring)} batches expire within 7 days, urgent distribution needed` : ""}.`,
  };
}

// =====================================================================
// FARMS
// =====================================================================
export function farmsAnalytics(farms: Array<{
  type: string;
  areaDunum: number;
  alertLevel: string;
  tempC: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  crops: Array<{ id: string; status: string; expectedYieldKg: number; actualYieldKg: number | null }>;
}>): ExportAnalytics {
  const totalArea = farms.reduce((a, f) => a + f.areaDunum, 0);
  const totalCrops = farms.reduce((a, f) => a + f.crops.length, 0);
  const expectedYield = farms.reduce(
    (a, f) => a + f.crops.reduce((b, c) => b + c.expectedYieldKg, 0),
    0,
  );
  const critical = farms.filter((f) => f.alertLevel === "CRITICAL").length;
  const warn = farms.filter((f) => f.alertLevel === "WARN").length;
  const okRate = farms.length > 0 ? (farms.length - critical - warn) / farms.length : 0;

  const byType: Record<string, number> = {};
  for (const f of farms) byType[f.type] = (byType[f.type] ?? 0) + f.areaDunum;
  const palette = ["#0a7c4a", "#84cc16", "#c69345", "#7c3aed"];
  const typeBuckets = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  return {
    kpis: [
      { label_ar: "مزارع", label_en: "Farms", value: fmtNum(farms.length), tone: "emerald" },
      { label_ar: "مساحة (دونم)", label_en: "Area (du)", value: fmtNum(totalArea), tone: "slate" },
      { label_ar: "محاصيل", label_en: "Crops", value: fmtNum(totalCrops), tone: "emerald" },
      { label_ar: "حصاد متوقع (كغ)", label_en: "Exp. yield (kg)", value: fmtNum(expectedYield), tone: "blue" },
      { label_ar: "حالة جيدة", label_en: "OK rate", value: fmtPct(okRate, 0), tone: okRate > 0.8 ? "emerald" : "amber" },
      { label_ar: "حرجة", label_en: "Critical", value: fmtNum(critical), tone: critical > 0 ? "rose" : "slate" },
    ],
    trend: null,
    distribution: typeBuckets.length
      ? {
          title_ar: "المساحة حسب نوع المزرعة",
          title_en: "Area by farm type",
          buckets: typeBuckets,
        }
      : null,
    commentary_ar: `${fmtNum(farms.length)} مزرعة على ${fmtNum(totalArea)} دونم تنتج ${fmtNum(totalCrops)} محصول${critical > 0 ? ` · ⚠ ${fmtNum(critical)} مزرعة في حالة حرجة تتطلب تدخل` : "."}`,
    commentary_en: `${fmtNum(farms.length)} farms on ${fmtNum(totalArea)} dunum producing ${fmtNum(totalCrops)} crops${critical > 0 ? ` · ⚠ ${fmtNum(critical)} farm(s) in CRITICAL state needing intervention` : "."}`,
  };
}

// =====================================================================
// SUPPLY-CHAIN
// =====================================================================
export function supplyAnalytics(forecasts: Array<{
  predictedDemand: number;
  confidence: number;
  category: string;
  status: string;
  unit: string;
}>): ExportAnalytics {
  const totalDemand = forecasts.reduce((a, f) => a + f.predictedDemand, 0);
  const approved = forecasts.filter((f) => f.status === "APPROVED").length;
  const executed = forecasts.filter((f) => f.status === "EXECUTED").length;
  const dismissed = forecasts.filter((f) => f.status === "DISMISSED").length;
  const avgConfidence = forecasts.length > 0
    ? forecasts.reduce((a, f) => a + f.confidence, 0) / forecasts.length
    : 0;
  const approvalRate = forecasts.length > 0 ? (approved + executed) / forecasts.length : 0;

  const byCat: Record<string, number> = {};
  for (const f of forecasts) byCat[f.category] = (byCat[f.category] ?? 0) + f.predictedDemand;
  const palette = ["#7c3aed", "#0a7c4a", "#b06a1a", "#0d7eaf", "#b91c1c"];
  const catBuckets = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  return {
    kpis: [
      { label_ar: "تنبؤات", label_en: "Forecasts", value: fmtNum(forecasts.length), tone: "violet" },
      { label_ar: "إجمالي طلب", label_en: "Total demand", value: fmtNum(totalDemand), tone: "blue" },
      { label_ar: "متوسط ثقة", label_en: "Avg confidence", value: fmtPct(avgConfidence, 0), tone: avgConfidence > 0.7 ? "emerald" : "amber" },
      { label_ar: "معتمدة", label_en: "Approved", value: fmtNum(approved), tone: "emerald" },
      { label_ar: "منفذة", label_en: "Executed", value: fmtNum(executed), tone: "emerald" },
      { label_ar: "نسبة الاعتماد", label_en: "Approval rate", value: fmtPct(approvalRate, 0), tone: "blue" },
    ],
    trend: null,
    distribution: catBuckets.length
      ? {
          title_ar: "الطلب حسب الفئة",
          title_en: "Demand by category",
          buckets: catBuckets,
        }
      : null,
    commentary_ar: `${fmtNum(forecasts.length)} تنبؤ بمتوسط ثقة ${fmtPct(avgConfidence, 0)}. تمت الموافقة/التنفيذ على ${fmtPct(approvalRate, 0)} منها${dismissed > 0 ? ` (${fmtNum(dismissed)} مرفوضة)` : ""}.`,
    commentary_en: `${fmtNum(forecasts.length)} forecasts at ${fmtPct(avgConfidence, 0)} avg confidence. ${fmtPct(approvalRate, 0)} approved/executed${dismissed > 0 ? ` (${fmtNum(dismissed)} dismissed)` : ""}.`,
  };
}

// =====================================================================
// SUSTAINABILITY
// =====================================================================
export function sustainabilityAnalytics(scores: Array<{
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  overall: number;
  carbonTons: number;
  waterCubicM: number;
  renewablePct: number;
  company: { name: string };
}>): ExportAnalytics {
  if (scores.length === 0) {
    return {
      kpis: [],
      commentary_ar: "لا توجد بيانات ESG.",
      commentary_en: "No ESG data.",
    };
  }
  const avg = (key: keyof typeof scores[0]) =>
    scores.reduce((a, s) => a + (s[key] as number), 0) / scores.length;
  const overall = avg("overall");
  const e = avg("environmentalScore");
  const so = avg("socialScore");
  const g = avg("governanceScore");
  const carbon = scores.reduce((a, s) => a + s.carbonTons, 0);
  const water = scores.reduce((a, s) => a + s.waterCubicM, 0);
  const renew = avg("renewablePct");

  const byCompany: Record<string, number> = {};
  for (const s of scores) byCompany[s.company.name] = s.overall;
  const palette = ["#0a7c4a", "#0d7eaf", "#84cc16", "#7c3aed", "#c69345"];
  const buckets = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  return {
    kpis: [
      { label_ar: "متوسط شامل", label_en: "Avg overall", value: overall.toFixed(1) + "/100", tone: overall > 70 ? "emerald" : "amber" },
      { label_ar: "بيئي", label_en: "Environmental", value: e.toFixed(1), tone: "emerald" },
      { label_ar: "اجتماعي", label_en: "Social", value: so.toFixed(1), tone: "blue" },
      { label_ar: "حوكمة", label_en: "Governance", value: g.toFixed(1), tone: "violet" },
      { label_ar: "كربون (طن)", label_en: "Carbon (t)", value: fmtNum(carbon), tone: "amber" },
      { label_ar: "متجدد %", label_en: "Renewable %", value: renew.toFixed(1) + "%", tone: renew > 30 ? "emerald" : "slate" },
    ],
    trend: null,
    distribution: buckets.length
      ? {
          title_ar: "التقييم الشامل لكل شركة",
          title_en: "Overall score per company",
          buckets,
        }
      : null,
    commentary_ar: `متوسط ESG شامل ${overall.toFixed(1)}/100 عبر ${fmtNum(scores.length)} تقييم · ${fmtNum(Math.round(carbon))} طن كربون · نسبة طاقة متجددة ${renew.toFixed(1)}%.`,
    commentary_en: `Avg ESG overall ${overall.toFixed(1)}/100 across ${fmtNum(scores.length)} scores · ${fmtNum(Math.round(carbon))} t carbon · ${renew.toFixed(1)}% renewable.`,
  };
}

// =====================================================================
// PROJECTS
// =====================================================================
export function projectsAnalytics(projects: Array<{
  budgetJod: number;
  stage: string;
  priority: string;
  progressPct: number;
}>): ExportAnalytics {
  const totalBudget = projects.reduce((a, p) => a + p.budgetJod, 0);
  const avgProgress = projects.length > 0
    ? projects.reduce((a, p) => a + p.progressPct, 0) / projects.length
    : 0;
  const inProgress = projects.filter((p) => p.stage === "IN_PROGRESS").length;
  const done = projects.filter((p) => p.stage === "DONE").length;
  const urgent = projects.filter((p) => p.priority === "URGENT").length;

  const byStage: Record<string, number> = {};
  for (const p of projects) byStage[p.stage] = (byStage[p.stage] ?? 0) + p.budgetJod;
  const palette = ["#0a7c4a", "#0d7eaf", "#c69345", "#7c3aed", "#b91c1c", "#475569", "#84cc16"];
  const stageBuckets = Object.entries(byStage)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  return {
    kpis: [
      { label_ar: "مشاريع", label_en: "Projects", value: fmtNum(projects.length), tone: "violet" },
      { label_ar: "ميزانية إجمالية", label_en: "Total budget", value: fmtMoney(totalBudget), tone: "emerald" },
      { label_ar: "قيد التنفيذ", label_en: "In progress", value: fmtNum(inProgress), tone: "blue" },
      { label_ar: "منجزة", label_en: "Done", value: fmtNum(done), tone: "emerald" },
      { label_ar: "عاجلة", label_en: "Urgent", value: fmtNum(urgent), tone: urgent > 0 ? "rose" : "slate" },
      { label_ar: "متوسط تقدم", label_en: "Avg progress", value: avgProgress.toFixed(0) + "%", tone: "violet" },
    ],
    trend: null,
    distribution: stageBuckets.length
      ? {
          title_ar: "الميزانية حسب المرحلة",
          title_en: "Budget by stage",
          buckets: stageBuckets,
        }
      : null,
    commentary_ar: `${fmtNum(projects.length)} مشروع بميزانية ${fmtMoney(totalBudget)} · متوسط التقدم ${avgProgress.toFixed(0)}%${urgent > 0 ? ` · ${fmtNum(urgent)} عاجلة` : ""}.`,
    commentary_en: `${fmtNum(projects.length)} projects with ${fmtMoney(totalBudget)} budget · ${avgProgress.toFixed(0)}% avg progress${urgent > 0 ? ` · ${fmtNum(urgent)} urgent` : ""}.`,
  };
}

// =====================================================================
// MARKETS
// =====================================================================
export function marketsAnalytics(stocks: Array<{
  changePct: number;
  region: string;
  exchange: string;
  lastPrice: number;
}>): ExportAnalytics {
  const avgChange = stocks.length > 0
    ? stocks.reduce((a, s) => a + s.changePct, 0) / stocks.length
    : 0;
  const gainers = stocks.filter((s) => s.changePct > 0).length;
  const losers = stocks.filter((s) => s.changePct < 0).length;
  const flat = stocks.length - gainers - losers;

  const byRegion: Record<string, { sum: number; n: number }> = {};
  for (const s of stocks) {
    const slot = (byRegion[s.region] ??= { sum: 0, n: 0 });
    slot.sum += s.changePct;
    slot.n += 1;
  }
  const palette = ["#0a7c4a", "#0d7eaf", "#c69345", "#7c3aed"];
  const regionBuckets = Object.entries(byRegion)
    .map(([label, { sum, n }], i) => ({
      label,
      value: n > 0 ? sum / n : 0,
      color: palette[i % palette.length],
    }))
    .sort((a, b) => b.value - a.value);

  return {
    kpis: [
      { label_ar: "أسهم", label_en: "Stocks", value: fmtNum(stocks.length), tone: "blue" },
      { label_ar: "متوسط التغير", label_en: "Avg change", value: (avgChange >= 0 ? "+" : "") + avgChange.toFixed(2) + "%", tone: avgChange >= 0 ? "emerald" : "rose" },
      { label_ar: "صاعدة", label_en: "Gainers", value: fmtNum(gainers), tone: "emerald" },
      { label_ar: "هابطة", label_en: "Losers", value: fmtNum(losers), tone: "rose" },
      { label_ar: "ثابتة", label_en: "Flat", value: fmtNum(flat), tone: "slate" },
    ],
    trend: null,
    distribution: regionBuckets.length
      ? {
          title_ar: "متوسط التغير حسب المنطقة (%)",
          title_en: "Avg change by region (%)",
          buckets: regionBuckets,
        }
      : null,
    commentary_ar: `${fmtNum(gainers)} صاعدة مقابل ${fmtNum(losers)} هابطة · متوسط ${avgChange.toFixed(2)}% عبر ${fmtNum(stocks.length)} سهم.`,
    commentary_en: `${fmtNum(gainers)} gainers vs ${fmtNum(losers)} losers · ${avgChange.toFixed(2)}% avg across ${fmtNum(stocks.length)} stocks.`,
  };
}
