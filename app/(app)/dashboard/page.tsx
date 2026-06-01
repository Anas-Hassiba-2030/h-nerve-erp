// EXECUTIVE DASHBOARD — viewport-fit, no horizontal scroll, no excess padding.
// Designed to tell the entire group's story in one screen, then go deeper
// only on click. Period selector at top toggles all metrics dynamically.

import Link from "next/link";
import {
  Hotel, Milk, Sprout, GraduationCap, TrendingUp, Trophy, Building2, Brain,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { RankBadge } from "@/components/RankBadge";
import { LiveTicker, type TickerItem } from "@/components/LiveTicker";
import { PeriodSelector } from "@/components/PeriodSelector";
import { periodToRange, isValidPeriod, type Period } from "@/lib/period";
import { CompanyStrip, type CompanyStripItem } from "@/components/dashboard/CompanyStrip";
import { ActivityStream, type ActivityItem } from "@/components/dashboard/ActivityStream";
import { AlertCenter, type AlertItem } from "@/components/dashboard/AlertCenter";
import { FinancialPulse } from "@/components/dashboard/FinancialPulse";
import { UpcomingCalendar, type CalendarEvent } from "@/components/dashboard/UpcomingCalendar";
import { TodayActivity, type ActivityLogLite } from "@/components/dashboard/TodayActivity";
import { HeritageHero } from "@/components/dashboard/HeritageHero";
import { HeritageSection, HeritagePill, HeritageQuickLink } from "@/components/heritage";
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { listPins } from "@/lib/pins";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { rankById } from "@/lib/gamification";
import { computeIQ } from "@/lib/brain/meta.reflector";

// Phase P-Polish — explicit dynamic. The layout reads cookies so this
// page is dynamic in practice, but declaring it removes ambiguity for
// Next's static-analysis prerender — important once
// H_NERVE_PERMS_ENFORCED flips and the layout-level redirect kicks in.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await getCurrentUser();
  const locale = getLocale();
  const m = getMessages(locale);
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const period: Period = isValidPeriod(searchParams.period);
  const range = periodToRange(period);
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const next28Days = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  // Phase F7 — scoped read. BrainInsight now has tenantId (Phase F3
  // TENANT_SCOPED_MODELS), so this count is automatically restricted
  // to the active tenant's insights. ADMIN with no tenant cookie sees
  // the global count (the original behaviour).
  const activeInsightCount = await prisma.brainInsight.count({
    where: { resolvedAt: null, dismissedAt: null },
  });
  const brainIQ = await computeIQ("default").catch(() => null);
  const [
    me, companies, totalRoomsAgg, activeRoomsAgg, bookingsAgg,
    dairyVolumeAgg, expiringDairy, farms, programs, forecasts, recentInsights,
    transactions, marketStocks, esg, futureProjects, myTasksDue,
    upcomingBookings, expiringDairyAll, harvestingCrops,
  ] = await Promise.all([
    session ? prisma.user.findUnique({ where: { id: session.id } }) : null,
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.hotel.aggregate({ _sum: { totalRooms: true } }),
    prisma.booking.aggregate({ _sum: { rooms: true }, where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } } }),
    prisma.booking.aggregate({
      _sum: { revenue: true },
      where: { checkIn: { gte: range.start, lte: range.end } },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      where: { productionDate: { gte: range.start } },
    }),
    prisma.dairyBatch.findMany({
      where: { expiryDate: { lte: next3Days, gte: now }, status: { not: "RECALLED" } },
      orderBy: { expiryDate: "asc" },
      take: 3,
    }),
    prisma.farm.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.program.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.supplyForecast.findMany({
      where: { status: { in: ["DRAFT", "APPROVED"] } },
      include: { source: true, target: true },
      orderBy: { periodStart: "asc" },
      take: 6,
    }),
    prisma.aIInsight.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.marketStock.findMany({ where: { companyId: { not: null } }, include: { company: true } }),
    prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }] }),
    prisma.futureProject.findMany(),
    session ? prisma.task.findMany({
      where: { assigneeId: session.id, status: { not: "DONE" } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }) : [],
    // Upcoming bookings (next 28 days) — for calendar dots
    prisma.booking.findMany({
      where: { checkIn: { gte: now, lte: next28Days } },
      include: { hotel: true },
      orderBy: { checkIn: "asc" },
    }),
    // All dairy expiring within 28d
    prisma.dairyBatch.findMany({
      where: { expiryDate: { gte: now, lte: next28Days }, status: { not: "RECALLED" } },
      orderBy: { expiryDate: "asc" },
    }),
    // Crops with harvest in next 28d
    prisma.crop.findMany({
      where: { expectedHarvest: { gte: now, lte: next28Days }, status: "GROWING" },
      include: { farm: true },
      orderBy: { expectedHarvest: "asc" },
    }),
  ]);

  // Today's activity log (last 24h)
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [recentActivityLogs, totalActivityToday] = await Promise.all([
    prisma.activityLog.findMany({
      where: { createdAt: { gte: last24h } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.activityLog.count({ where: { createdAt: { gte: last24h } } }),
  ]);
  const myPins = session ? await listPins(session.id) : [];
  const todayActivityItems: ActivityLogLite[] = recentActivityLogs.map((l) => ({
    id: l.id,
    action: l.action,
    entity: l.entity,
    summary: l.summary,
    summaryEn: l.summaryEn,
    actorName: l.actorName,
    module: l.module,
    createdAt: l.createdAt,
  }));

  // === Aggregates ===
  const totalRooms = totalRoomsAgg._sum.totalRooms ?? 0;
  // Occupied = committed ROOMS (CONFIRMED+CHECKED_IN), consistent with hotels/page.tsx.
  const activeBookings = activeRoomsAgg._sum.rooms ?? 0;
  const occupancyPct = totalRooms ? Math.min(activeBookings / totalRooms, 1) : 0;
  const dairyVolumeL = dairyVolumeAgg._sum.quantityLiters ?? 0;
  const farmsAlerting = farms.filter((f) => f.alertLevel !== "OK").length;

  const revenueInRange = transactions
    .filter((t) => t.kind === "REVENUE" && t.occurredAt >= range.start && t.occurredAt <= range.end)
    .reduce((a, t) => a + t.amount, 0);
  const expenseInRange = transactions
    .filter((t) => t.kind === "EXPENSE" && t.occurredAt >= range.start && t.occurredAt <= range.end)
    .reduce((a, t) => a + t.amount, 0);
  const netInRange = revenueInRange - expenseInRange;

  // Previous period for delta computation
  const rangeSpan = range.end.getTime() - range.start.getTime();
  const prevStart = new Date(range.start.getTime() - rangeSpan);
  const prevEnd = new Date(range.start.getTime());
  const revPrev = transactions
    .filter((t) => t.kind === "REVENUE" && t.occurredAt >= prevStart && t.occurredAt < prevEnd)
    .reduce((a, t) => a + t.amount, 0);
  const expPrev = transactions
    .filter((t) => t.kind === "EXPENSE" && t.occurredAt >= prevStart && t.occurredAt < prevEnd)
    .reduce((a, t) => a + t.amount, 0);
  const netPrev = revPrev - expPrev;

  const revDelta  = revPrev > 0 ? (revenueInRange - revPrev) / revPrev : 0;
  const netDelta  = netPrev !== 0 ? (netInRange - netPrev) / Math.abs(netPrev) : 0;
  const expDelta  = expPrev > 0 ? (expenseInRange - expPrev) / expPrev : 0;

  // 12-month group revenue + expense trend (always 12 months for context)
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const revenueTrend: number[] = [];
  const expenseTrend: number[] = [];
  const monthLabels: string[] = [];
  const monthLabelFmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { month: "short" });
  for (let i = 11; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * monthMs);
    const to = new Date(now.getTime() - i * monthMs);
    revenueTrend.push(
      transactions.filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to).reduce((a, t) => a + t.amount, 0)
    );
    expenseTrend.push(
      transactions.filter((t) => t.kind === "EXPENSE" && t.occurredAt >= from && t.occurredAt < to).reduce((a, t) => a + t.amount, 0)
    );
    monthLabels.push(monthLabelFmt.format(to));
  }

  // Latest ESG group avg
  const latestEsg = (() => {
    const byCompanyLast: Record<string, number> = {};
    for (const s of esg) byCompanyLast[s.companyId] = s.overall;
    const vals = Object.values(byCompanyLast);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  const groupMove = marketStocks.length > 0
    ? marketStocks.reduce((a, s) => a + s.changePct, 0) / marketStocks.length
    : 0;

  const totalProjectsBudget = futureProjects.reduce((a, p) => a + p.budgetJod, 0);

  // === Per-company strip data ===
  const companyTrendOf = (companyId: string) => {
    const trend: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getTime() - (i + 1) * monthMs);
      const to = new Date(now.getTime() - i * monthMs);
      trend.push(
        transactions
          .filter((t) => t.companyId === companyId && t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to)
          .reduce((a, t) => a + t.amount, 0)
      );
    }
    return trend;
  };
  const companyRevenue = (companyId: string) =>
    transactions
      .filter((t) => t.companyId === companyId && t.kind === "REVENUE" && t.occurredAt >= range.start)
      .reduce((a, t) => a + t.amount, 0);

  const stripItems: CompanyStripItem[] = companies.map((c) => {
    const ops = (() => {
      // pick the most operationally meaningful metric per sector
      if (c.sector === "HOSPITALITY") {
        const total = totalRooms ? Math.min(activeBookings / totalRooms, 1) : 0;
        return { label: ar ? "إشغال" : "Occupancy", value: formatPercent(total, 0) };
      }
      if (c.sector === "DAIRY")
        return { label: ar ? "إنتاج 30ي" : "30d output", value: `${formatNumber(dairyVolumeL)} L` };
      if (c.sector === "AGRICULTURE") {
        const f = farms.filter((x) => x.companyId === c.id);
        return { label: ar ? "مزارع" : "Farms", value: formatNumber(f.length) };
      }
      if (c.sector === "EDUCATION")
        return { label: ar ? "مشاريع" : "Programs", value: formatNumber(programs.length) };
      return { label: ar ? "إيراد" : "Revenue", value: formatMoney(companyRevenue(c.id)) };
    })();
    // Health
    let health: "OK" | "WARN" | "CRITICAL" = "OK";
    if (c.sector === "AGRICULTURE") {
      const f = farms.filter((x) => x.companyId === c.id);
      const crit = f.some((x) => x.alertLevel === "CRITICAL");
      const warn = f.some((x) => x.alertLevel === "WARN");
      health = crit ? "CRITICAL" : warn ? "WARN" : "OK";
    } else if (c.sector === "DAIRY" && expiringDairy.some((b) => b.companyId === c.id)) {
      health = "WARN";
    }
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      nameEn: c.nameEn,
      sector: c.sector,
      revenueTrend: companyTrendOf(c.id),
      revenue: companyRevenue(c.id),
      ops,
      health,
    };
  });

  // === Activity stream items ===
  const activity: ActivityItem[] = [
    ...recentInsights.slice(0, 4).map((i): ActivityItem => ({
      id: i.id, kind: "INSIGHT", severity: i.severity as any,
      title: i.title,
      sub: i.body.slice(0, 70) + (i.body.length > 70 ? "…" : ""),
      href: "/insights", time: i.createdAt,
    })),
    ...forecasts.slice(0, 4).map((f): ActivityItem => ({
      id: f.id, kind: "FORECAST",
      title: f.productLabel,
      sub: `${f.source.name} → ${f.target.name} · ${formatNumber(f.predictedDemand)} ${f.unit}`,
      href: "/supply-chain", time: f.createdAt,
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);

  // === Alert center items ===
  const alerts: AlertItem[] = [
    ...recentInsights
      .filter((i) => i.severity === "CRITICAL" && i.status === "OPEN")
      .slice(0, 2)
      .map((i): AlertItem => ({
        id: i.id, kind: "INSIGHT_CRITICAL", severity: "CRITICAL",
        title: i.title, sub: ar ? "إشارة حرجة" : "Critical insight",
        href: "/insights", time: i.createdAt,
      })),
    ...farms
      .filter((f) => f.alertLevel !== "OK")
      .slice(0, 2)
      .map((f): AlertItem => ({
        id: f.id, kind: "FARM",
        severity: f.alertLevel === "CRITICAL" ? "CRITICAL" : "WARN",
        title: f.name,
        sub: ar
          ? `رطوبة ${f.soilMoisture ?? "—"}٪ · حرارة ${f.tempC ?? "—"}°`
          : `Moisture ${f.soilMoisture ?? "—"}% · Temp ${f.tempC ?? "—"}°`,
        href: `/farms/${f.id}`,
      })),
    ...expiringDairy.slice(0, 2).map((b): AlertItem => ({
      id: b.id, kind: "DAIRY_EXPIRY", severity: "WARN",
      title: ar ? `${b.productAr} — ${formatNumber(b.quantityLiters)} L` : `${b.product} — ${formatNumber(b.quantityLiters)} L`,
      sub: ar ? `تنتهي قريباً · ${b.batchNumber}` : `Expiring soon · ${b.batchNumber}`,
      href: "/dairy", time: b.expiryDate,
    })),
    ...myTasksDue
      .filter((t) => t.dueAt && new Date(t.dueAt) < now)
      .slice(0, 2)
      .map((t): AlertItem => ({
        id: t.id, kind: "TASK_OVERDUE", severity: "WARN",
        title: t.title,
        sub: ar ? "مهمة متأخرة" : "Overdue task",
        href: "/tasks", time: t.dueAt ?? undefined,
      })),
  ].slice(0, 6);

  // === Live ticker ===
  const tickerItems: TickerItem[] = [
    { id: "tk-occ", icon: "up", label: ar ? "إشغال أرينا" : "Arena occupancy", value: formatPercent(occupancyPct, 0), highlight: true },
    { id: "tk-rev", icon: "pulse", label: ar ? `إيراد ${range.label}` : `Revenue ${range.label}`, value: formatMoney(revenueInRange) },
    { id: "tk-fc", icon: "bridge", label: ar ? "تنبؤات نشطة" : "Live forecasts", value: formatNumber(forecasts.length) },
    { id: "tk-mkt", icon: groupMove >= 0 ? "up" : "down", label: ar ? "أسهم المجموعة" : "Equities", value: `${groupMove >= 0 ? "+" : ""}${groupMove.toFixed(2)}%` },
    { id: "tk-esg", icon: "sparkle", label: ar ? "ESG" : "ESG", value: latestEsg.toFixed(1) },
    { id: "tk-pipe", icon: "sparkle", label: ar ? "خط الأنابيب" : "Pipeline", value: formatMoney(totalProjectsBudget) },
  ];

  const myRank = rankById(me?.rank ?? "PAWN");

  // === Calendar events (next 4 weeks) ===
  const calendarEvents: CalendarEvent[] = [
    ...upcomingBookings.map((b): CalendarEvent => ({
      id: b.id,
      date: b.checkIn,
      kind: "BOOKING",
      title: ar ? `حجز: ${b.guestName} في ${b.hotel.name}` : `Booking: ${b.guestName} @ ${b.hotel.name}`,
      href: "/hotels",
    })),
    ...expiringDairyAll.map((b): CalendarEvent => ({
      id: b.id,
      date: b.expiryDate,
      kind: "DAIRY_EXPIRY",
      title: ar ? `صلاحية ${b.productAr} (${formatNumber(b.quantityLiters)} L)` : `${b.product} expiring (${formatNumber(b.quantityLiters)} L)`,
      href: "/dairy",
    })),
    ...harvestingCrops.map((c): CalendarEvent => ({
      id: c.id,
      date: c.expectedHarvest,
      kind: "HARVEST",
      title: ar ? `حصاد ${c.name} في ${c.farm.name}` : `Harvest: ${c.name} @ ${c.farm.name}`,
      href: `/farms/${c.farmId}`,
    })),
    ...myTasksDue
      .filter((t) => t.dueAt)
      .map((t): CalendarEvent => ({
        id: t.id,
        date: t.dueAt!,
        kind: "TASK",
        title: t.title,
        href: "/tasks",
      })),
  ];

  // Greeting — universal display headline, no name injection (avoids cross-script collision)
  const greeting =
    new Date().getHours() < 5 ? m["dashboard.greetingNight"] :
    new Date().getHours() < 12 ? m["dashboard.greetingMorning"] :
    new Date().getHours() < 17 ? m["dashboard.greetingAfternoon"] :
    m["dashboard.greetingEvening"];

  // Personal line — kept SCRIPT-MATCHED to the active locale.
  // We use only the user's last token (first name in EN, family in AR-style "أنس حسيبة").
  // If the stored name is the wrong script for the current locale (e.g. Arabic name in EN UI),
  // we omit the personal line entirely rather than render a mixed-script display headline.
  const rawName = session?.name?.trim() ?? "";
  const isArabicName = /[؀-ۿ]/.test(rawName);
  const matchesLocale = ar ? isArabicName : !isArabicName;
  const firstToken = rawName.split(/\s+/)[0] ?? "";
  const personalLine = matchesLocale && firstToken
    ? (ar
        ? `يومٌ مُبارَك، ${firstToken}.`
        : `Welcome back, ${firstToken}.`)
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow={m["dashboard.eyebrow"]}
        title={ar ? "اللوحة التنفيذية" : "Executive dashboard"}
        subtitle={
          ar
            ? "النبض الكامل لمجموعة الحوراني عبر كل الوحدات."
            : "Full pulse of Hourani Group across every business unit."
        }
      />

      <PageContainer>
        {/* === HERITAGE MODERN HEADLINE — the canonical vocabulary for Hourani Group ===
            See docs/DESIGN-SKILL.md §1.D. Cream plinth + ochre/terracotta/teal
            hairline rail + Fraunces/Reem Kufi display + display-serif numerals. */}
        <HeritageHero
          ar={ar}
          eyebrow={ar ? "نبض المجموعة" : "Group pulse"}
          dateLabel={new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(now).toUpperCase()}
          liveLabel={ar ? "بثّ مباشر" : "LIVE"}
          greeting={greeting}
          personalLine={personalLine}
          subtitle={
            ar
              ? `${formatNumber(companies.length)} شركات · ${formatNumber(farms.length)} مزرعة · ${formatNumber(activeInsightCount)} إشارة AI · ${formatPercent(occupancyPct, 0)} إشغال${brainIQ ? ` · IQ ${Math.round(brainIQ.score)}` : ""}`
              : `${formatNumber(companies.length)} companies · ${formatNumber(farms.length)} farms · ${formatNumber(activeInsightCount)} AI signals · ${formatPercent(occupancyPct, 0)} occupancy${brainIQ ? ` · Brain IQ ${Math.round(brainIQ.score)}` : ""}.`
          }
          primaryCta={ar ? "مركز الدماغ" : "Brain hub"}
          primaryCtaHref="/brain"
          secondaryCta={ar ? "تقرير المجموعة" : "Group report"}
          secondaryCtaHref={`/api/export/html/all?locale=${lc}`}
          reportLabel="report"
          kpis={[
            {
              label: ar ? `إيراد ${range.label}` : `Revenue ${range.label}`,
              value: formatMoney(revenueInRange),
              valueRaw: revenueInRange,
              valueKind: "money",
              deltaPct: revDelta,
              higherIsBetter: true,
              hint: ar ? `سابقاً ${formatMoney(revPrev)}` : `Prev ${formatMoney(revPrev)}`,
              narrate: {
                topic: "revenue",
                summary: ar
                  ? `إيراد ${range.label}: ${formatMoney(revenueInRange)} (${formatPercent(revDelta, 1)} مقارنةً بالفترة السابقة)`
                  : `Revenue ${range.label}: ${formatMoney(revenueInRange)} (${formatPercent(revDelta, 1)} vs prior)`,
                facts: {
                  topic: "revenue",
                  period: range.label,
                  revenue: revenueInRange,
                  prevRevenue: revPrev,
                  delta: revDelta,
                  currency: "JOD",
                },
              },
            },
            {
              label: ar ? "مصاريف" : "Expenses",
              value: formatMoney(expenseInRange),
              valueRaw: expenseInRange,
              valueKind: "money",
              deltaPct: expDelta,
              higherIsBetter: false,
              hint: ar ? `سابقاً ${formatMoney(expPrev)}` : `Prev ${formatMoney(expPrev)}`,
              narrate: {
                topic: "expense",
                summary: ar
                  ? `مصاريف ${range.label}: ${formatMoney(expenseInRange)} (${formatPercent(expDelta, 1)})`
                  : `Expenses ${range.label}: ${formatMoney(expenseInRange)} (${formatPercent(expDelta, 1)})`,
                facts: {
                  topic: "expense",
                  period: range.label,
                  expense: expenseInRange,
                  prevExpense: expPrev,
                  delta: expDelta,
                  currency: "JOD",
                },
              },
            },
            {
              label: ar ? "صافي" : "Net",
              value: formatMoney(netInRange),
              valueRaw: netInRange,
              valueKind: "money",
              deltaPct: netDelta,
              higherIsBetter: true,
              hint: ar
                ? `هامش ${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)}`
                : `${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)} margin`,
              narrate: {
                topic: "net",
                summary: ar
                  ? `صافي ${range.label}: ${formatMoney(netInRange)} على هامش ${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)}`
                  : `Net ${range.label}: ${formatMoney(netInRange)} on ${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)} margin`,
                facts: {
                  topic: "net",
                  period: range.label,
                  net: netInRange,
                  prevNet: netPrev,
                  marginPct: revenueInRange > 0 ? netInRange / revenueInRange : 0,
                  delta: netDelta,
                  currency: "JOD",
                },
              },
            },
            {
              label: ar ? "إشغال أرينا" : "Arena occupancy",
              value: formatPercent(occupancyPct, 0),
              valueRaw: occupancyPct,
              valueKind: "percent",
              hint: ar
                ? `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} غرفة`
                : `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} rooms`,
              narrate: {
                topic: "occupancy",
                summary: ar
                  ? `إشغال أرينا: ${formatPercent(occupancyPct, 0)} — ${formatNumber(activeBookings)} من ${formatNumber(totalRooms)} غرفة`
                  : `Arena occupancy: ${formatPercent(occupancyPct, 0)} — ${formatNumber(activeBookings)} of ${formatNumber(totalRooms)} rooms`,
                facts: {
                  topic: "occupancy",
                  occupancyPct,
                  activeBookings,
                  totalRooms,
                },
              },
            },
          ]}
        />

        {/* Period selector rail — Heritage Modern hairline treatment */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-1 py-3"
          style={{
            borderTop: "1px solid var(--heri-rule)",
            borderBottom: "1px solid var(--heri-rule)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="heri-eyebrow">{ar ? "الفترة" : "Period"}</span>
            <PeriodSelector current={period} locale={lc} />
          </div>
          <span className="heri-eyebrow heri-eyebrow-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
            ESG · {latestEsg.toFixed(1)} / 100
          </span>
        </div>

        {/* Live ticker */}
        <LiveTicker items={tickerItems} />

        {/* === ROW 1: Per-company strip (the whole group at a glance) === */}
        <CompanyStrip items={stripItems} locale={lc} />

        {/* === ROW 2: Financial pulse | Activity | Alerts === */}
        <section className="grid gap-5 lg:grid-cols-12 heri-stagger">
          <div className="lg:col-span-5">
            <HeritageSection
              eyebrow={ar ? "مالية" : "Finance"}
              title={ar ? "النبض المالي" : "Financial pulse"}
              aside={ar ? "آخر 12 شهر — شهرياً" : "Last 12 months — monthly"}
              href="/finance"
              hrefLabel={ar ? "المالية" : "Finance"}
              rtl={ar}
            >
              <FinancialPulse
                revenueTrend={revenueTrend}
                expenseTrend={expenseTrend}
                monthLabels={monthLabels}
                locale={lc}
              />
            </HeritageSection>
          </div>

          <div className="lg:col-span-4">
            <HeritageSection
              eyebrow={ar ? "نشاط" : "Activity"}
              title={ar ? "تيار النشاط" : "Activity stream"}
              aside={ar ? "إشارات · توقعات · حجوزات" : "Insights · forecasts · bookings"}
              href="/insights"
              hrefLabel={ar ? "كل النشاط" : "View all"}
              rtl={ar}
            >
              <ActivityStream items={activity} locale={lc} />
            </HeritageSection>
          </div>

          <div className="lg:col-span-3">
            <HeritageSection
              eyebrow={ar ? "تنبيه" : "Alerts"}
              title={ar ? "تنبيهات الآن" : "Now"}
              aside={
                alerts.length > 0
                  ? (ar ? `${alerts.length} عنصر يتطلب انتباه` : `${alerts.length} item${alerts.length === 1 ? "" : "s"} need attention`)
                  : (ar ? "كل شيء على ما يرام" : "All clear")
              }
            >
              <AlertCenter items={alerts} locale={lc} />
            </HeritageSection>
          </div>
        </section>

        {/* === ROW 3: Tasks | Forecasts | Calendar === */}
        <section className="grid gap-5 lg:grid-cols-12 heri-stagger">
          <div className="lg:col-span-4">
            <HeritageSection
              eyebrow={ar ? "مهامي" : "Tasks"}
              title={ar ? "مهامي القادمة" : "My upcoming tasks"}
              aside={
                me ? (
                  <span className="inline-flex items-center gap-2">
                    <RankBadge rank={(me.rank ?? "PAWN") as any} size="sm" showLabel={false} />
                    <span className="heri-number-mono" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
                      {ar ? `${myRank.ar} · ${formatNumber(me.xp)} XP` : `${myRank.en} · ${formatNumber(me.xp)} XP`}
                    </span>
                  </span>
                ) : null
              }
              href="/tasks"
              hrefLabel={ar ? "كل المهام" : "All tasks"}
              rtl={ar}
            >
              {myTasksDue.length === 0 ? (
                <div
                  className="py-6 text-center"
                  style={{ color: "var(--heri-ink-3)", fontSize: 12.5, fontStyle: "italic" }}
                >
                  {ar ? "لا مهام معلقة" : "No pending tasks"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {myTasksDue.map((t) => {
                    const tone =
                      t.priority === "URGENT" ? "critical"
                      : t.priority === "HIGH" ? "warn"
                      : t.priority === "MEDIUM" ? "info"
                      : "neutral";
                    return (
                      <li key={t.id}>
                        <Link
                          href="/tasks"
                          className="flex items-center justify-between gap-3 px-3 py-2.5 transition heri-focusable"
                          style={{
                            background: "var(--heri-cream)",
                            border: "1px solid var(--heri-rule)",
                            textDecoration: "none",
                          }}
                        >
                          <div className="min-w-0">
                            <div
                              className="line-clamp-1"
                              style={{ fontSize: 13, fontWeight: 600, color: "var(--heri-ink)", letterSpacing: "-0.005em" }}
                            >
                              {t.title}
                            </div>
                            <div
                              className="heri-number-mono mt-0.5"
                              style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                            >
                              {t.kind === "SIDE" ? "⚡ " : ""}+{Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1))} XP
                            </div>
                          </div>
                          <HeritagePill tone={tone}>
                            {t.priority === "URGENT" ? (ar ? "عاجل" : "URG")
                              : t.priority === "HIGH" ? (ar ? "مهم" : "HI")
                              : t.priority === "MEDIUM" ? (ar ? "متوسط" : "MED")
                              : (ar ? "منخفض" : "LOW")}
                          </HeritagePill>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </HeritageSection>
          </div>

          <div className="lg:col-span-4">
            <HeritageSection
              eyebrow={ar ? "ذكاء" : "Intelligence"}
              title={ar ? "طبقة الذكاء" : "Intelligence layer"}
              aside={
                brainIQ
                  ? (ar ? `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend === "rising" ? "↑" : brainIQ.trend === "falling" ? "↓" : "→"}` : `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend}`)
                  : (ar ? "توقعات سلسلة التوريد" : "Supply chain forecasts")
              }
              href="/brain"
              hrefLabel={ar ? "مركز الدماغ" : "Brain hub"}
              rtl={ar}
            >
              {/* Brain IQ strip */}
              {brainIQ ? (
                <Link
                  href="/brain/iq"
                  className="mb-2 flex items-center justify-between px-3 py-2.5 transition"
                  style={{
                    background: "var(--heri-cream-2)",
                    border: "1px solid var(--heri-rule-strong)",
                    borderInlineStart: "3px solid var(--heri-ochre)",
                    textDecoration: "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5" style={{ color: "var(--heri-ochre)" }} strokeWidth={1.5} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--heri-ink)" }}>
                      {ar ? "ذكاء الدماغ" : "Brain IQ"}
                    </span>
                    <BrainStatusBadge />
                  </div>
                  <span
                    className="heri-number-mono"
                    style={{ fontSize: 18, fontWeight: 700, color: "var(--heri-ochre-2)", letterSpacing: "-0.02em" }}
                  >
                    {Math.round(brainIQ.score)}
                  </span>
                </Link>
              ) : null}
              {forecasts.length === 0 ? (
                <div
                  className="py-4 text-center"
                  style={{ color: "var(--heri-ink-3)", fontSize: 12.5, fontStyle: "italic" }}
                >
                  {ar ? "لا توقعات نشطة" : "No active forecasts"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {forecasts.slice(0, 2).map((f) => (
                    <li
                      key={f.id}
                      className="px-3 py-2.5"
                      style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="line-clamp-1"
                          style={{ fontSize: 13, fontWeight: 600, color: "var(--heri-ink)", letterSpacing: "-0.005em" }}
                        >
                          {f.productLabel}
                        </div>
                        <span
                          className="heri-number-mono"
                          style={{ fontSize: 11, fontWeight: 600, color: "var(--heri-copper)" }}
                        >
                          {formatNumber(f.predictedDemand)} {f.unit}
                        </span>
                      </div>
                      <div
                        className="heri-number-mono mt-1 flex items-center gap-1.5"
                        style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                      >
                        <span className="truncate">{f.source.name}</span>
                        <span style={{ color: "var(--heri-rule-strong)" }}>→</span>
                        <span className="truncate">{f.target.name}</span>
                        <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                        <span>{(f.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </HeritageSection>
          </div>

          <div className="lg:col-span-4">
            <HeritageSection
              eyebrow={ar ? "تقويم" : "Calendar"}
              title={ar ? "التقويم القادم" : "Upcoming calendar"}
              aside={ar ? "حجوزات · صلاحيات · حصاد · مهام (4 أسابيع)" : "Bookings · expiry · harvest · tasks (4 weeks)"}
            >
              <UpcomingCalendar events={calendarEvents} weeks={4} locale={lc} />
            </HeritageSection>
          </div>
        </section>

        {/* === ROW 3.5: Pinned shortcuts (if any) === */}
        {myPins.length > 0 ? (
          <HeritageSection
            eyebrow={ar ? "مثبتة" : "Pinned"}
            title={ar ? "اختصاراتي" : "My shortcuts"}
            aside={
              ar
                ? `${formatNumber(myPins.length)} عنصر للوصول السريع`
                : `${formatNumber(myPins.length)} quick-access items`
            }
            href="/pinned"
            hrefLabel={ar ? "إدارة" : "Manage"}
            rtl={ar}
          >
            <div className="flex flex-wrap gap-2">
              {myPins.slice(0, 12).map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule-strong)",
                    color: "var(--heri-ink)",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                  }}
                >
                  <span style={{ color: "var(--heri-ochre)" }}>◆</span>
                  {ar ? p.label : p.labelEn ?? p.label}
                  <span
                    className="heri-number-mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--heri-ink-3)",
                      paddingInlineStart: 6,
                      borderInlineStart: "1px solid var(--heri-rule)",
                    }}
                  >
                    {p.entityType}
                  </span>
                </Link>
              ))}
              {myPins.length > 12 ? (
                <Link
                  href="/pinned"
                  className="heri-focusable inline-flex items-center px-3 py-1.5 heri-number-mono"
                  style={{
                    color: "var(--heri-ink-3)",
                    background: "transparent",
                    border: "1px solid var(--heri-rule)",
                    fontSize: 11,
                    textDecoration: "none",
                  }}
                >
                  +{formatNumber(myPins.length - 12)}
                </Link>
              ) : null}
            </div>
          </HeritageSection>
        ) : null}

        {/* === ROW 3.5: Today's audit pulse === */}
        <section className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <TodayActivity
              items={todayActivityItems}
              totalToday={totalActivityToday}
              locale={lc}
            />
          </div>
        </section>

        {/* === ROW 4: Module navigation — Heritage Modern hairline tiles === */}
        <HeritageSection
          eyebrow={ar ? "وحدات" : "Modules"}
          title={ar ? "الوصول السريع" : "Quick navigation"}
          aside={ar ? "تنقل بين وحدات المجموعة" : "Jump between business units"}
          bare
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8 heri-stagger">
            <HeritageQuickLink href="/hotels" icon={Hotel} label={ar ? "أرينا" : "Arena"} sub={`${formatNumber(totalRooms)} ${ar ? "غرفة" : "rooms"}`} tone="ochre" />
            <HeritageQuickLink href="/dairy" icon={Milk} label={ar ? "المها" : "Maha"} sub={`${formatNumber(dairyVolumeL)} L`} tone="copper" />
            <HeritageQuickLink href="/farms" icon={Sprout} label={ar ? "لوران" : "Loran"} sub={`${formatNumber(farms.length)} ${ar ? "مزرعة" : "farms"}`} tone="teal" />
            <HeritageQuickLink href="/education" icon={GraduationCap} label="The Tank" sub={`${formatNumber(programs.length)} ${ar ? "مشروع" : "programs"}`} tone="ink" />
            <HeritageQuickLink href="/markets" icon={TrendingUp} label={ar ? "الأسواق" : "Markets"} sub={`${groupMove >= 0 ? "+" : ""}${groupMove.toFixed(2)}%`} tone="terracotta" />
            <HeritageQuickLink href="/sustainability" icon={Building2} label="ESG" sub={latestEsg.toFixed(1) + "/100"} tone="teal" />
            <HeritageQuickLink href="/projects" icon={Building2} label={ar ? "أنابيب" : "Pipeline"} sub={formatMoney(totalProjectsBudget)} tone="rose" />
            <HeritageQuickLink href="/achievements" icon={Trophy} label={ar ? "الإنجازات" : "Achievements"} sub={`${myRank.symbol} ${ar ? myRank.ar : myRank.en}`} tone="ochre" />
          </div>
        </HeritageSection>
      </PageContainer>
    </>
  );
}

// (Legacy QuickLink removed — replaced by HeritageQuickLink. See docs/DESIGN-SKILL.md §1.D.)
