// EXECUTIVE DASHBOARD — server data module.
//
// All prisma queries + derivations the page used inline, factored into a
// single async function. Behaviour-preserving: identical where/include/
// orderBy/take, identical aggregation math, identical locale branches.

import { type TickerItem } from "@/components/ui/LiveTicker";
import { periodToRange, type Period } from "@/lib/finance/period";
import { type CompanyStripItem } from "@/components/dashboard/CompanyStrip";
import { type SectorGroup } from "@/components/dashboard/SectorStrip";
import { type ActivityItem } from "@/components/dashboard/ActivityStream";
import { type AlertItem } from "@/components/dashboard/AlertCenter";
import { type CalendarEvent } from "@/components/dashboard/UpcomingCalendar";
import { type ActivityLogLite } from "@/components/dashboard/TodayActivity";
import { listPins } from "@/lib/utils/pins";
import { prisma } from "@/lib/db/db";
import { type SessionUser } from "@/lib/auth/session";
import { formatMoney, formatNumber, formatPercent, localizeUnit } from "@/lib/utils/utils";
import { rankById } from "@/lib/utils/gamification";
import { computeIQ } from "@/lib/brain/meta.reflector";

export async function getDashboardData({
  session,
  period,
  ar,
  lc,
}: {
  session: SessionUser | null;
  period: Period;
  ar: boolean;
  lc: "ar" | "en";
}) {
  const range = periodToRange(period);
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const next28Days = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // ONE parallel wave. These ~22 reads used to run as five sequential
  // await-waves (insight count → IQ → main batch → activity batch → pins);
  // they are mutually independent, so a single Promise.all cuts dashboard
  // latency to the slowest query instead of the sum of the waves — and holds
  // a pooled connection for the shortest possible time.
  const [
    activeInsightCount, brainIQ,
    me, companies, totalRoomsAgg, activeRoomsAgg, bookingsAgg,
    dairyVolumeAgg, expiringDairy, farms, programs, forecasts, recentInsights,
    transactions, marketStocks, esg, futureProjects, myTasksDue,
    upcomingBookings, expiringDairyAll, harvestingCrops,
    recentActivityLogs, totalActivityToday, myPins,
  ] = await Promise.all([
    // Phase F7 — scoped read. BrainInsight now has tenantId (Phase F3
    // TENANT_SCOPED_MODELS), so this count is automatically restricted
    // to the active tenant's insights. ADMIN with no tenant cookie sees
    // the global count (the original behaviour).
    prisma.brainInsight.count({
      where: { resolvedAt: null, dismissedAt: null },
    }),
    computeIQ("default").catch(() => null),
    session ? prisma.user.findUnique({ where: { id: session.id } }) : null,
    prisma.company.findMany({ orderBy: { createdAt: "asc" }, take: 50 }),
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
    prisma.farm.findMany({ orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.program.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
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
    prisma.marketStock.findMany({ where: { companyId: { not: null } }, include: { company: true }, take: 100 }),
    prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }], take: 200 }),
    prisma.futureProject.findMany({ take: 100 }),
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
      take: 100,
    }),
    // All dairy expiring within 28d
    prisma.dairyBatch.findMany({
      where: { expiryDate: { gte: now, lte: next28Days }, status: { not: "RECALLED" } },
      orderBy: { expiryDate: "asc" },
      take: 100,
    }),
    // Crops with harvest in next 28d
    prisma.crop.findMany({
      where: { expectedHarvest: { gte: now, lte: next28Days }, status: "GROWING" },
      include: { farm: true },
      orderBy: { expectedHarvest: "asc" },
      take: 100,
    }),
    // Today's activity log (last 24h)
    prisma.activityLog.findMany({
      where: { createdAt: { gte: last24h } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.activityLog.count({ where: { createdAt: { gte: last24h } } }),
    session ? listPins(session.id) : [],
  ]);

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
      .filter((t) => t.companyId === companyId && t.kind === "REVENUE" && t.occurredAt >= range.start && t.occurredAt <= range.end)
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
    let health: "OK" | "WARN" | "CRITICAL" | "NONE" = "OK";
    if (c.sector === "AGRICULTURE") {
      const f = farms.filter((x) => x.companyId === c.id);
      const crit = f.some((x) => x.alertLevel === "CRITICAL");
      const warn = f.some((x) => x.alertLevel === "WARN");
      health = crit ? "CRITICAL" : warn ? "WARN" : "OK";
    } else if (c.sector === "DAIRY" && expiringDairy.some((b) => b.companyId === c.id)) {
      health = "WARN";
    }
    // Guard: a unit with no revenue in the period reads neutral, never green
    // "Healthy" (that's what made JOD 0 cards look fake). Don't mask a real
    // WARN/CRITICAL signal.
    if (health === "OK" && companyRevenue(c.id) <= 0) health = "NONE";
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

  // === Sector roll-up — 5 cards that drill to their member units ===
  const SECTOR_META: Record<string, { ar: string; en: string; code: string; order: number }> = {
    HOSPITALITY: { ar: "الضيافة", en: "Hospitality", code: "ARENA", order: 0 },
    DAIRY:       { ar: "الألبان", en: "Dairy",       code: "MAHA",  order: 1 },
    AGRICULTURE: { ar: "الزراعة", en: "Agriculture", code: "LORAN", order: 2 },
    EDUCATION:   { ar: "التعليم", en: "Education",   code: "AAU",   order: 3 },
    INVESTMENT:  { ar: "الاستثمار", en: "Investment", code: "HH",   order: 4 },
    TRADE:       { ar: "التجارة", en: "Trade",       code: "HH",    order: 5 },
  };
  const sectorOps = (sector: string, unitCount: number): { label: string; value: string } => {
    if (sector === "HOSPITALITY") return { label: ar ? "إشغال" : "Occupancy", value: formatPercent(occupancyPct, 0) };
    if (sector === "DAIRY") return { label: ar ? "إنتاج 30ي" : "30d output", value: `${formatNumber(dairyVolumeL)} L` };
    if (sector === "AGRICULTURE") return { label: ar ? "مزارع" : "Farms", value: formatNumber(farms.length) };
    if (sector === "EDUCATION") return { label: ar ? "برامج" : "Programs", value: formatNumber(programs.length) };
    return { label: ar ? "وحدات" : "Units", value: formatNumber(unitCount) };
  };
  const bySector = new Map<string, CompanyStripItem[]>();
  for (const it of stripItems) {
    const arr = bySector.get(it.sector) ?? [];
    arr.push(it);
    bySector.set(it.sector, arr);
  }
  const sectorGroups: SectorGroup[] = [...bySector.entries()]
    .map(([sector, units]) => {
      const meta = SECTOR_META[sector] ?? { ar: sector, en: sector, code: "", order: 99 };
      const revenue = units.reduce((a, u) => a + u.revenue, 0);
      const len = units.reduce((mx, u) => Math.max(mx, u.revenueTrend.length), 0);
      const revenueTrend = Array.from({ length: len }, (_, i) =>
        units.reduce((a, u) => a + (u.revenueTrend[i] ?? 0), 0)
      );
      const health: "OK" | "WARN" | "CRITICAL" | "NONE" =
        revenue <= 0
          ? "NONE"
          : units.some((u) => u.health === "CRITICAL")
            ? "CRITICAL"
            : units.some((u) => u.health === "WARN")
              ? "WARN"
              : "OK";
      return {
        id: sector,
        name: meta.ar,
        nameEn: meta.en,
        code: meta.code,
        revenue,
        revenueTrend,
        ops: sectorOps(sector, units.length),
        health,
        units,
      };
    })
    .sort((a, b) => (SECTOR_META[a.id]?.order ?? 99) - (SECTOR_META[b.id]?.order ?? 99));

  // === Activity stream items ===
  const activity: ActivityItem[] = [
    ...recentInsights.slice(0, 4).map((i): ActivityItem => {
      const it = ar ? i.title : (i.titleEn || i.title);
      const ib = ar ? i.body : (i.bodyEn || i.body);
      return {
        id: i.id, kind: "INSIGHT", severity: i.severity as any,
        title: it,
        sub: ib.slice(0, 70) + (ib.length > 70 ? "…" : ""),
        href: "/insights", time: i.createdAt,
      };
    }),
    ...forecasts.slice(0, 4).map((f): ActivityItem => ({
      id: f.id, kind: "FORECAST",
      title: ar ? f.productLabel : (f.productLabelEn || f.productLabel),
      sub: `${ar ? f.source.name : (f.source.nameEn || f.source.name)} → ${ar ? f.target.name : (f.target.nameEn || f.target.name)} · ${formatNumber(f.predictedDemand)} ${localizeUnit(f.unit, ar)}`,
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
        title: ar ? i.title : (i.titleEn || i.title), sub: ar ? "إشارة حرجة" : "Critical insight",
        href: "/insights", time: i.createdAt,
      })),
    ...farms
      .filter((f) => f.alertLevel !== "OK")
      .slice(0, 2)
      .map((f): AlertItem => ({
        id: f.id, kind: "FARM",
        severity: f.alertLevel === "CRITICAL" ? "CRITICAL" : "WARN",
        title: ar ? f.name : (f.nameEn || f.name),
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
        title: ar ? t.title : (t.titleEn || t.title),
        sub: ar ? "مهمة متأخرة" : "Overdue task",
        href: "/tasks", time: t.dueAt ?? undefined,
      })),
  ].slice(0, 6);

  // === Live ticker ===
  // Carries only signals NOT already shown as hero KPIs (occupancy + revenue
  // live up top) — so the ticker complements the dashboard instead of echoing
  // it.
  const tickerItems: TickerItem[] = [
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
      title: ar ? `حجز: ${b.guestName} في ${b.hotel.name}` : `Booking: ${b.guestName} @ ${b.hotel.nameEn || b.hotel.name}`,
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
      title: ar ? `حصاد ${c.name} في ${c.farm.name}` : `Harvest: ${c.name} @ ${c.farm.nameEn || c.farm.name}`,
      href: `/farms/${c.farmId}`,
    })),
    ...myTasksDue
      .filter((t) => t.dueAt)
      .map((t): CalendarEvent => ({
        id: t.id,
        date: t.dueAt!,
        kind: "TASK",
        title: ar ? t.title : (t.titleEn || t.title),
        href: "/tasks",
      })),
  ];

  return {
    range,
    activeInsightCount,
    brainIQ,
    me,
    companies,
    farms,
    programs,
    forecasts,
    myTasksDue,
    myPins,
    todayActivityItems,
    totalActivityToday,
    totalRooms,
    activeBookings,
    occupancyPct,
    dairyVolumeL,
    farmsAlerting,
    revenueInRange,
    expenseInRange,
    netInRange,
    revPrev,
    expPrev,
    netPrev,
    revDelta,
    netDelta,
    expDelta,
    revenueTrend,
    expenseTrend,
    monthLabels,
    latestEsg,
    groupMove,
    totalProjectsBudget,
    stripItems,
    sectorGroups,
    activity,
    alerts,
    tickerItems,
    myRank,
    calendarEvents,
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
