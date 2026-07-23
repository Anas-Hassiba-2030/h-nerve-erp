// "Today" activity widget — counts and shows recent ActivityLog entries
// from the last 24 hours, grouped by hour heat-strip + a top events list.
// Pure server component.

import Link from "next/link";
import {
  Activity, Plus, Pencil, Trash2, RotateCcw, LogIn, Sparkles, Brain,
  CheckCircle2, XCircle, UserPlus, Download, Clock, ArrowRight,
} from "lucide-react";

export type ActivityLogLite = {
  id: string;
  action: string;
  entity: string;
  summary: string;
  summaryEn: string | null;
  actorName: string | null;
  module: string | null;
  createdAt: Date;
};

const ACTION_META: Record<
  string,
  { icon: any; tone: string; ar: string; en: string }
> = {
  CREATE: { icon: Plus, tone: "emerald", ar: "إنشاء", en: "Create" },
  UPDATE: { icon: Pencil, tone: "blue", ar: "تحديث", en: "Update" },
  DELETE: { icon: Trash2, tone: "rose", ar: "حذف", en: "Delete" },
  RESTORE: { icon: RotateCcw, tone: "amber", ar: "استعادة", en: "Restore" },
  LOGIN: { icon: LogIn, tone: "violet", ar: "دخول", en: "Login" },
  EXPORT: { icon: Download, tone: "blue", ar: "تصدير", en: "Export" },
  FORECAST: { icon: Brain, tone: "violet", ar: "تنبؤ", en: "Forecast" },
  INSIGHT: { icon: Sparkles, tone: "amber", ar: "إشارة", en: "Insight" },
  APPROVE: { icon: CheckCircle2, tone: "emerald", ar: "اعتماد", en: "Approve" },
  REJECT: { icon: XCircle, tone: "rose", ar: "رفض", en: "Reject" },
  ASSIGN: { icon: UserPlus, tone: "blue", ar: "إسناد", en: "Assign" },
};

const TONE_BG: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

function relTime(d: Date, ar: boolean): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "now";
  if (diff < 3600) return ar ? `${Math.floor(diff / 60)}د` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return ar ? `${Math.floor(diff / 3600)}س` : `${Math.floor(diff / 3600)}h`;
  return ar ? `${Math.floor(diff / 86400)}ي` : `${Math.floor(diff / 86400)}d`;
}

export function TodayActivity({
  items,
  totalToday,
  locale,
}: {
  items: ActivityLogLite[];
  totalToday: number;
  locale: "ar" | "en";
}) {
  const ar = locale === "ar";

  // Heat strip: 24 hours, count of events per hour
  const now = new Date();
  const hourCounts = Array(24).fill(0) as number[];
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  for (const it of items) {
    if (it.createdAt < startOfDay) continue;
    const h = it.createdAt.getHours();
    hourCounts[h] += 1;
  }
  const max = Math.max(1, ...hourCounts);
  const currentHour = now.getHours();

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3
            className="flex items-center gap-1.5 text-[13px] font-extrabold"
            style={{ color: "var(--text)" }}
          >
            <Activity className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} />
            {ar ? "نشاط اليوم" : "Today's activity"}
          </h3>
          <p
            className="text-[12px]"
            style={{ color: "var(--text-muted)" }}
          >
            {ar
              ? `${totalToday} عملية في آخر ٢٤ ساعة`
              : `${totalToday} actions in the last 24 hours`}
          </p>
        </div>
        <Link href="/activity" className="btn-ghost btn-sm">
          {ar ? "السجل الكامل" : "Full log"}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
      </div>

      {/* 24-hour heat strip */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
          <span>00:00</span>
          <span>{ar ? "نبض الساعات" : "Hourly pulse"}</span>
          <span>23:59</span>
        </div>
        <div
          className="flex h-7 gap-px overflow-hidden rounded-md"
          style={{ background: "var(--brand-soft)" }}
        >
          {hourCounts.map((c, h) => {
            const intensity = c / max;
            const isCurrent = h === currentHour;
            return (
              <div
                key={h}
                className="relative flex-1 transition"
                style={{
                  background:
                    intensity === 0
                      ? "transparent"
                      : `color-mix(in srgb, var(--brand) ${20 + intensity * 80}%, transparent)`,
                  borderLeft: isCurrent ? "1.5px solid var(--accent)" : "none",
                }}
                title={`${h.toString().padStart(2, "0")}:00 — ${c}`}
              >
                {isCurrent ? (
                  <span
                    className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent items list */}
      {items.length === 0 ? (
        <div
          className="py-6 text-center text-[13px]"
          style={{ color: "var(--text-muted)" }}
        >
          {ar ? "لا نشاط بعد اليوم" : "No activity yet today"}
        </div>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((it) => {
            const meta = ACTION_META[it.action];
            const Icon = meta?.icon ?? Activity;
            const tone = meta?.tone ?? "slate";
            return (
              <li key={it.id}>
                <Link
                  href="/activity"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--brand-soft)]"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${TONE_BG[tone]}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="line-clamp-1 text-[13px] font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {ar ? it.summary : it.summaryEn ?? it.summary}
                    </div>
                    {it.actorName ? (
                      <div
                        className="text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {it.actorName}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className="flex items-center gap-0.5 font-mono text-[12px] font-bold tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {relTime(it.createdAt, ar)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
