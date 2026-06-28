// EXECUTIVE DASHBOARD — viewport-fit, no horizontal scroll, no excess padding.
// Designed to tell the entire group's story in one screen, then go deeper
// only on click. Period selector at top toggles all metrics dynamically.

import Link from "next/link";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { LiveTicker } from "@/components/ui/LiveTicker";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { isValidPeriod, periodLabel, type Period } from "@/lib/finance/period";
import { SectorStrip } from "@/components/dashboard/SectorStrip";
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

export default async function DashboardPage(
  props: {
    searchParams: Promise<{ period?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await getCurrentUser();
  const locale = await getLocale();
  const m = await getMessages(locale);
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const period: Period = isValidPeriod(searchParams.period);

  const {
    brainIQ,
    me,
    companies,
    forecasts,
    myTasksDue,
    myPins,
    todayActivityItems,
    totalActivityToday,
    totalRooms,
    activeBookings,
    occupancyPct,
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
    sectorGroups,
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

  // Human period label so the hero reconciles with "Last 12 months" below.
  const periodHuman = periodLabel(period, ar);
  // Margin is only meaningful when BOTH revenue and expenses exist in the
  // period — otherwise we'd print a misleading "100% margin" off zero expenses.
  const marginHint =
    revenueInRange > 0 && expenseInRange > 0
      ? (ar
          ? `هامش ${formatPercent(netInRange / revenueInRange, 1)}`
          : `${formatPercent(netInRange / revenueInRange, 1)} margin`)
      : "—";

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "مجموعة الحوراني · كل الوحدات" : "Hourani Group · all units"}
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

      {/* === BAND 2: hero numbers — the figures that matter, up top === */}
      <DaylightKpiGrid>
        <DaylightKpi label={ar ? `الإيراد · ${periodHuman}` : `Revenue · ${periodHuman}`} value={formatMoney(revenueInRange)} hint={ar ? `سابقاً ${formatMoney(revPrev)}` : `Prev ${formatMoney(revPrev)}`} delta={revDelta >= 0 ? { dir: "up", text: formatPercent(Math.abs(revDelta), 1) } : { dir: "down", text: formatPercent(Math.abs(revDelta), 1) }} />
        <DaylightKpi label={ar ? "المصاريف" : "Expenses"} value={formatMoney(expenseInRange)} hint={ar ? `سابقاً ${formatMoney(expPrev)}` : `Prev ${formatMoney(expPrev)}`} />
        <DaylightKpi label={ar ? "صافي" : "Net"} value={formatMoney(netInRange)} hint={marginHint} />
        <DaylightKpi label={ar ? "إشغال أرينا" : "Arena occupancy"} value={formatPercent(occupancyPct, 0)} hint={ar ? `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} غرفة` : `${formatNumber(activeBookings)}/${formatNumber(totalRooms)} rooms`} />
      </DaylightKpiGrid>

      {/* === BAND 3: the businesses at a glance — 5 sector cards, drill to units === */}
      <SectorStrip groups={sectorGroups} locale={lc} />

      {/* === BAND 4: financial pulse + what needs attention === */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
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
            title={ar ? "يتطلب انتباهاً" : "Needs attention"}
            aside={
              alerts.length > 0
                ? (ar ? `${alerts.length} عنصر` : `${alerts.length} item${alerts.length === 1 ? "" : "s"}`)
                : (ar ? "كل شيء على ما يرام" : "All clear")
            }
          >
            <AlertCenter items={alerts} locale={lc} />
          </DaylightPanel>
        </div>
      </section>

      {/* === BAND 5: secondary — consolidated below the brief === */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <UpcomingTasksPanel ar={ar} me={me} myTasksDue={myTasksDue} myRank={myRank} />
        </div>

        <div className="lg:col-span-4">
          <IntelligenceLayerPanel ar={ar} brainIQ={brainIQ} forecasts={forecasts} />
        </div>

        <div className="lg:col-span-4">
          <DaylightPanel
            title={ar ? "تيار النشاط" : "Activity stream"}
            aside={ar ? "إشارات · توقعات · حجوزات" : "Insights · forecasts · bookings"}
          >
            <ActivityStream items={activity} locale={lc} />
          </DaylightPanel>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-12">
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

      {/* Quick-navigation grid removed — the mini-orbit (top-right of every
          section) now handles unit hopping, so the dashboard no longer
          repeats it as eight buttons. */}
    </DaylightShell>
  );
}
