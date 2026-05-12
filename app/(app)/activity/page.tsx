// Activity Log — system-wide audit trail.
// Filters by entity, action, actor. Bilingual summaries with icons + relative time.

import Link from "next/link";
import {
  Activity, Plus, Pencil, Trash2, RotateCcw, LogIn, LogOut, Download,
  Brain, Sparkles, CheckCircle2, XCircle, UserPlus, FileDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatDate, formatNumber } from "@/lib/utils";

const ACTION_META: Record<
  string,
  { icon: any; tone: string; ar: string; en: string }
> = {
  CREATE: { icon: Plus, tone: "emerald", ar: "إنشاء", en: "Created" },
  UPDATE: { icon: Pencil, tone: "blue", ar: "تحديث", en: "Updated" },
  DELETE: { icon: Trash2, tone: "rose", ar: "حذف", en: "Deleted" },
  RESTORE: { icon: RotateCcw, tone: "amber", ar: "استعادة", en: "Restored" },
  LOGIN: { icon: LogIn, tone: "violet", ar: "دخول", en: "Login" },
  LOGOUT: { icon: LogOut, tone: "slate", ar: "خروج", en: "Logout" },
  EXPORT: { icon: Download, tone: "blue", ar: "تصدير", en: "Export" },
  FORECAST: { icon: Brain, tone: "violet", ar: "تنبؤ", en: "Forecast" },
  INSIGHT: { icon: Sparkles, tone: "amber", ar: "إشارة", en: "Insight" },
  APPROVE: { icon: CheckCircle2, tone: "emerald", ar: "اعتماد", en: "Approved" },
  REJECT: { icon: XCircle, tone: "rose", ar: "رفض", en: "Rejected" },
  ASSIGN: { icon: UserPlus, tone: "blue", ar: "إسناد", en: "Assigned" },
};

const ENTITY_AR: Record<string, string> = {
  BOOKING: "حجز", DAIRY: "ألبان", FARM: "مزرعة", CROP: "محصول",
  PROGRAM: "برنامج", FORECAST: "تنبؤ", INSIGHT: "إشارة", TASK: "مهمة",
  PROJECT: "مشروع", TRANSACTION: "معاملة", USER: "مستخدم", COMPANY: "شركة",
  HOTEL: "فندق", MARKET: "سوق", ESG: "ESG", AUTH: "نظام", REPORT: "تقرير",
};

const TONE_CLASS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
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

  const filterChips = [
    { key: "entity", values: byEntity.map((b) => b.entity) },
    { key: "action", values: byAction.map((b) => b.action) },
  ];

  const hasFilter =
    searchParams.entity || searchParams.action || searchParams.actor;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "السجل" : "Audit"}
        title={ar ? "سجل النشاط" : "Activity log"}
        subtitle={
          ar
            ? `${formatNumber(total)} عملية مسجلة عبر النظام`
            : `${formatNumber(total)} actions recorded across the system`
        }
        metrics={[
          {
            label: ar ? "اليوم" : "Today",
            value: formatNumber(
              logs.filter((l) => {
                const d = new Date(l.createdAt);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
              }).length
            ),
            tone: "emerald",
          },
          {
            label: ar ? "إنشاء" : "Created",
            value: formatNumber(
              byAction.find((b) => b.action === "CREATE")?._count._all ?? 0
            ),
            tone: "blue",
          },
          {
            label: ar ? "حذف" : "Deleted",
            value: formatNumber(
              byAction.find((b) => b.action === "DELETE")?._count._all ?? 0
            ),
            tone: "amber",
          },
        ]}
        actions={
          <>
            {hasFilter ? (
              <Link href="/activity" className="btn-secondary">
                {ar ? "مسح الفلاتر" : "Clear filters"}
              </Link>
            ) : null}
            <a
              href={`/api/export/activity?locale=${ar ? "ar" : "en"}${
                searchParams.entity ? `&entity=${searchParams.entity}` : ""
              }${searchParams.action ? `&action=${searchParams.action}` : ""}`}
              className="btn-secondary"
            >
              <FileDown className="h-4 w-4" />
              {ar ? "تصدير CSV" : "Export CSV"}
            </a>
          </>
        }
      />

      <PageContainer>
        {/* Filter rail */}
        <div className="card card-pad space-y-3">
          <div>
            <div
              className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {ar ? "حسب نوع الكيان" : "By entity"}
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition ${
                        active
                          ? "bg-emerald-600 text-white ring-emerald-700 shadow-sm"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{ar ? ENTITY_AR[b.entity] ?? b.entity : b.entity}</span>
                      <span className="font-mono opacity-80">
                        {formatNumber(b._count._all)}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
          <div>
            <div
              className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {ar ? "حسب الإجراء" : "By action"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {byAction
                .sort((a, b) => b._count._all - a._count._all)
                .map((b) => {
                  const active = searchParams.action === b.action;
                  const meta = ACTION_META[b.action];
                  const Icon = meta?.icon ?? Activity;
                  return (
                    <Link
                      key={b.action}
                      href={
                        active
                          ? `/activity${searchParams.entity ? `?entity=${searchParams.entity}` : ""}`
                          : `/activity?action=${b.action}${searchParams.entity ? `&entity=${searchParams.entity}` : ""}`
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition ${
                        active
                          ? "bg-emerald-600 text-white ring-emerald-700 shadow-sm"
                          : `${TONE_CLASS[meta?.tone ?? "slate"]} hover:opacity-80`
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{ar ? meta?.ar ?? b.action : meta?.en ?? b.action}</span>
                      <span className="font-mono opacity-80">
                        {formatNumber(b._count._all)}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {logs.length === 0 ? (
          <div className="card card-pad py-16 text-center">
            <Activity
              className="mx-auto mb-3 h-10 w-10"
              style={{ color: "var(--text-muted)" }}
            />
            <h3 className="text-base font-extrabold" style={{ color: "var(--text)" }}>
              {ar ? "لا توجد إجراءات مسجلة" : "No activity yet"}
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {ar
                ? "ستظهر هنا كل عمليات الإنشاء والتعديل والحذف فور حدوثها."
                : "Create, update and delete actions will show here as they happen."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(groups.entries()).map(([label, items]) => (
              <section key={label}>
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-[2px] flex-1 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--border) 0%, transparent 100%)",
                    }}
                  />
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "var(--brand-soft)",
                      color: "var(--brand)",
                    }}
                  >
                    {formatNumber(items.length)}
                  </span>
                  <div
                    className="h-[2px] flex-1 rounded-full"
                    style={{
                      background:
                        "linear-gradient(270deg, var(--border) 0%, transparent 100%)",
                    }}
                  />
                </div>

                <ol className="relative space-y-2">
                  {/* vertical line */}
                  <span
                    className="absolute top-3 bottom-3 w-px ltr:left-[15px] rtl:right-[15px]"
                    style={{ background: "var(--border)" }}
                  />
                  {items.map((log) => {
                    const meta = ACTION_META[log.action];
                    const Icon = meta?.icon ?? Activity;
                    const tone = meta?.tone ?? "slate";
                    return (
                      <li
                        key={log.id}
                        className="card card-hover relative ms-8 flex items-start gap-3 p-3 transition"
                      >
                        {/* dot bullet */}
                        <span
                          className={`absolute top-3.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ltr:-left-9 rtl:-right-9 ${TONE_CLASS[tone]}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ring-1 ${TONE_CLASS[tone]}`}
                            >
                              {ar ? meta?.ar ?? log.action : meta?.en ?? log.action}
                            </span>
                            <span
                              className="text-[10px] font-bold uppercase"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {ar ? ENTITY_AR[log.entity] ?? log.entity : log.entity}
                            </span>
                            <span
                              className="ms-auto font-mono text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {relativeTime(log.createdAt, ar)}
                            </span>
                          </div>
                          <div
                            className="mt-1 text-[12.5px] font-bold leading-snug"
                            style={{ color: "var(--text)" }}
                          >
                            {ar ? log.summary : log.summaryEn ?? log.summary}
                          </div>
                          {log.actorName ? (
                            <div
                              className="mt-1 text-[10.5px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <span className="font-bold">
                                {ar ? "بواسطة" : "by"}
                              </span>{" "}
                              {log.actorName}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}

        {logs.length >= 200 ? (
          <p
            className="text-center text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {ar
              ? "عرض آخر 200 إجراء — يتم تنظيف السجل تلقائياً للحفاظ على آخر 5000."
              : "Showing latest 200 entries — log auto-prunes to last 5,000."}
          </p>
        ) : null}
      </PageContainer>
    </>
  );
}
