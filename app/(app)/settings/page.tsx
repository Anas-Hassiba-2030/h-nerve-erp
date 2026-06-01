
export const dynamic = "force-dynamic";
// Settings page — theme preview cards, rank progression, language toggle,
// exports menu, and a system status grid.

import {
  Activity, Brain, Network, ShieldCheck, Palette, Globe, Download, Zap,
  Sparkles, Languages, FileText, Cpu, Database, Clock,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { ProfileHero } from "@/components/settings/ProfileHero";
import { getCurrentUser } from "@/lib/session";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { getTheme } from "@/lib/theme.server";
import { THEME_LIST } from "@/lib/theme";
import { setTheme, setLocale } from "@/app/actions/preferences";
import { ar as arAr, ROLES_AR, formatNumber } from "@/lib/utils";
import { rankById } from "@/lib/gamification";
import { prisma } from "@/lib/db";
import { getCompanyBrand } from "@/lib/companyBrand";
import "../daylight.css";

const EXPORT_TYPES = [
  { type: "all",          labelAr: "نبض المجموعة الشامل", labelEn: "Group Pulse Combined", icon: "🌐", featured: true },
  { type: "finance",      labelAr: "المركز المالي",       labelEn: "Finance",              icon: "💰" },
  { type: "hotels",       labelAr: "الفنادق والحجوزات",   labelEn: "Hotels & Bookings",    icon: "🏨" },
  { type: "dairy",        labelAr: "إنتاج المها",         labelEn: "Dairy production",     icon: "🥛" },
  { type: "farms",        labelAr: "المزارع والمحاصيل",   labelEn: "Farms & crops",        icon: "🌾" },
  { type: "supply-chain", labelAr: "سلسلة التوريد",       labelEn: "Supply chain",         icon: "🧠" },
  { type: "sustainability", labelAr: "الاستدامة و ESG",   labelEn: "Sustainability ESG",   icon: "🌱" },
  { type: "projects",     labelAr: "المشاريع المستقبلية", labelEn: "Future projects",      icon: "🚀" },
  { type: "markets",      labelAr: "الأسواق العالمية",    labelEn: "Global markets",       icon: "📈" },
];

export default async function SettingsPage() {
  const session = await getCurrentUser();
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);
  const currentTheme = getTheme();
  const me = session
    ? await prisma.user.findUnique({ where: { id: session.id } })
    : null;
  const rank = rankById(me?.rank ?? "PAWN");
  const brand = getCompanyBrand("HH");

  const [pinCount, activityCount, taskOpenCount, achievementsCount] = await Promise.all([
    session ? prisma.pin.count({ where: { userId: session.id } }) : Promise.resolve(0),
    prisma.activityLog.count(),
    session
      ? prisma.task.count({
          where: { assigneeId: session.id, status: { not: "DONE" }, deletedAt: null },
        })
      : Promise.resolve(0),
    session
      ? prisma.userAchievement.count({ where: { userId: session.id } })
      : Promise.resolve(0),
  ]);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "النظام" : "System"}
        title={ar ? "الإعدادات والملف الشخصي" : "Settings & profile"}
        subtitle={
          ar
            ? "السمة، اللغة، التصدير، حالة النظام، والإحصائيات الشخصية."
            : "Theme, language, exports, system status, and personal stats."
        }
      />
      <DaylightKpiGrid>
        <DaylightKpi label="XP" value={formatNumber(me?.xp ?? 0)} />
        <DaylightKpi label={ar ? "بونص" : "Bonus"} value={`+${(me?.bonusPercent ?? 0).toFixed(1)}%`} />
        <DaylightKpi label={ar ? "إنجازات" : "Awards"} value={formatNumber(achievementsCount)} />
        <DaylightKpi label={ar ? "مفضلة" : "Pins"} value={formatNumber(pinCount)} />
      </DaylightKpiGrid>
        {/* ── Profile Hero ─────────────────────────────────────── */}
        {session ? (
          <ProfileHero
            name={session.name}
            email={session.email}
            title={session.title ?? null}
            role={arAr(ROLES_AR, session.role)}
            rank={me?.rank ?? "PAWN"}
            xp={me?.xp ?? 0}
            bonusPercent={me?.bonusPercent ?? 0}
            loginCount={me?.loginCount ?? 0}
            locale={ar ? "ar" : "en"}
            brandGradient={brand.gradient}
            brandAccent={brand.accent}
          />
        ) : null}

        {/* ── Personal stats strip ─────────────────────────────── */}
        <section className="grid gap-3 md:grid-cols-4">
          <StatTile
            icon={Activity}
            label={ar ? "نشاطي" : "My activity"}
            value={formatNumber(activityCount)}
            sub={ar ? "إجراء مسجّل" : "actions logged"}
            tone="emerald"
          />
          <StatTile
            icon={Sparkles}
            label={ar ? "مهام مفتوحة" : "Open tasks"}
            value={formatNumber(taskOpenCount)}
            sub={ar ? "في الانتظار" : "pending"}
            tone="amber"
          />
          <StatTile
            icon={ShieldCheck}
            label={ar ? "الرتبة الحالية" : "Current rank"}
            value={`${rank.symbol} ${ar ? rank.ar : rank.en}`}
            sub={ar ? `+${rank.bonusPercent}% بونص` : `+${rank.bonusPercent}% bonus`}
            tone="violet"
          />
          <StatTile
            icon={Globe}
            label={ar ? "اللغة الحالية" : "Active locale"}
            value={ar ? "العربية" : "English"}
            sub={ar ? "RTL · en-US digits" : "LTR · en-US digits"}
            tone="blue"
          />
        </section>

        {/* ── Theme picker ─────────────────────────────────────── */}
        <DaylightPanel
          title={ar ? "السمة البصرية" : "Visual theme"}
          aside={ar ? "المظهر" : "Appearance"}
        >
          <p
            className="mb-4 text-[11px] font-semibold leading-snug"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar
              ? "7 سمات مُعدّة بعناية. اختر ما يناسب عينيك — يطبق فوراً عبر كل الواجهة."
              : "7 hand-tuned themes. Pick what suits your eyes — applies instantly site-wide."}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {THEME_LIST.map((t) => {
              const active = currentTheme.id === t.id;
              return (
                <form key={t.id} action={setTheme}>
                  <input type="hidden" name="theme" value={t.id} />
                  <button
                    type="submit"
                    className={`group relative w-full overflow-hidden text-start transition-all ${active ? "ring-2 ring-offset-1" : ""}`}
                    style={{
                      background: t.surfaceElevated,
                      border: `1px solid ${t.border}`,
                      color: t.text,
                      boxShadow: active
                        ? `0 8px 24px -8px ${t.brand}, 0 0 0 3px ${t.brandSoft}`
                        : undefined,
                      ["--tw-ring-color" as any]: t.brand,
                    }}
                    aria-label={ar ? t.name : t.nameEn}
                  >
                    {/* Live preview canvas — replicates a tiny mock dashboard */}
                    <div
                      className="relative h-24 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${t.brandDeep} 0%, ${t.brand} 60%, ${t.accent} 110%)`,
                      }}
                    >
                      {/* aurora orbs */}
                      <span
                        className="absolute"
                        style={{
                          top: "-30%",
                          left: "-10%",
                          width: 100,
                          height: 100,
                          borderRadius: "50%",
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)",
                        }}
                        aria-hidden
                      />
                      {/* fake KPI dots */}
                      <div
                        className="absolute bottom-2 start-2 flex gap-1"
                        aria-hidden
                      >
                        {[t.brand, t.accent, t.brandSoft].map((c, i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: c,
                              boxShadow: "0 0 0 1px rgba(255,255,255,0.45)",
                            }}
                          />
                        ))}
                      </div>
                      {/* fake mini bar chart */}
                      <div
                        className="absolute bottom-2 end-2 flex items-end gap-0.5"
                        aria-hidden
                      >
                        {[40, 60, 30, 80, 55].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-sm"
                            style={{
                              height: `${h * 0.18}rem`,
                              background: "rgba(255,255,255,0.85)",
                            }}
                          />
                        ))}
                      </div>
                      {/* mode pill */}
                      <span
                        className="absolute top-2 start-2 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider"
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          color: "white",
                        }}
                      >
                        {t.isDark ? (ar ? "داكن" : "Dark") : ar ? "فاتح" : "Light"}
                      </span>
                      {active ? (
                        <span
                          className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                          style={{
                            background: "white",
                            color: t.brandDeep,
                          }}
                        >
                          ✓ {ar ? "نشط" : "Active"}
                        </span>
                      ) : null}
                    </div>

                    {/* Body */}
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {ar ? t.name : t.nameEn}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[t.brand, t.accent].map((c, i) => (
                            <span
                              key={i}
                              className="h-3 w-3 rounded-full ring-1"
                              style={{
                                background: c,
                                borderColor: t.border,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p
                        className="mt-1 line-clamp-2 text-[10.5px] font-semibold leading-tight"
                        style={{ color: t.textMuted }}
                      >
                        {ar ? t.description : t.descriptionEn}
                      </p>
                    </div>
                  </button>
                </form>
              );
            })}
          </div>
        </DaylightPanel>

        {/* ── Language ─────────────────────────────────────────── */}
        <DaylightPanel
          title={ar ? "اللغة والاتجاه" : "Language & direction"}
          aside={ar ? "الواجهة" : "Interface"}
        >
          <p
            className="mb-4 text-[11px] font-semibold leading-snug"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar
              ? "تنطبق على الواجهة كاملة. الأرقام دائماً en-US بصرف النظر عن اللغة."
              : "Applies site-wide. Numbers always render en-US digits regardless of locale."}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <LocaleCard
              localeId="ar"
              flag="🇯🇴"
              titleAr="العربية"
              titleEn="Arabic"
              dirLabelAr="من اليمين لليسار"
              dirLabelEn="Right-to-left"
              ar={ar}
              active={locale === "ar"}
            />
            <LocaleCard
              localeId="en"
              flag="🇺🇸"
              titleAr="الإنجليزية"
              titleEn="English"
              dirLabelAr="من اليسار لليمين"
              dirLabelEn="Left-to-right"
              ar={ar}
              active={locale === "en"}
            />
          </div>
        </DaylightPanel>

        {/* ── Exports ──────────────────────────────────────────── */}
        <DaylightPanel
          title={ar ? "التصدير الاحترافي" : "Professional exports"}
          aside={ar ? "التقارير" : "Reports"}
        >
          <p
            className="mb-4 text-[11px] font-semibold leading-snug"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar
              ? "كل تقرير يحتوي على KPIs + رسوم اتجاه + تعليق محلل + جدول كامل، مزيّن بشعار الحوراني."
              : "Every export ships with KPIs + trend chart + analyst note + full table, branded with Hourani."}
          </p>
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {EXPORT_TYPES.map((e) => (
              <div
                key={e.type}
                className="relative flex items-center justify-between gap-2 px-3 py-3 transition"
                style={{
                  border: "1px solid var(--line)",
                  background: e.featured ? "var(--cream)" : "var(--cream)",
                  outline: e.featured ? "2px solid var(--gold)" : undefined,
                  outlineOffset: e.featured ? "-2px" : undefined,
                }}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-base"
                    style={{
                      background: "var(--cream)",
                      color: "var(--gold)",
                    }}
                  >
                    {e.icon}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="line-clamp-1 text-[12.5px] font-semibold"
                      style={{ color: "var(--ink)" }}
                    >
                      {ar ? e.labelAr : e.labelEn}
                    </div>
                    {e.featured ? (
                      <div
                        className="text-[9.5px] font-semibold"
                        style={{ color: "var(--gold)" }}
                      >
                        {ar ? "✨ تقرير شامل" : "✨ Combined"}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/api/export/${e.type}?locale=${locale}`}
                    className="dl-btn dl-btn-secondary rounded-md px-2 py-1 text-[10px]"
                    title="CSV"
                  >
                    CSV
                  </a>
                  <a
                    href={`/api/export/html/${e.type}?locale=${locale}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dl-btn dl-btn-primary rounded-md px-2 py-1 text-[10px]"
                    title="Branded HTML / PDF"
                  >
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </DaylightPanel>

        {/* ── System status ────────────────────────────────────── */}
        <DaylightPanel
          title={ar ? "حالة النظام" : "System status"}
          aside={ar ? "البنية التحتية" : "Infrastructure"}
        >
          <p
            className="mb-4 text-[11px] font-semibold leading-snug"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar
              ? "كل الأنظمة تعمل بكامل طاقتها."
              : "All systems operating at full capacity."}
          </p>
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <SystemRow
              icon={Activity}
              label={ar ? "العقل العصبي" : "Nerve core"}
              value={ar ? "نشط" : "Active"}
              tone="emerald"
            />
            <SystemRow
              icon={Network}
              label={ar ? "جسر الشركات" : "Company bridge"}
              value="6 units"
              tone="emerald"
            />
            <SystemRow
              icon={Brain}
              label={ar ? "المحرك التنبؤي" : "Forecast engine"}
              value={ar ? "جاهز" : "Ready"}
              tone="violet"
            />
            <SystemRow
              icon={ShieldCheck}
              label={ar ? "الجلسات" : "Iron-Session"}
              value={ar ? "مشفّرة" : "Encrypted"}
              tone="emerald"
            />
            <SystemRow
              icon={Database}
              label={ar ? "قاعدة البيانات" : "Database"}
              value="SQLite + Prisma 5"
              tone="blue"
            />
            <SystemRow
              icon={Zap}
              label={ar ? "الواجهة" : "UI Layer"}
              value={ar ? "Heritage Modern" : "Heritage Modern"}
              tone="amber"
            />
            <SystemRow
              icon={FileText}
              label={ar ? "السجل" : "Activity log"}
              value={`${formatNumber(activityCount)} ${ar ? "سجل" : "entries"}`}
              tone="blue"
            />
            <SystemRow
              icon={Clock}
              label={ar ? "النسخة" : "Version"}
              value="v1.4-premium"
              tone="violet"
            />
            <SystemRow
              icon={Globe}
              label={ar ? "اللغات" : "Languages"}
              value="AR · EN"
              tone="blue"
            />
          </ul>
        </DaylightPanel>

        {/* ── Footer signature ─────────────────────────────────── */}
        <p
          className="text-center text-[10.5px]"
          style={{ color: "var(--ink-muted)" }}
        >
          H-Nerve ERP · {ar ? "نظام مجموعة الحوراني العصبي المركزي" : "Hourani Group's Central Nervous System"} ·{" "}
          {ar ? "بدعم من إتش-نيرف · مجموعة الحوراني" : "Powered by H-Nerve · Hourani Group"}
        </p>
    </DaylightShell>
  );
}

/* ---------- Sub-components ---------- */

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "amber" | "blue" | "violet";
}) {
  const TONE_BG: Record<string, string> = {
    emerald: "bg-emerald-50 ring-emerald-200",
    amber: "bg-amber-50 ring-amber-200",
    blue: "bg-blue-50 ring-blue-200",
    violet: "bg-violet-50 ring-violet-200",
  };
  const TONE_FG: Record<string, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    violet: "text-violet-700",
  };
  return (
    <div
      className="card p-4"
      style={{
        background: "var(--cream)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--ink-muted)" }}
        >
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${TONE_BG[tone]} ${TONE_FG[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div
        className="font-mono mt-1.5 text-xl font-bold leading-tight tabular-nums"
        style={{ color: "var(--ink)" }}
      >
        {value}
      </div>
      <div
        className="text-[10px] font-semibold"
        style={{ color: "var(--ink-muted)" }}
      >
        {sub}
      </div>
    </div>
  );
}

function LocaleCard({
  localeId,
  flag,
  titleAr,
  titleEn,
  dirLabelAr,
  dirLabelEn,
  ar,
  active,
}: {
  localeId: "ar" | "en";
  flag: string;
  titleAr: string;
  titleEn: string;
  dirLabelAr: string;
  dirLabelEn: string;
  ar: boolean;
  active: boolean;
}) {
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={localeId} />
      <button
        type="submit"
        className={`group relative flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-all ${active ? "ring-2 ring-offset-1" : ""}`}
        style={{
          border: "1px solid var(--line)",
          background: active ? "var(--cream)" : "var(--cream)",
          color: "var(--ink)",
          ["--tw-ring-color" as any]: "var(--gold)",
          boxShadow: active
            ? "0 8px 24px -10px var(--gold)"
            : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flag}</span>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: active ? "var(--gold)" : "var(--ink)" }}
            >
              {ar ? titleAr : titleEn}
            </div>
            <div
              className="text-[10.5px] font-semibold"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar ? dirLabelAr : dirLabelEn}
            </div>
          </div>
        </div>
        {active ? (
          <span className="tag gold">✓ {ar ? "نشط" : "Active"}</span>
        ) : (
          <span className="tag" style={{ background: "var(--cream)", color: "var(--ink-muted)", border: "1px solid var(--line)" }}>{ar ? "اختيار" : "Pick"}</span>
        )}
      </button>
    </form>
  );
}

function SystemRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "blue" | "violet";
}) {
  const TONE_DOT: Record<string, string> = {
    emerald: "#10b981",
    amber: "#f59e0b",
    blue: "#3b82f6",
    violet: "#8b5cf6",
  };
  return (
    <li
      className="flex items-center gap-2.5 px-3 py-2.5 transition"
      style={{
        background: "var(--cream)",
        border: "1px solid var(--line)",
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gold)" }} />
      <span
        className="text-[11px] font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {label}
      </span>
      <span className="ms-auto flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: TONE_DOT[tone] }}
        />
        <span
          className="font-mono text-[11px] font-semibold tabular-nums"
          style={{ color: "var(--gold)" }}
        >
          {value}
        </span>
      </span>
    </li>
  );
}
