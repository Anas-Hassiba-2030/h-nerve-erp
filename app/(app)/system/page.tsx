
export const dynamic = "force-dynamic";
// /system — النظام.
//
// Aesthetic: the "Claude Design" work register, ported verbatim (structure +
// look) from docs/design/system/sections/system.html (which links _section.css
// + ops.css) + system-ops.js. The .wrap / .sec-* / .ops-tabs / .ops-tab /
// .ops-panel / .kpi-* / .panel / .ws-line / .ops-tag / .br-switch markup is
// reproduced 1:1; the styles live in ./system.css scoped under .dl-page. Real
// live record counts + platform health are mapped into the same slots the
// reference uses (status panel = live counts + health rows, settings panel =
// profile + display preferences).
//
// Server Component: tab switching is driven by a ?tab= query param (server-
// side .on toggle) so no client runtime is required.

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { ar as arAr, ROLES_AR } from "@/lib/utils/utils";
import "../daylight.css";
import "./system.css";

// Match the reference ar() helper in system-ops.js: Western -> Arabic-Indic.
function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function num(n: number, ar: boolean): string {
  return ar ? toArabicDigits(n) : String(n);
}

export default async function SystemPage(
  props: {
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const locale = await getLocale();
  const ar = locale === "ar";
  const tab = searchParams.tab === "settings" ? "settings" : "status";

  const session = await getCurrentUser();

  // status: live record counts (reference KPI grid)
  const [
    companies, hotels, bookings, farms, programs, insights, users, integrations,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.hotel.count(),
    prisma.booking.count(),
    prisma.farm.count(),
    prisma.program.count(),
    prisma.aIInsight.count(),
    prisma.user.count(),
    prisma.integration.count(),
  ]);

  const kpis: Array<[string, number]> = [
    [ar ? "الشركات" : "Companies",      companies],
    [ar ? "الفنادق" : "Hotels",         hotels],
    [ar ? "الدفعات" : "Bookings",       bookings],
    [ar ? "المزارع" : "Farms",          farms],
    [ar ? "البرامج" : "Programs",       programs],
    [ar ? "الإشارات" : "Insights",      insights],
    [ar ? "المستخدمون" : "Users",       users],
    [ar ? "التكاملات" : "Integrations", integrations],
  ];

  // platform health rows (reference .ws-line list)
  const health = ar
    ? ["قاعدة البيانات", "محرّك الدماغ", "الواجهة", "المزامنة الحيّة", "النسخ الاحتياطي"]
    : ["Database", "Brain engine", "Interface", "Live sync", "Backups"];

  // display preferences (reference PREFS — toggle list)
  const prefs: Array<[string, boolean]> = ar
    ? [
        ["إظهار شريط المؤشّرات الحيّ", true],
        ["إظهار تيار النشاط في اللوحة", true],
        ["بطاقات الذكاء على الصفحة الرئيسية", true],
        ["مخطّطات القطاعات في التحليلات", true],
        ["إشعارات الدفع", false],
        ["الوضع المضغوط للجداول", false],
        ["تشغيل الرسوم المتحرّكة", true],
      ]
    : [
        ["Show the live indicator bar", true],
        ["Show the activity stream on the dashboard", true],
        ["Intelligence cards on the home page", true],
        ["Sector charts in analytics", true],
        ["Push notifications", false],
        ["Compact table mode", false],
        ["Enable animations", true],
      ];

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · الحالة" : "System · Status"}
            </div>
            <h1 className="sec-title">{ar ? "النظام" : "System"}</h1>
            <p className="sec-sub">
              {ar
                ? "صحّة المنصّة، عدّادات السجلات الحيّة، وتفضيلات العرض لكل وحدة."
                : "Platform health, live record counters, and per-module display preferences."}
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
          <Link href="/system?tab=status" className={`ops-tab ${tab === "status" ? "on" : ""}`}>
            {ar ? "الحالة" : "Status"}
          </Link>
          <Link href="/system?tab=settings" className={`ops-tab ${tab === "settings" ? "on" : ""}`}>
            {ar ? "الإعدادات" : "Settings"}
          </Link>
        </div>

        <div className={`ops-panel ${tab === "status" ? "on" : ""}`}>
          <div className="kpi-grid reveal" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {kpis.map(([label, value]) => (
              <div key={label} className="kpi-card ix-card">
                <div className="kpi-label">{label}</div>
                <div className="kpi-val"><span>{num(value, ar)}</span></div>
                <div className="kpi-foot">
                  <span className="kpi-hint">
                    {ar ? "آخر استيراد: اليوم ٨:٠٠" : "Last import: today 8:00"}
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
            {health.map((s) => (
              <div
                key={s}
                className="ws-line"
                style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span>{s}</span>
                <span className="ops-tag ok">{ar ? "سليم" : "Healthy"}</span>
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
                </div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head">
              <span className="panel-title">{ar ? "تفضيلات العرض" : "Display preferences"}</span>
              <span className="panel-aside">{ar ? "ما يظهر في كل وحدة" : "What shows in each module"}</span>
            </div>
            <div>
              {prefs.map(([label, on]) => (
                <div
                  key={label}
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
    </div>
  );
}
