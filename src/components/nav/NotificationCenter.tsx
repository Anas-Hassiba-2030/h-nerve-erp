"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell, Sparkles, Activity, ListChecks, AlertTriangle, Lightbulb,
  Info, X, Plus, Pencil, Trash2, RotateCcw, LogIn, Brain,
  CheckCircle2, ArrowRight, Clock,
} from "lucide-react";

export type NotifInsight = {
  id: string;
  module: string;
  severity: "INFO" | "WARN" | "CRITICAL" | "OPPORTUNITY";
  title: string;
  body: string;
  createdAt: string | Date;
};

export type NotifActivity = {
  id: string;
  action: string;
  entity: string;
  summary: string;
  summaryEn: string | null;
  actorName: string | null;
  createdAt: string | Date;
};

export type NotifTask = {
  id: string;
  title: string;
  priority: string;
  dueAt: string | Date | null;
  module: string;
};

const SEV_TONE: Record<string, string> = {
  INFO: "bg-blue-50 text-blue-700 ring-blue-200",
  WARN: "bg-amber-50 text-amber-700 ring-amber-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
  OPPORTUNITY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const ACTION_ICON: Record<string, any> = {
  CREATE: Plus, UPDATE: Pencil, DELETE: Trash2, RESTORE: RotateCcw,
  LOGIN: LogIn, FORECAST: Brain, INSIGHT: Sparkles, APPROVE: CheckCircle2,
};

const ACTION_TONE: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  UPDATE: "bg-blue-50 text-blue-700 ring-blue-200",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
  RESTORE: "bg-amber-50 text-amber-700 ring-amber-200",
  LOGIN: "bg-violet-50 text-violet-700 ring-violet-200",
  FORECAST: "bg-violet-50 text-violet-700 ring-violet-200",
  INSIGHT: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const PRIORITY_TONE: Record<string, string> = {
  URGENT: "bg-rose-50 text-rose-700 ring-rose-200",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-200",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
  LOW: "bg-slate-100 text-slate-700 ring-slate-200",
};

function relTime(d: Date | string, ar: boolean): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "now";
  if (diff < 3600) return ar ? `${Math.floor(diff / 60)}د` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return ar ? `${Math.floor(diff / 3600)}س` : `${Math.floor(diff / 3600)}h`;
  return ar ? `${Math.floor(diff / 86400)}ي` : `${Math.floor(diff / 86400)}d`;
}

function iconForSev(sev: string) {
  if (sev === "CRITICAL" || sev === "WARN") return AlertTriangle;
  if (sev === "OPPORTUNITY") return Lightbulb;
  return Info;
}

type Tab = "insights" | "activity" | "tasks";

export function NotificationCenter({
  insights,
  activity,
  tasks,
  insightCount,
  locale,
}: {
  insights: NotifInsight[];
  activity: NotifActivity[];
  tasks: NotifTask[];
  insightCount: number;
  locale: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("insights");
  const ar = locale === "ar";

  const total = insightCount + activity.length + tasks.length;
  const overdueCount = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date(),
  ).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative hidden items-center justify-center rounded-xl p-2 transition hover:scale-110 md:inline-flex"
        style={{
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
        }}
        aria-label={ar ? "الإشعارات" : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {total > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black anim-pop"
            style={{
              background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
              color: "white",
              boxShadow: "0 0 0 2px var(--surface-elevated)",
            }}
          >
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute end-0 z-50 mt-2 w-[min(96vw,440px)] overflow-hidden rounded-2xl shadow-glow anim-fade-up"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{
                borderBottom: "1px solid var(--border)",
                background:
                  "linear-gradient(135deg, var(--brand-soft) 0%, transparent 100%)",
              }}
            >
              <div className="flex items-center gap-2">
                <Bell
                  className="h-4 w-4"
                  style={{ color: "var(--brand)" }}
                />
                <div>
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    {ar ? "مركز الإشعارات" : "Notification center"}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {ar
                      ? `${total} عنصر يحتاج انتباهك`
                      : `${total} items need your attention`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 transition hover:bg-[var(--brand-soft)]"
                aria-label="close"
              >
                <X
                  className="h-4 w-4"
                  style={{ color: "var(--text-muted)" }}
                />
              </button>
            </div>

            {/* Tab strip */}
            <div
              className="flex"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <TabButton
                active={tab === "insights"}
                onClick={() => setTab("insights")}
                icon={Sparkles}
                label={ar ? "الإشارات" : "Insights"}
                count={insightCount}
              />
              <TabButton
                active={tab === "activity"}
                onClick={() => setTab("activity")}
                icon={Activity}
                label={ar ? "النشاط" : "Activity"}
                count={activity.length}
              />
              <TabButton
                active={tab === "tasks"}
                onClick={() => setTab("tasks")}
                icon={ListChecks}
                label={ar ? "المهام" : "Tasks"}
                count={tasks.length}
                badge={overdueCount}
              />
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto">
              {tab === "insights" ? (
                insights.length === 0 ? (
                  <Empty
                    icon={Sparkles}
                    text={ar ? "لا توجد إشارات مفتوحة" : "No open insights"}
                  />
                ) : (
                  <ul
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {insights.map((it) => {
                      const Icon = iconForSev(it.severity);
                      return (
                        <li key={it.id}>
                          <Link
                            href={`/insights/${it.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 transition hover:bg-[var(--brand-soft)]"
                          >
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${SEV_TONE[it.severity]}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="line-clamp-1 text-sm font-extrabold"
                                style={{ color: "var(--text)" }}
                              >
                                {it.title}
                              </div>
                              <div
                                className="line-clamp-2 text-[11px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {it.body}
                              </div>
                              <div
                                className="mt-1 flex items-center gap-2 text-[10px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <span
                                  className="rounded-full px-2 py-0.5 font-bold"
                                  style={{
                                    background:
                                      "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                                  }}
                                >
                                  {it.module}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {relTime(it.createdAt, ar)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}

              {tab === "activity" ? (
                activity.length === 0 ? (
                  <Empty
                    icon={Activity}
                    text={ar ? "لا نشاط حديث" : "No recent activity"}
                  />
                ) : (
                  <ul
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {activity.map((it) => {
                      const Icon = ACTION_ICON[it.action] ?? Activity;
                      const tone = ACTION_TONE[it.action] ?? "bg-slate-100 text-slate-700 ring-slate-200";
                      return (
                        <li key={it.id}>
                          <Link
                            href="/activity"
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 px-4 py-2.5 transition hover:bg-[var(--brand-soft)]"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="line-clamp-1 text-[12px] font-bold"
                                style={{ color: "var(--text)" }}
                              >
                                {ar ? it.summary : it.summaryEn ?? it.summary}
                              </div>
                              <div
                                className="flex items-center gap-1.5 text-[9.5px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {it.actorName ? (
                                  <span className="font-bold">
                                    {it.actorName}
                                  </span>
                                ) : null}
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {relTime(it.createdAt, ar)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}

              {tab === "tasks" ? (
                tasks.length === 0 ? (
                  <Empty
                    icon={ListChecks}
                    text={ar ? "لا مهام مستحقة 🎉" : "No tasks due 🎉"}
                  />
                ) : (
                  <ul
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {tasks.map((t) => {
                      const overdue = t.dueAt && new Date(t.dueAt) < new Date();
                      return (
                        <li key={t.id}>
                          <Link
                            href="/tasks"
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 px-4 py-2.5 transition hover:bg-[var(--brand-soft)]"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${PRIORITY_TONE[t.priority] ?? PRIORITY_TONE.MEDIUM}`}
                            >
                              <ListChecks className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="line-clamp-1 text-[12px] font-bold"
                                style={{ color: "var(--text)" }}
                              >
                                {t.title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9.5px]">
                                <span
                                  className="rounded-full px-1.5 py-0.5 font-extrabold"
                                  style={{
                                    color: "var(--text-muted)",
                                    background:
                                      "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                                  }}
                                >
                                  {t.module}
                                </span>
                                {t.dueAt ? (
                                  <span
                                    className={`flex items-center gap-0.5 font-bold ${overdue ? "text-rose-600" : ""}`}
                                    style={
                                      overdue ? undefined : { color: "var(--text-muted)" }
                                    }
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {overdue
                                      ? ar
                                        ? "متأخرة"
                                        : "overdue"
                                      : relTime(t.dueAt, ar)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </div>

            {/* Footer links */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-2"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <Link
                href="/inbox"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs font-extrabold"
                style={{ color: "var(--text)" }}
              >
                <Bell className="h-3 w-3" />
                {ar ? "صندوق الوارد" : "Open inbox"}
              </Link>
              <Link
                href={
                  tab === "insights"
                    ? "/insights"
                    : tab === "activity"
                    ? "/activity"
                    : "/tasks"
                }
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 text-xs font-bold"
                style={{ color: "var(--brand)" }}
              >
                {ar
                  ? tab === "insights"
                    ? "كل الإشارات"
                    : tab === "activity"
                    ? "السجل الكامل"
                    : "كل المهام"
                  : tab === "insights"
                  ? "View all insights"
                  : tab === "activity"
                  ? "Full audit log"
                  : "All tasks"}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count: number;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[11.5px] font-extrabold transition"
      style={{
        color: active ? "var(--brand)" : "var(--text-muted)",
        background: active ? "var(--brand-soft)" : "transparent",
        borderBottom: active
          ? "2px solid var(--brand)"
          : "2px solid transparent",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 font-mono text-[9px]"
        style={{
          background: active
            ? "var(--brand)"
            : "color-mix(in srgb, var(--text-muted) 18%, transparent)",
          color: active ? "white" : "var(--text-muted)",
        }}
      >
        {count}
      </span>
      {badge && badge > 0 ? (
        <span
          className="absolute -top-0.5 right-1 flex h-3 min-w-3 items-center justify-center rounded-full px-1 text-[8px] font-black anim-pop"
          style={{
            background: "#dc2626",
            color: "white",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 py-10 text-center"
      style={{ color: "var(--text-muted)" }}
    >
      <Icon className="h-8 w-8 opacity-50" />
      <p className="text-[11px] font-bold">{text}</p>
    </div>
  );
}
