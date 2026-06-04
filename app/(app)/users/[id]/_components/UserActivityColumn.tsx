import Link from "next/link";
import { DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatNumber,
  formatRelative,
  formatShortDate,
} from "@/lib/utils/utils";
import type { UserDetail } from "../data";

const TASK_STATUS_AR: Record<string, string> = {
  TODO: "للتنفيذ",
  IN_PROGRESS: "قيد التنفيذ",
  DONE: "منجزة",
  BLOCKED: "معطّلة",
};

const TASK_STATUS_EN: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export function UserActivityColumn({
  recentTasks,
  insights,
  tasksByStatus,
  totalTasks,
  en,
}: {
  recentTasks: UserDetail["recentTasks"];
  insights: UserDetail["insights"];
  tasksByStatus: Record<string, number>;
  totalTasks: number;
  en: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Tasks */}
      {recentTasks.length > 0 ? (
        <DaylightPanel title={en ? "Tasks" : "المهام"} aside={`${formatNumber(totalTasks)} ${en ? "total" : "إجمالي"}`}>

          {/* Status mini-chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {Object.entries(tasksByStatus).map(([status, count]) => (
              <span
                key={status}
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  background:
                    "color-mix(in srgb, var(--gold) 8%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--gold) 18%, transparent)",
                  color: "var(--ink)",
                }}
              >
                {(en ? TASK_STATUS_EN[status] : TASK_STATUS_AR[status]) ?? status}: {formatNumber(count)}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-[var(--line)]">
            {recentTasks.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-bold"
                      style={{ color: "var(--ink)" }}
                    >
                      {t.title}
                    </span>
                    <span
                      className={`tag ${t.kind === "SIDE" ? "gold" : "ok"}`}
                      style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}
                    >
                      {t.kind === "SIDE"
                        ? en
                          ? "Side"
                          : "جانبي"
                        : en
                          ? "Core"
                          : "أساسي"}
                    </span>
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {(en ? TASK_STATUS_EN[t.status] : TASK_STATUS_AR[t.status]) ?? t.status} •{" "}
                    {t.dueAt
                      ? `${en ? "Due" : "استحقاق"} ${formatShortDate(t.dueAt)}`
                      : en
                        ? "No due date"
                        : "بدون موعد"}
                    {" • "}
                    <span className="font-mono">
                      {t.points} {en ? "pts" : "نقطة"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </DaylightPanel>
      ) : null}

      {/* Recent insights */}
      {insights.length > 0 ? (
        <DaylightPanel
          title={en ? "Published Signals" : "إشارات منشورة"}
          aside={<Link href="/insights" style={{ fontSize: 11, color: "var(--gold)", textDecoration: "none" }}>{en ? "View all ←" : "عرض الكل ←"}</Link>}
        >
          <ul style={{ borderTop: "1px solid var(--line)" }}>
            {insights.map((ins) => (
              <li
                key={ins.id}
                className="py-2"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={ins.severity} />
                  <span
                    className="truncate text-sm font-bold"
                    style={{ color: "var(--ink)" }}
                  >
                    {ins.title}
                  </span>
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {ins.module} • {formatRelative(ins.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </DaylightPanel>
      ) : null}
    </div>
  );
}
