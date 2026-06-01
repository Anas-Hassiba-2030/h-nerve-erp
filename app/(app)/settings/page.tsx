
export const dynamic = "force-dynamic";
// /settings — الإعدادات.
//
// Aesthetic: the "Claude Design" work register, ported verbatim (structure +
// look) from docs/design/system/sections/system.html (which links _section.css
// + ops.css) + system-ops.js. The .wrap / .sec-* / .ops-tabs / .ops-tab /
// .ops-panel / .kpi-* / .panel / .ws-line / .ops-tag / .br-switch markup is
// reproduced 1:1; the styles live in ./system.css scoped under .dl-page. Real
// profile, theme, and locale data is mapped into the same slots the reference
// uses (status panel = live personal counters + system health, settings panel =
// profile + theme picker + language + display preferences).
//
// Server Component: theme + locale controls map to existing server actions via
// plain <form action={...}>. Tab switching is driven by a ?tab= query param
// (server-side .on toggle) so no client runtime is required.

import Link from "next/link";
import { DaylightShell } from "@/components/orrery/daylight";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { getTheme } from "@/lib/theme.server";
import { THEME_LIST } from "@/lib/theme";
import { setTheme, setLocale } from "@/app/actions/preferences";
import { ar as arAr, ROLES_AR, formatNumber } from "@/lib/utils";
import { rankById } from "@/lib/gamification";
import { prisma } from "@/lib/db";
import "../daylight.css";
import "./system.css";

function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getCurrentUser();
  const locale = getLocale();
  const ar = locale === "ar";
  const tab = searchParams.tab === "settings" ? "settings" : "status";
  const currentTheme = getTheme();

  const me = session
    ? await prisma.user.findUnique({ where: { id: session.id } })
    : null;
  const rank = rankById(me?.rank ?? "PAWN");

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

  // status: live personal counters (reference KPI grid)
  const kpis: Array<[string, string]> = [
    ["XP", formatNumber(me?.xp ?? 0)],
    [ar ? "بونص" : "Bonus", `+${(me?.bonusPercent ?? 0).toFixed(1)}%`],
    [ar ? "إنجازات" : "Awards", formatNumber(achievementsCount)],
    [ar ? "مفضلة" : "Pins", formatNumber(pinCount)],
  ];

  // platform health rows (reference .ws-line list)
  const health: Array<[string, string]> = ar
    ? [
        ["قاعدة البيانات", "SQLite + Prisma 5"],
        ["الجلسات", "مشفّرة"],
        ["الواجهة", "Heritage Modern"],
        ["السجل", `${formatNumber(activityCount)} سجل`],
        ["المهام المفتوحة", `${formatNumber(taskOpenCount)}`],
      ]
    : [
        ["Database", "SQLite + Prisma 5"],
        ["Sessions", "Encrypted"],
        ["Interface", "Heritage Modern"],
        ["Activity log", `${formatNumber(activityCount)} entries`],
        ["Open tasks", `${formatNumber(taskOpenCount)}`],
      ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · الإعدادات" : "System · Settings"}
            </div>
            <h1 className="sec-title">{ar ? "الإعدادات" : "Settings"}</h1>
            <p className="sec-sub">
              {ar
                ? "الملف الشخصي، السمة، اللغة، وتفضيلات العرض لكل وحدة."
                : "Profile, theme, language, and per-module display preferences."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "سليم" : "Healthy"}
            </span>
          </div>
        </div>

        <div className="ops-tabs">
          <Link href="/settings?tab=status" className={`ops-tab ${tab === "status" ? "on" : ""}`}>
            {ar ? "الحالة" : "Status"}
          </Link>
          <Link href="/settings?tab=settings" className={`ops-tab ${tab === "settings" ? "on" : ""}`}>
            {ar ? "الإعدادات" : "Settings"}
          </Link>
        </div>

        <div className={`ops-panel ${tab === "status" ? "on" : ""}`}>
          <div className="kpi-grid reveal" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {kpis.map(([label, value]) => (
              <div key={label} className="kpi-card ix-card">
                <div className="kpi-label">{label}</div>
                <div className="kpi-val"><span>{value}</span></div>
                <div className="kpi-foot">
                  <span className="kpi-hint">
                    {ar
                      ? `${rank.symbol} ${rank.ar}`
                      : `${rank.symbol} ${rank.en}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <span className="panel-title">{ar ? "صحّة المنصّة" : "Platform health"}</span>
              <span className="panel-aside">{ar ? "زمن التشغيل ٩٩.٩٨٪" : "Uptime 99.98%"}</span>
            </div>
            {health.map(([label, value]) => (
              <div
                key={label}
                className="ws-line"
                style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span>{label}</span>
                <span className="ops-tag ok">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`ops-panel ${tab === "settings" ? "on" : ""}`}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">{ar ? "الملف الشخصي" : "Profile"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--dl-display)",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#fff",
                  background: "linear-gradient(140deg,var(--emerald-soft),var(--emerald))",
                }}
              >
                {(session?.name ?? "أ").trim().charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  {session?.name ?? (ar ? "أنس الحوراني" : "Anas Hourani")}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  {session ? arAr(ROLES_AR, session.role) : ar ? "رئيس مجلس الإدارة · المجموعة" : "Chairman · Group"}
                  {session?.email ? ` · ${session.email}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <span className="panel-title">{ar ? "السمة البصرية" : "Visual theme"}</span>
              <span className="panel-aside">{ar ? "يطبق فوراً عبر كل الواجهة" : "Applies instantly site-wide"}</span>
            </div>
            <div>
              {THEME_LIST.map((t) => {
                const active = currentTheme.id === t.id;
                return (
                  <form key={t.id} action={setTheme}>
                    <input type="hidden" name="theme" value={t.id} />
                    <button
                      type="submit"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "12px 0",
                        borderBottom: "1px solid var(--line)",
                        textAlign: "start",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${t.brand}, ${t.accent})`,
                          }}
                        />
                        <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{ar ? t.name : t.nameEn}</span>
                      </span>
                      <span className={`ops-tag ${active ? "ok" : "info"}`}>
                        {active ? (ar ? "نشط" : "Active") : ar ? "اختيار" : "Pick"}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <span className="panel-title">{ar ? "اللغة والاتجاه" : "Language & direction"}</span>
              <span className="panel-aside">{ar ? "تنطبق على الواجهة كاملة" : "Applies site-wide"}</span>
            </div>
            <div>
              {([
                ["ar", ar ? "العربية" : "Arabic", ar ? "من اليمين لليسار" : "Right-to-left"],
                ["en", ar ? "الإنجليزية" : "English", ar ? "من اليسار لليمين" : "Left-to-right"],
              ] as Array<[string, string, string]>).map(([id, title, dir]) => {
                const active = locale === id;
                return (
                  <form key={id} action={setLocale}>
                    <input type="hidden" name="locale" value={id} />
                    <button
                      type="submit"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "12px 0",
                        borderBottom: "1px solid var(--line)",
                        textAlign: "start",
                      }}
                    >
                      <span>
                        <span style={{ fontSize: 13.5, color: "var(--ink)", display: "block" }}>{title}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{dir}</span>
                      </span>
                      <span className={`ops-tag ${active ? "ok" : "info"}`}>
                        {active ? (ar ? "نشط" : "Active") : ar ? "اختيار" : "Pick"}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <span className="panel-title">{ar ? "تفضيلات العرض" : "Display preferences"}</span>
              <span className="panel-aside">{ar ? "ما يظهر في كل وحدة" : "What shows in each module"}</span>
            </div>
            <div>
              {(ar
                ? [
                    ["إظهار شريط المؤشّرات الحيّ", true],
                    ["إظهار تيار النشاط في اللوحة", true],
                    ["بطاقات الذكاء على الصفحة الرئيسية", true],
                    ["إشعارات الدفع", false],
                    ["الوضع المضغوط للجداول", false],
                  ]
                : [
                    ["Show the live indicator bar", true],
                    ["Show the activity stream on the dashboard", true],
                    ["Intelligence cards on the home page", true],
                    ["Push notifications", false],
                    ["Compact table mode", false],
                  ]
              ).map(([label, on]) => (
                <div
                  key={String(label)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{label}</span>
                  <span className={`br-switch ${on ? "on" : ""}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DaylightShell>
  );
}
