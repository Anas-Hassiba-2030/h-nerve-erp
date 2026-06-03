// EXECUTIVE DASHBOARD — viewport-fit, no horizontal scroll, no excess padding.
// Designed to tell the entire group's story in one screen, then go deeper
// only on click. Period selector at top toggles all metrics dynamically.

import Link from "next/link";
import {
  Hotel, Milk, Sprout, GraduationCap, TrendingUp, Trophy, Building2, Brain,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
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
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { listPins } from "@/lib/pins";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatPercent, localizeUnit } from "@/lib/utils";
import { rankById } from "@/lib/gamification";
import { computeIQ } from "@/lib/brain/meta.reflector";
import "../daylight.css";

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

  // Greeting — universal display headline, no name injection (avoids cross-script collision)
  const greeting =
    new Date().getHours() < 5 ? m["dashboard.greetingNight"] :
    new Date().getHours() < 12 ? m["dashboard.greetingMorning"] :
    new Date().getHours() < 17 ? m["dashboard.greetingAfternoon"] :
    m["dashboard.greetingEvening"];

  // Personal line — kept SCRIPT-MATCHED to the active locale.
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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={m["dashboard.eyebrow"]}
        title={ar ? "اللوحة التنفيذية" : "Executive dashboard"}
        subtitle={
          ar
            ? "النبض الكامل لمجموعة الحوراني عبر كل الوحدات."
            : "Full pulse of Hourani Group across every business unit."
        }
        status={<><BrainStatusBadge /></>}
      />

      {/* Period selector rail */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-1 py-3"
        style={{
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "الفترة" : "Period"}</span>
          <PeriodSelector current={period} locale={lc} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
          ESG · {latestEsg.toFixed(1)} / 100
        </span>
      </div>

      {/* Live ticker */}
      <LiveTicker items={tickerItems} />

      {/* === ROW 1: Per-company strip (the whole group at a glance) === */}
      <CompanyStrip items={stripItems} locale={lc} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? `إيراد ${range.label}` : `Revenue ${range.label}`} value={formatMoney(revenueInRange)} hint={ar ? `سابقاً ${formatMoney(revPrev)}` : `Prev ${formatMoney(revPrev)}`} delta={revDelta >= 0 ? { dir: "up", text: formatPercent(Math.abs(revDelta), 1) } : { dir: "down", text: formatPercent(Math.abs(revDelta), 1) }} />
        <DaylightKpi label={ar ? "مصاريف" : "Expenses"} value={formatMoney(expenseInRange)} hint={ar ? `سابقاً ${formatMoney(expPrev)}` : `Prev ${formatMoney(expPrev)}`} />
        <DaylightKpi label={ar ? "صافي" : "Net"} value={formatMoney(netInRange)} hint={ar ? `هامش ${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)}` : `${formatPercent(revenueInRange > 0 ? netInRange / revenueInRange : 0, 1)} margin`} />
        <DaylightKpi label={ar ? "إشغال أرينا" : "Arena occupancy"} value={formatPercent(occupancyPct, 0)} hint={ar ? `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} غرفة` : `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} rooms`} />
      </DaylightKpiGrid>

      {/* === ROW 2: Financial pulse | Activity | Alerts === */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <DaylightPanel
            title={ar ? "النبض المالي" : "Financial pulse"}
            aside={ar ? "آخر 12 شهر — شهرياً" : "Last 12 months — monthly"}
          >
            <FinancialPulse
              revenueTrend={revenueTrend}
              expenseTrend={expenseTrend}
              monthLabels={monthLabels}
              locale={lc}
            />
          </DaylightPanel>
        </div>

        <div className="lg:col-span-4">
          <DaylightPanel
            title={ar ? "تيار النشاط" : "Activity stream"}
            aside={ar ? "إشارات · توقعات · حجوزات" : "Insights · forecasts · bookings"}
          >
            <ActivityStream items={activity} locale={lc} />
          </DaylightPanel>
        </div>

        <div className="lg:col-span-3">
          <DaylightPanel
            title={ar ? "تنبيهات الآن" : "Now"}
            aside={
              alerts.length > 0
                ? (ar ? `${alerts.length} عنصر يتطلب انتباه` : `${alerts.length} item${alerts.length === 1 ? "" : "s"} need attention`)
                : (ar ? "كل شيء على ما يرام" : "All clear")
            }
          >
            <AlertCenter items={alerts} locale={lc} />
          </DaylightPanel>
        </div>
      </section>

      {/* === ROW 3: Tasks | Forecasts | Calendar === */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <DaylightPanel
            title={ar ? "مهامي القادمة" : "My upcoming tasks"}
            aside={
              me ? (
                <span className="inline-flex items-center gap-2">
                  <RankBadge rank={(me.rank ?? "PAWN") as any} size="sm" showLabel={false} />
                  <span style={{ fontSize: 11, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>
                    {ar ? `${myRank.ar} · ${formatNumber(me.xp)} XP` : `${myRank.en} · ${formatNumber(me.xp)} XP`}
                  </span>
                </span>
              ) : undefined
            }
          >
            {myTasksDue.length === 0 ? (
              <div
                className="py-6 text-center"
                style={{ color: "var(--ink-muted)", fontSize: 12.5, fontStyle: "italic" }}
              >
                {ar ? "لا مهام معلقة" : "No pending tasks"}
              </div>
            ) : (
              <ul className="space-y-2">
                {myTasksDue.map((t) => {
                  const isUrgent = t.priority === "URGENT" || t.priority === "HIGH";
                  return (
                    <li key={t.id}>
                      <Link
                        href="/tasks"
                        className="flex items-center justify-between gap-3 px-3 py-2.5 transition"
                        style={{
                          background: "var(--cream)",
                          border: "1px solid var(--line)",
                          textDecoration: "none",
                          borderRadius: 8,
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="line-clamp-1"
                            style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}
                          >
                            {ar ? t.title : (t.titleEn || t.title)}
                          </div>
                          <div
                            className="mt-0.5"
                            style={{ fontSize: 10.5, color: "var(--ink-muted)" }}
                          >
                            {t.kind === "SIDE" ? "⚡ " : ""}+{Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1))} XP
                          </div>
                        </div>
                        <span className={`tag ${isUrgent ? "gold" : "ok"}`}>
                          {t.priority === "URGENT" ? (ar ? "عاجل" : "URG")
                            : t.priority === "HIGH" ? (ar ? "مهم" : "HI")
                            : t.priority === "MEDIUM" ? (ar ? "متوسط" : "MED")
                            : (ar ? "منخفض" : "LOW")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </DaylightPanel>
        </div>

        <div className="lg:col-span-4">
          <DaylightPanel
            title={ar ? "طبقة الذكاء" : "Intelligence layer"}
            aside={
              brainIQ
                ? (ar ? `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend === "rising" ? "↑" : brainIQ.trend === "falling" ? "↓" : "→"}` : `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend}`)
                : (ar ? "توقعات سلسلة التوريد" : "Supply chain forecasts")
            }
          >
            {/* Brain IQ strip */}
            {brainIQ ? (
              <Link
                href="/brain/iq"
                className="mb-2 flex items-center justify-between px-3 py-2.5 transition"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--line)",
                  borderInlineStart: "3px solid var(--gold)",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    {ar ? "ذكاء الدماغ" : "Brain IQ"}
                  </span>
                  <BrainStatusBadge />
                </div>
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.round(brainIQ.score)}
                </span>
              </Link>
            ) : null}
            {forecasts.length === 0 ? (
              <div
                className="py-4 text-center"
                style={{ color: "var(--ink-muted)", fontSize: 12.5, fontStyle: "italic" }}
              >
                {ar ? "لا توقعات نشطة" : "No active forecasts"}
              </div>
            ) : (
              <ul className="space-y-2">
                {forecasts.slice(0, 2).map((f) => (
                  <li
                    key={f.id}
                    className="px-3 py-2.5"
                    style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="line-clamp-1"
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}
                      >
                        {ar ? f.productLabel : (f.productLabelEn || f.productLabel)}
                      </div>
                      <span
                        style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatNumber(f.predictedDemand)} {localizeUnit(f.unit, ar)}
                      </span>
                    </div>
                    <div
                      className="mt-1 flex items-center gap-1.5"
                      style={{ fontSize: 10.5, color: "var(--ink-muted)" }}
                    >
                      <span className="truncate">{ar ? f.source.name : (f.source.nameEn || f.source.name)}</span>
                      <span style={{ color: "var(--line)" }}>→</span>
                      <span className="truncate">{ar ? f.target.name : (f.target.nameEn || f.target.name)}</span>
                      <span style={{ color: "var(--line)" }}>·</span>
                      <span>{(f.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DaylightPanel>
        </div>

        <div className="lg:col-span-4">
          <DaylightPanel
            title={ar ? "التقويم القادم" : "Upcoming calendar"}
            aside={ar ? "حجوزات · صلاحيات · حصاد · مهام (4 أسابيع)" : "Bookings · expiry · harvest · tasks (4 weeks)"}
          >
            <UpcomingCalendar events={calendarEvents} weeks={4} locale={lc} />
          </DaylightPanel>
        </div>
      </section>

      {/* === ROW 3.5: Pinned shortcuts (if any) === */}
      {myPins.length > 0 ? (
        <DaylightPanel
          title={ar ? "اختصاراتي" : "My shortcuts"}
          aside={
            ar
              ? `${formatNumber(myPins.length)} عنصر للوصول السريع`
              : `${formatNumber(myPins.length)} quick-access items`
          }
        >
          <div className="flex flex-wrap gap-2">
            {myPins.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="inline-flex items-center gap-2 px-3 py-1.5 transition"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  borderRadius: 999,
                }}
              >
                <span style={{ color: "var(--gold)" }}>◆</span>
                {ar ? p.label : p.labelEn ?? p.label}
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    color: "var(--ink-muted)",
                    paddingInlineStart: 6,
                    borderInlineStart: "1px solid var(--line)",
                  }}
                >
                  {p.entityType}
                </span>
              </Link>
            ))}
            {myPins.length > 12 ? (
              <Link
                href="/pinned"
                className="inline-flex items-center px-3 py-1.5"
                style={{
                  color: "var(--ink-muted)",
                  background: "transparent",
                  border: "1px solid var(--line)",
                  fontSize: 11,
                  textDecoration: "none",
                  borderRadius: 999,
                }}
              >
                +{formatNumber(myPins.length - 12)}
              </Link>
            ) : null}
          </div>
        </DaylightPanel>
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

      {/* === ROW 4: Module navigation === */}
      <DaylightPanel
        title={ar ? "الوصول السريع" : "Quick navigation"}
        aside={ar ? "تنقل بين وحدات المجموعة" : "Jump between business units"}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Link href="/hotels" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Hotel className="h-5 w-5 mx-auto" />
            <span>{ar ? "أرينا" : "Arena"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatNumber(totalRooms)} {ar ? "غرفة" : "rooms"}</span>
          </Link>
          <Link href="/dairy" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Milk className="h-5 w-5 mx-auto" />
            <span>{ar ? "المها" : "Maha"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatNumber(dairyVolumeL)} L</span>
          </Link>
          <Link href="/farms" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Sprout className="h-5 w-5 mx-auto" />
            <span>{ar ? "لوران" : "Loran"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatNumber(farms.length)} {ar ? "مزرعة" : "farms"}</span>
          </Link>
          <Link href="/education" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <GraduationCap className="h-5 w-5 mx-auto" />
            <span>The Tank</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatNumber(programs.length)} {ar ? "مشروع" : "programs"}</span>
          </Link>
          <Link href="/markets" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <TrendingUp className="h-5 w-5 mx-auto" />
            <span>{ar ? "الأسواق" : "Markets"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{groupMove >= 0 ? "+" : ""}{groupMove.toFixed(2)}%</span>
          </Link>
          <Link href="/sustainability" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Building2 className="h-5 w-5 mx-auto" />
            <span>ESG</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{latestEsg.toFixed(1)}/100</span>
          </Link>
          <Link href="/projects" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Building2 className="h-5 w-5 mx-auto" />
            <span>{ar ? "أنابيب" : "Pipeline"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatMoney(totalProjectsBudget)}</span>
          </Link>
          <Link href="/achievements" className="dl-btn dl-btn-secondary" style={{ borderRadius: 12, justifyContent: "center", flexDirection: "column", gap: 4, paddingTop: 12, paddingBottom: 12, textAlign: "center" }}>
            <Trophy className="h-5 w-5 mx-auto" />
            <span>{ar ? "الإنجازات" : "Achievements"}</span>
            <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{myRank.symbol} {ar ? myRank.ar : myRank.en}</span>
          </Link>
        </div>
      </DaylightPanel>
    </DaylightShell>
  );
}
