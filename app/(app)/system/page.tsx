// /system — health dashboard. Database stats, AI engine status, recent
// errors, table counts, last activity per module. Admin-only "is the
// nervous system breathing?" screen.

import Link from "next/link";
import {
  Cpu, Database, Activity, Brain, Bell, Workflow, MessageSquare,
  Building2, Hotel, Milk, Sprout, GraduationCap, Wallet, TrendingUp,
  Leaf, FlaskConical, ListChecks, Trophy, Pin, Sparkles, ShieldCheck,
  Clock, Zap, Heart, Server,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { HeriKpi } from "@/components/HeriKpi";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";

function formatRel(d: Date | null, ar: boolean): string {
  if (!d) return ar ? "أبداً" : "never";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "now";
  if (diff < 3600) return ar ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return ar ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h ago`;
  return ar ? `منذ ${Math.floor(diff / 86400)} ي` : `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(ms: number, ar: boolean): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return ar ? `${d} يوم` : `${d}d`;
  if (h > 0) return ar ? `${h} ساعة` : `${h}h`;
  if (m > 0) return ar ? `${m} د` : `${m}m`;
  return ar ? `${s} ث` : `${s}s`;
}

export default async function SystemPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Probe database with parallel counts
  let dbHealthy = true;
  let dbLatency = 0;
  let counts: Record<string, number> = {};
  try {
    const start = Date.now();
    const [
      companies, users, hotels, bookings, dairy, farms, crops, programs,
      forecasts, insights, transactions, projects, marketStocks, esg,
      activityLog, tasks, achievements, alertRules, threads, messages, pins,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.hotel.count(),
      prisma.booking.count(),
      prisma.dairyBatch.count(),
      prisma.farm.count(),
      prisma.crop.count(),
      prisma.program.count(),
      prisma.supplyForecast.count(),
      prisma.aIInsight.count(),
      prisma.transaction.count(),
      prisma.futureProject.count(),
      prisma.marketStock.count(),
      prisma.sustainabilityScore.count(),
      prisma.activityLog.count(),
      prisma.task.count(),
      prisma.userAchievement.count(),
      prisma.alertRule.count(),
      prisma.messageThread.count(),
      prisma.message.count(),
      prisma.pin.count(),
    ]);
    dbLatency = Date.now() - start;
    counts = {
      companies, users, hotels, bookings, dairy, farms, crops, programs,
      forecasts, insights, transactions, projects, marketStocks, esg,
      activityLog, tasks, achievements, alertRules, threads, messages, pins,
    };
  } catch (e) {
    dbHealthy = false;
  }

  // Health metrics
  const [
    activeAlertRules, last24hActivity, last24hInsights, openInsights,
    last24hMessages, lastInsight, lastActivity, lastBooking, lastBatch,
    firstRecord,
  ] = await Promise.all([
    prisma.alertRule.count({ where: { isActive: true } }),
    prisma.activityLog.count({ where: { createdAt: { gte: last24h } } }),
    prisma.aIInsight.count({ where: { createdAt: { gte: last24h } } }),
    prisma.aIInsight.count({ where: { status: "OPEN", deletedAt: null } }),
    prisma.message.count({ where: { createdAt: { gte: last24h } } }),
    prisma.aIInsight.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.activityLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.booking.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.dairyBatch.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.activityLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  const uptime = firstRecord
    ? Date.now() - firstRecord.createdAt.getTime()
    : 0;

  // Activity rate per hour (last 24h)
  const activityPerHour = last24hActivity / 24;

  // Module table — counts + last activity
  const modules: Array<{
    key: string;
    label_ar: string;
    label_en: string;
    icon: any;
    count: number;
    lastAt: Date | null;
    href: string;
    accent: string;
  }> = [
    { key: "companies",   label_ar: "الشركات",       label_en: "Companies",    icon: Building2,    count: counts.companies ?? 0,    lastAt: null,                           href: "/companies",    accent: "var(--heri-teal)" },
    { key: "users",       label_ar: "المستخدمون",    label_en: "Users",         icon: ShieldCheck,  count: counts.users ?? 0,        lastAt: null,                           href: "/users",        accent: "var(--heri-terracotta)" },
    { key: "hotels",      label_ar: "الفنادق",        label_en: "Hotels",        icon: Hotel,        count: counts.hotels ?? 0,       lastAt: null,                           href: "/hotels",       accent: "var(--heri-ochre)" },
    { key: "bookings",    label_ar: "الحجوزات",      label_en: "Bookings",      icon: Hotel,        count: counts.bookings ?? 0,     lastAt: lastBooking?.createdAt ?? null,  href: "/hotels",       accent: "var(--heri-ochre)" },
    { key: "dairy",       label_ar: "دفعات الألبان", label_en: "Dairy",         icon: Milk,         count: counts.dairy ?? 0,        lastAt: lastBatch?.createdAt ?? null,    href: "/dairy",        accent: "var(--heri-teal)" },
    { key: "farms",       label_ar: "المزارع",        label_en: "Farms",         icon: Sprout,       count: counts.farms ?? 0,        lastAt: null,                           href: "/farms",        accent: "var(--heri-teal)" },
    { key: "programs",    label_ar: "برامج Tank",    label_en: "Programs",      icon: GraduationCap,count: counts.programs ?? 0,     lastAt: null,                           href: "/education",    accent: "var(--heri-copper)" },
    { key: "forecasts",   label_ar: "تنبؤات AI",      label_en: "Forecasts",     icon: Brain,        count: counts.forecasts ?? 0,    lastAt: null,                           href: "/supply-chain", accent: "var(--heri-copper)" },
    { key: "insights",    label_ar: "إشارات AI",      label_en: "Insights",      icon: Sparkles,     count: counts.insights ?? 0,     lastAt: lastInsight?.createdAt ?? null,  href: "/insights",     accent: "var(--heri-ochre)" },
    { key: "transactions",label_ar: "المعاملات",     label_en: "Transactions",  icon: Wallet,       count: counts.transactions ?? 0, lastAt: null,                           href: "/finance",      accent: "var(--heri-teal)" },
    { key: "marketStocks",label_ar: "أسهم",           label_en: "Stocks",        icon: TrendingUp,   count: counts.marketStocks ?? 0, lastAt: null,                           href: "/markets",      accent: "var(--heri-teal)" },
    { key: "esg",         label_ar: "ESG",           label_en: "ESG",           icon: Leaf,         count: counts.esg ?? 0,          lastAt: null,                           href: "/sustainability",accent: "var(--heri-teal)" },
    { key: "projects",    label_ar: "مشاريع",         label_en: "Projects",      icon: FlaskConical, count: counts.projects ?? 0,     lastAt: null,                           href: "/projects",     accent: "var(--heri-copper)" },
    { key: "tasks",       label_ar: "مهام",           label_en: "Tasks",         icon: ListChecks,   count: counts.tasks ?? 0,        lastAt: null,                           href: "/tasks",        accent: "var(--heri-teal)" },
    { key: "achievements",label_ar: "إنجازات",       label_en: "Achievements",  icon: Trophy,       count: counts.achievements ?? 0, lastAt: null,                           href: "/achievements", accent: "var(--heri-ochre)" },
    { key: "alertRules",  label_ar: "قواعد تنبيه",   label_en: "Alert rules",   icon: Bell,         count: counts.alertRules ?? 0,   lastAt: null,                           href: "/alerts",       accent: "var(--heri-terracotta)" },
    { key: "threads",     label_ar: "محادثات",        label_en: "Threads",       icon: MessageSquare,count: counts.threads ?? 0,      lastAt: null,                           href: "/messages",     accent: "var(--heri-teal)" },
    { key: "messages",    label_ar: "رسائل",          label_en: "Messages",      icon: MessageSquare,count: counts.messages ?? 0,     lastAt: null,                           href: "/messages",     accent: "var(--heri-teal)" },
    { key: "pins",        label_ar: "مفضلة",          label_en: "Pins",          icon: Pin,          count: counts.pins ?? 0,         lastAt: null,                           href: "/pinned",       accent: "var(--heri-ochre)" },
    { key: "activityLog", label_ar: "سجل النشاط",    label_en: "Activity log",  icon: Activity,     count: counts.activityLog ?? 0,  lastAt: lastActivity?.createdAt ?? null, href: "/activity",     accent: "var(--heri-copper)" },
    { key: "crops",       label_ar: "محاصيل",         label_en: "Crops",         icon: Sprout,       count: counts.crops ?? 0,        lastAt: null,                           href: "/farms",        accent: "var(--heri-teal)" },
  ];

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "النظام والصحة" : "System & health"}
        title={ar ? "النبض الحيوي للنظام" : "System vitals"}
        subtitle={
          ar
            ? "مراقبة قاعدة البيانات، محرك الذكاء، نشاط النظام، وعدّ السجلات لكل وحدة."
            : "Database monitoring, AI engine status, system activity, and per-module record counts."
        }
      />

      <PageContainer>
        <HeritageSection
          eyebrow={ar ? "النبض الحيوي" : "System pulse"}
          title={ar ? "النظام يتنفس" : "The system is breathing"}
          aside={
            <HeritagePill tone={dbHealthy ? "success" : "critical"}>
              {dbHealthy
                ? (ar ? "كل الأنظمة صحية" : "All systems healthy")
                : (ar ? "خلل في النظام" : "System fault")}
            </HeritagePill>
          }
        >
          <p className="mt-1 max-w-xl text-[12.5px] font-semibold" style={{ color: "var(--heri-ink-2)" }}>
            {ar
              ? `${formatNumber(totalRecords)} سجل · ${formatNumber(activeAlertRules)} قاعدة تنبيه نشطة · ${formatNumber(last24hActivity)} حدث آخر 24س.`
              : `${formatNumber(totalRecords)} records · ${formatNumber(activeAlertRules)} active alerts · ${formatNumber(last24hActivity)} events in 24h.`}
          </p>
          <div className="mt-4 grid gap-2 heri-stagger sm:grid-cols-2 lg:grid-cols-4">
            <SysHeroStat
              label={ar ? "زمن الاستجابة" : "DB latency"}
              value={`${dbLatency}ms`}
              icon={Clock}
            />
            <SysHeroStat
              label={ar ? "وقت التشغيل" : "Uptime"}
              value={formatDuration(uptime, ar)}
              icon={Activity}
            />
            <SysHeroStat
              label={ar ? "إجمالي السجلات" : "Total records"}
              value={formatNumber(totalRecords)}
              icon={Database}
            />
            <SysHeroStat
              label={ar ? "نشاط/ساعة" : "Events/hour"}
              value={formatNumber(Math.round(activityPerHour))}
              icon={Zap}
            />
          </div>
        </HeritageSection>

        <section className="grid gap-3 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "حالة قاعدة البيانات" : "Database"}
            raw={dbHealthy ? 1 : 0}
            kind="number"
            hint={`SQLite · ${dbLatency}ms`}
            accent={dbHealthy ? "var(--heri-teal)" : "var(--heri-terracotta)"}
          />
          <HeriKpi
            label={ar ? "محرك الذكاء" : "AI engine"}
            raw={counts.insights ?? 0}
            kind="number"
            hint={
              lastInsight
                ? `${ar ? "آخر:" : "Last:"} ${formatRel(lastInsight.createdAt, ar)}`
                : ar ? "لم يُشغّل" : "never run"
            }
            accent="var(--heri-copper)"
          />
          <HeriKpi
            label={ar ? "محرك التنبيهات" : "Alert engine"}
            raw={activeAlertRules}
            kind="number"
            hint={ar ? "قواعد تراقب البيانات" : "rules watching data"}
            accent={activeAlertRules > 0 ? "var(--heri-ochre)" : undefined}
          />
          <HeriKpi
            label={ar ? "نشاط 24س" : "24h activity"}
            raw={last24hActivity}
            kind="number"
            hint={`${formatNumber(last24hInsights)} ${ar ? "إشارة" : "insights"}`}
          />
        </section>

        {/* Module table */}
        <HeritageSection
          eyebrow={ar ? "كل الجداول" : "All tables"}
          title={ar ? "إحصاءات السجلات لكل وحدة" : "Per-module record stats"}
        >
          <p className="mb-3 text-[12px] font-semibold" style={{ color: "var(--heri-ink-3)" }}>
            {ar
              ? `${formatNumber(modules.length)} جدول · ${formatNumber(totalRecords)} سجل إجمالي`
              : `${formatNumber(modules.length)} tables · ${formatNumber(totalRecords)} records total`}
          </p>
          <div className="grid gap-2 heri-stagger md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--heri-cream-2)]"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule)",
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center"
                    style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)", color: m.accent }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="line-clamp-1 text-[12px] font-bold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {ar ? m.label_ar : m.label_en}
                    </div>
                    {m.lastAt ? (
                      <div
                        className="line-clamp-1 text-[10px] font-semibold"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {ar ? "آخر:" : "Last:"} {formatRel(m.lastAt, ar)}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className="heri-number-mono shrink-0 px-2 py-0.5 text-[12px] tabular-nums"
                    style={{
                      color: m.count > 0 ? "var(--heri-ochre)" : "var(--heri-ink-3)",
                    }}
                  >
                    {formatNumber(m.count)}
                  </span>
                </Link>
              );
            })}
          </div>
        </HeritageSection>

        {/* Live signals */}
        <HeritageSection
          eyebrow={ar ? "الإشارات الحية" : "Live signals"}
          title={ar ? "ماذا يحدث الآن" : "What's happening now"}
        >
          <p className="mb-3 text-[12px] font-semibold" style={{ color: "var(--heri-ink-3)" }}>
            {ar
              ? "آخر نشاط لكل قناة في النظام."
              : "Latest activity across every channel."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <LiveRow label={ar ? "آخر إشارة AI" : "Last AI insight"} value={formatRel(lastInsight?.createdAt ?? null, ar)} icon={Sparkles} accent="var(--heri-ochre)" />
            <LiveRow label={ar ? "آخر سجل نشاط" : "Last activity log"} value={formatRel(lastActivity?.createdAt ?? null, ar)} icon={Activity} accent="var(--heri-copper)" />
            <LiveRow label={ar ? "آخر حجز" : "Last booking"} value={formatRel(lastBooking?.createdAt ?? null, ar)} icon={Hotel} accent="var(--heri-ochre)" />
            <LiveRow label={ar ? "آخر دفعة ألبان" : "Last dairy batch"} value={formatRel(lastBatch?.createdAt ?? null, ar)} icon={Milk} accent="var(--heri-teal)" />
            <LiveRow label={ar ? "إشارات مفتوحة" : "Open insights"} value={`${formatNumber(openInsights)} ${ar ? "تنتظر" : "pending"}`} icon={Brain} accent="var(--heri-copper)" />
            <LiveRow label={ar ? "رسائل آخر 24س" : "Messages 24h"} value={formatNumber(last24hMessages)} icon={MessageSquare} accent="var(--heri-teal)" />
          </div>
        </HeritageSection>

        <p
          className="text-center text-[10.5px]"
          style={{ color: "var(--heri-ink-3)" }}
        >
          {ar
            ? `H-Nerve ERP v1.5 · جاهز للقيادة · ${now.toISOString().slice(11, 19)} UTC`
            : `H-Nerve ERP v1.5 · Production-ready · ${now.toISOString().slice(11, 19)} UTC`}
        </p>
      </PageContainer>
    </>
  );
}

function SysHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="px-3 py-2"
      style={{
        background: "var(--heri-cream-2)",
        border: "1px solid var(--heri-rule-strong)",
        minWidth: 110,
      }}
    >
      <div
        className="flex items-center gap-1.5 heri-eyebrow"
        style={{ color: "var(--heri-ink-3)" }}
      >
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="heri-number-mono mt-0.5 text-base font-bold leading-none tracking-[-0.012em]"
        style={{ color: "var(--heri-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function LiveRow({
  label, value, icon: Icon, accent,
}: {
  label: string; value: string; icon: any; accent: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center"
        style={{ background: "var(--heri-cream-2)", border: "1px solid var(--heri-rule)", color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="heri-eyebrow line-clamp-1"
          style={{ color: "var(--heri-ink-3)" }}
        >
          {label}
        </div>
        <div
          className="heri-number-mono text-[13px] font-semibold"
          style={{ color: "var(--heri-ink)" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
