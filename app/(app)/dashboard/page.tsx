// EXECUTIVE DASHBOARD — viewport-fit, no horizontal scroll, no excess padding.
// Designed to tell the entire group's story in one screen, then go deeper
// only on click. Period selector at top toggles all metrics dynamically.

import Link from "next/link";
import {
  Hotel, Milk, Sprout, GraduationCap, TrendingUp, Trophy, Building2, Brain,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { LiveTicker } from "@/components/ui/LiveTicker";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { isValidPeriod, type Period } from "@/lib/finance/period";
import { CompanyStrip } from "@/components/dashboard/CompanyStrip";
import { ActivityStream } from "@/components/dashboard/ActivityStream";
import { AlertCenter } from "@/components/dashboard/AlertCenter";
import { FinancialPulse } from "@/components/dashboard/FinancialPulse";
import { UpcomingCalendar } from "@/components/dashboard/UpcomingCalendar";
import { TodayActivity } from "@/components/dashboard/TodayActivity";
import { UpcomingTasksPanel } from "@/components/dashboard/UpcomingTasksPanel";
import { IntelligenceLayerPanel } from "@/components/dashboard/IntelligenceLayerPanel";
import { BrainStatusBadge } from "@/components/brain/BrainStatusBadge";
import { ShareViewButton } from "@/components/brain/ShareViewButton";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils/utils";
import { getDashboardData } from "./data";
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

  const {
    range,
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
    revenueInRange,
    expenseInRange,
    netInRange,
    revPrev,
    expPrev,
    revDelta,
    revenueTrend,
    expenseTrend,
    monthLabels,
    latestEsg,
    groupMove,
    totalProjectsBudget,
    stripItems,
    activity,
    alerts,
    tickerItems,
    myRank,
    calendarEvents,
  } = await getDashboardData({ session, period, ar, lc });

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
        actions={
          <ShareViewButton
            title={ar ? "اللوحة التنفيذية" : "Executive dashboard"}
            body={ar ? "النبض الكامل لمجموعة الحوراني عبر كل الوحدات." : "Full pulse of Hourani Group across every business unit."}
            refType="view" refId="dashboard" ar={ar} tone="light"
          />
        }
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
          <UpcomingTasksPanel ar={ar} me={me} myTasksDue={myTasksDue} myRank={myRank} />
        </div>

        <div className="lg:col-span-4">
          <IntelligenceLayerPanel ar={ar} brainIQ={brainIQ} forecasts={forecasts} />
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
