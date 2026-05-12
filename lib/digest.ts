// Weekly executive digest generator.
//
// Runs the AI engine (H1–H7 from lib/aiEngine + H8–H10 from
// lib/aiEngineExtra), assembles a group-performance summary, and
// persists a Digest row covering the last 7 days. The result is a
// cached, share-able snapshot of "what mattered this week."

import "server-only";
import { prisma } from "./db";
import { runEngine, type EngineInsight } from "./aiEngine";
import { runEngineExtra } from "./aiEngineExtra";

const DAY_MS = 24 * 60 * 60 * 1000;

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "JOD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number, d = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: d,
  }).format(n);

const SEVERITY_ICON: Record<EngineInsight["severity"], string> = {
  CRITICAL: "🔴",
  WARN: "🟠",
  OPPORTUNITY: "🟢",
  INFO: "🔵",
};

const SEVERITY_LABEL_AR: Record<EngineInsight["severity"], string> = {
  CRITICAL: "حرج",
  WARN: "تحذير",
  OPPORTUNITY: "فرصة",
  INFO: "معلومة",
};

// Compute the last full 7-day window ending today (inclusive of today).
function currentWindow() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * DAY_MS);
  return { start, end };
}

type GroupTotals = {
  revenue: number;
  expense: number;
  net: number;
  margin: number;
  bookings: number;
  dairyLiters: number;
  newForecasts: number;
  newInsights: number;
};

async function computeGroupTotals(
  start: Date,
  end: Date,
): Promise<GroupTotals> {
  const [
    revenueAgg,
    expenseAgg,
    bookingsCount,
    dairyAgg,
    forecastCount,
    insightCount,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        kind: "REVENUE",
        occurredAt: { gte: start, lte: end },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        kind: "EXPENSE",
        occurredAt: { gte: start, lte: end },
      },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: start, lte: end } },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      where: { productionDate: { gte: start, lte: end } },
    }),
    prisma.supplyForecast.count({
      where: { createdAt: { gte: start, lte: end }, deletedAt: null },
    }),
    prisma.aIInsight.count({
      where: { createdAt: { gte: start, lte: end }, deletedAt: null },
    }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const expense = expenseAgg._sum.amount ?? 0;
  const net = revenue - expense;
  const margin = revenue > 0 ? net / revenue : 0;

  return {
    revenue,
    expense,
    net,
    margin,
    bookings: bookingsCount,
    dairyLiters: dairyAgg._sum.quantityLiters ?? 0,
    newForecasts: forecastCount,
    newInsights: insightCount,
  };
}

function buildSummary(totals: GroupTotals, insightCount: number): string {
  const tone =
    totals.net > 0
      ? "أسبوع إيجابي"
      : totals.net < 0
        ? "أسبوع تحت الضغط"
        : "أسبوع متعادل";
  return (
    `${tone} للمجموعة: إيرادات ${fmtMoney(totals.revenue)}، صافي ${fmtMoney(totals.net)} ` +
    `(هامش ${fmtPct(totals.margin, 1)})، ${fmtNum(totals.bookings)} حجز جديد، و${fmtNum(insightCount)} ` +
    `إشارة ذكاء.`
  );
}

function buildBody(
  start: Date,
  end: Date,
  totals: GroupTotals,
  insights: EngineInsight[],
): string {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Insights grouped by severity for the body
  const grouped: Record<EngineInsight["severity"], EngineInsight[]> = {
    CRITICAL: [],
    WARN: [],
    OPPORTUNITY: [],
    INFO: [],
  };
  for (const i of insights) grouped[i.severity].push(i);

  const order: EngineInsight["severity"][] = [
    "CRITICAL",
    "WARN",
    "OPPORTUNITY",
    "INFO",
  ];

  const sections: string[] = [];

  sections.push(
    `## ${dateFmt.format(start)} → ${dateFmt.format(end)}\n` +
      `\n_موجز تنفيذي مولّد آلياً من H-Nerve._\n`,
  );

  sections.push(
    `### نبض المجموعة\n` +
      `\n` +
      `- **الإيرادات:** ${fmtMoney(totals.revenue)}\n` +
      `- **المصاريف:** ${fmtMoney(totals.expense)}\n` +
      `- **الصافي:** ${fmtMoney(totals.net)} (هامش ${fmtPct(totals.margin, 1)})\n` +
      `- **الحجوزات الجديدة:** ${fmtNum(totals.bookings)}\n` +
      `- **إنتاج الألبان:** ${fmtNum(totals.dairyLiters)} لتر\n` +
      `- **تنبؤات جديدة:** ${fmtNum(totals.newForecasts)}\n` +
      `- **إشارات الذكاء المنشورة:** ${fmtNum(totals.newInsights)}\n`,
  );

  for (const sev of order) {
    const items = grouped[sev];
    if (items.length === 0) continue;
    const heading = `### ${SEVERITY_ICON[sev]} ${SEVERITY_LABEL_AR[sev]} (${items.length})`;
    const rendered = items
      .map((i) => `- **${i.title_ar}**\n  ${i.body_ar}`)
      .join("\n\n");
    sections.push(`${heading}\n\n${rendered}`);
  }

  if (insights.length === 0) {
    sections.push(
      `### إشارات\n\nلم يلتقط المحرك أي إشارات جديدة هذا الأسبوع — كل المؤشرات ضمن المعدل الطبيعي.`,
    );
  }

  return sections.join("\n\n");
}

export type GeneratedDigest = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  body: string;
  summary: string;
  insightCount: number;
  createdAt: Date;
};

/** Runs the engines, builds a body + summary, and stores a Digest row. */
export async function generateDigest(): Promise<GeneratedDigest> {
  const { start, end } = currentWindow();

  const [base, extra, totals] = await Promise.all([
    runEngine(),
    runEngineExtra(),
    computeGroupTotals(start, end),
  ]);
  const insights: EngineInsight[] = [...base, ...extra];

  const summary = buildSummary(totals, insights.length);
  const body = buildBody(start, end, totals, insights);

  const row = await prisma.digest.create({
    data: {
      weekStart: start,
      weekEnd: end,
      summary,
      body,
      insightCount: insights.length,
    },
  });

  return {
    id: row.id,
    weekStart: row.weekStart,
    weekEnd: row.weekEnd,
    body: row.body,
    summary: row.summary,
    insightCount: row.insightCount,
    createdAt: row.createdAt,
  };
}

/** Lightweight read helper — used by the list view. */
export async function listDigests(take = 50) {
  return prisma.digest.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      summary: true,
      insightCount: true,
      createdAt: true,
    },
  });
}
