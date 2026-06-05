
export const dynamic = "force-dynamic";
// Activity Log — system-wide audit trail.
// Filters by entity, action, actor. Bilingual summaries with icons + relative time.
//
// Visuals are ported to the Claude Design reference
// (docs/design/system/sections/audit.html + audit-ops.js): the .dl-page
// daylight register, .sec-head header, .ops-tabs/.ops-panel tabs, and the
// .ops-table / .ops-tr / .ops-cell / .ops-tag operations table. Real data
// comes from the Prisma queries below; only the look is the design.

import Link from "next/link";
import {
  Activity, Plus, Pencil, Trash2, RotateCcw, LogIn, LogOut, Download,
  Brain, Sparkles, CheckCircle2, XCircle, UserPlus, FileDown,
} from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatDate, formatNumber } from "@/lib/utils/utils";
import "../daylight.css";
import "../audit.css";

const ACTION_META: Record<
  string,
  { icon: any; tone: string; tag: "ok" | "warn" | "crit" | "info"; ar: string; en: string }
> = {
  CREATE: { icon: Plus, tone: "emerald", tag: "ok", ar: "إنشاء", en: "Created" },
  UPDATE: { icon: Pencil, tone: "blue", tag: "info", ar: "تحديث", en: "Updated" },
  DELETE: { icon: Trash2, tone: "rose", tag: "crit", ar: "حذف", en: "Deleted" },
  RESTORE: { icon: RotateCcw, tone: "amber", tag: "warn", ar: "استعادة", en: "Restored" },
  LOGIN: { icon: LogIn, tone: "violet", tag: "info", ar: "دخول", en: "Login" },
  LOGOUT: { icon: LogOut, tone: "slate", tag: "info", ar: "خروج", en: "Logout" },
  EXPORT: { icon: Download, tone: "blue", tag: "ok", ar: "تصدير", en: "Export" },
  FORECAST: { icon: Brain, tone: "violet", tag: "info", ar: "تنبؤ", en: "Forecast" },
  INSIGHT: { icon: Sparkles, tone: "amber", tag: "warn", ar: "إشارة", en: "Insight" },
  APPROVE: { icon: CheckCircle2, tone: "emerald", tag: "ok", ar: "اعتماد", en: "Approved" },
  REJECT: { icon: XCircle, tone: "rose", tag: "crit", ar: "رفض", en: "Rejected" },
  ASSIGN: { icon: UserPlus, tone: "blue", tag: "info", ar: "إسناد", en: "Assigned" },
};

const ENTITY_AR: Record<string, string> = {
  BOOKING: "حجز", DAIRY: "ألبان", FARM: "مزرعة", CROP: "محصول",
  PROGRAM: "برنامج", FORECAST: "تنبؤ", INSIGHT: "إشارة", TASK: "مهمة",
  PROJECT: "مشروع", TRANSACTION: "معاملة", USER: "مستخدم", COMPANY: "شركة",
  HOTEL: "فندق", MARKET: "سوق", ESG: "ESG", AUTH: "نظام", REPORT: "تقرير",
};

function relativeTime(date: Date, ar: boolean): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return ar ? `منذ ${m} د` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return ar ? `منذ ${h} س` : `${h}h ago`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return ar ? `منذ ${d} ي` : `${d}d ago`;
  }
  return formatDate(date);
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: { entity?: string; action?: string; actor?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const where: any = {};
  if (searchParams.entity) where.entity = searchParams.entity;
  if (searchParams.action) where.action = searchParams.action;
  if (searchParams.actor) where.actorId = searchParams.actor;

  const [logs, total, actors, byAction, byEntity] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      where: { actorId: { not: null } },
      distinct: ["actorId"],
      select: { actorId: true, actorName: true },
      take: 50,
    }),
    prisma.activityLog.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ["entity"], _count: { _all: true } }),
  ]);

  // Group logs by date label
  const groups = new Map<string, typeof logs>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  for (const log of logs) {
    const d = new Date(log.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = ar ? "اليوم" : "Today";
    else if (d.getTime() === yesterday.getTime()) label = ar ? "أمس" : "Yesterday";
    else label = formatDate(log.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(log);
  }

  const hasFilter =
    searchParams.entity || searchParams.action || searchParams.actor;

  const todayCount = logs.filter((l) => {
    const d = new Date(l.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · التدقيق" : "System · Audit"}
            </div>
            <h1 className="sec-title">{ar ? "سجل النشاط" : "Activity log"}</h1>
            <p className="sec-sub">
              {ar
                ? `${formatNumber(total)} عملية مسجلة عبر النظام`
                : `${formatNumber(total)} actions recorded across the system`}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
            <div className="sec-actions">
              {hasFilter ? (
                <Link href="/activity" className="dl-btn dl-btn-secondary">
                  {ar ? "مسح الفلاتر" : "Clear filters"}
                </Link>
              ) : null}
              <a
                href={`/api/export/activity?locale=${ar ? "ar" : "en"}${
                  searchParams.entity ? `&entity=${searchParams.entity}` : ""
                }${searchParams.action ? `&action=${searchParams.action}` : ""}`}
                className="dl-btn dl-btn-secondary"
              >
                <FileDown className="h-4 w-4" />
                {ar ? "تصدير CSV" : "Export CSV"}
              </a>
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <section className="kpi-grid reveal">
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "اليوم" : "Today"}</div>
            <div className="kpi-val">{formatNumber(todayCount)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "إنشاء" : "Created"}</div>
            <div className="kpi-val">
              {formatNumber(byAction.find((b) => b.action === "CREATE")?._count._all ?? 0)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "حذف" : "Deleted"}</div>
            <div className="kpi-val">
              {formatNumber(byAction.find((b) => b.action === "DELETE")?._count._all ?? 0)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "إجمالي" : "Total"}</div>
            <div className="kpi-val">{formatNumber(total)}</div>
          </div>
        </section>

        {/* Tabs — reference audit.html: التدقيق ٣٦٠ / النشاط */}
        <div className="ops-tabs">
          <Link href="/audit-360" className="ops-tab">
            {ar ? "التدقيق ٣٦٠" : "Audit 360"}
          </Link>
          <span className="ops-tab on">{ar ? "النشاط" : "Activity"}</span>
        </div>

        {/* Filter rail */}
        <div className="panel reveal">
          <div className="panel-head">
            <div className="panel-title">{ar ? "تصفية" : "Filters"}</div>
          </div>
          <div className="kpi-label" style={{ marginBottom: 8 }}>
            {ar ? "حسب نوع الكيان" : "By entity"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {byEntity
              .sort((a, b) => b._count._all - a._count._all)
              .map((b) => {
                const active = searchParams.entity === b.entity;
                return (
                  <Link
                    key={b.entity}
                    href={
                      active
                        ? `/activity${searchParams.action ? `?action=${searchParams.action}` : ""}`
                        : `/activity?entity=${b.entity}${searchParams.action ? `&action=${searchParams.action}` : ""}`
                    }
                    className={`ops-tag ${active ? "ok" : "info"}`}
                    style={{ cursor: "pointer" }}
                  >
                    {ar ? ENTITY_AR[b.entity] ?? b.entity : b.entity}{" "}
                    {formatNumber(b._count._all)}
                  </Link>
                );
              })}
          </div>
          <div className="kpi-label" style={{ marginBottom: 8 }}>
            {ar ? "حسب الإجراء" : "By action"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {byAction
              .sort((a, b) => b._count._all - a._count._all)
              .map((b) => {
                const active = searchParams.action === b.action;
                const meta = ACTION_META[b.action];
                return (
                  <Link
                    key={b.action}
                    href={
                      active
                        ? `/activity${searchParams.entity ? `?entity=${searchParams.entity}` : ""}`
                        : `/activity?action=${b.action}${searchParams.entity ? `&entity=${searchParams.entity}` : ""}`
                    }
                    className={`ops-tag ${active ? "ok" : meta?.tag ?? "info"}`}
                    style={{ cursor: "pointer" }}
                  >
                    {ar ? meta?.ar ?? b.action : meta?.en ?? b.action}{" "}
                    {formatNumber(b._count._all)}
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Timeline as grouped ops-tables */}
        <div className="ops-panel on">
          {logs.length === 0 ? (
            <div className="ops-table">
              <div className="ops-empty">
                <div className="oe-ic">◇</div>
                <div className="oe-t">{ar ? "لا توجد إجراءات مسجلة" : "No activity yet"}</div>
                <div className="oe-s">
                  {ar
                    ? "ستظهر هنا كل عمليات الإنشاء والتعديل والحذف فور حدوثها."
                    : "Create, update and delete actions will show here as they happen."}
                </div>
              </div>
            </div>
          ) : (
            Array.from(groups.entries()).map(([label, items]) => (
              <section key={label} style={{ marginBottom: 22 }}>
                <div className="ops-toolbar">
                  <h2>{label}</h2>
                  <div className="ops-actions">
                    <span className="panel-aside">{formatNumber(items.length)}</span>
                  </div>
                </div>
                <div className="ops-table">
                  <div
                    className="ops-tr head"
                    style={{ gridTemplateColumns: "1fr 1fr 2fr 1.2fr .9fr" }}
                  >
                    <span className="ops-cell">{ar ? "الإجراء" : "Action"}</span>
                    <span className="ops-cell">{ar ? "الكيان" : "Entity"}</span>
                    <span className="ops-cell name">{ar ? "الملخص" : "Summary"}</span>
                    <span className="ops-cell">{ar ? "المستخدم" : "User"}</span>
                    <span className="ops-cell num">{ar ? "الوقت" : "Time"}</span>
                  </div>
                  {items.map((log) => {
                    const meta = ACTION_META[log.action];
                    return (
                      <div
                        key={log.id}
                        className="ops-tr row"
                        style={{ gridTemplateColumns: "1fr 1fr 2fr 1.2fr .9fr" }}
                      >
                        <span className="ops-cell">
                          <span className={`ops-tag ${meta?.tag ?? "info"}`}>
                            {ar ? meta?.ar ?? log.action : meta?.en ?? log.action}
                          </span>
                        </span>
                        <span className="ops-cell">
                          {ar ? ENTITY_AR[log.entity] ?? log.entity : log.entity}
                        </span>
                        <span className="ops-cell name">
                          {ar ? log.summary : log.summaryEn ?? log.summary}
                        </span>
                        <span className="ops-cell">{log.actorName ?? "—"}</span>
                        <span className="ops-cell num">{relativeTime(log.createdAt, ar)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          {logs.length >= 200 ? (
            <p className="panel-aside" style={{ textAlign: "center" }}>
              {ar
                ? "عرض آخر 200 إجراء — يتم تنظيف السجل تلقائياً للحفاظ على آخر 5000."
                : "Showing latest 200 entries — log auto-prunes to last 5,000."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
