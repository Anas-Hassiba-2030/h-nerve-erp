"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Zap, AlertTriangle, Trash2, CheckCheck } from "lucide-react";
import { HeritagePill } from "@/components/heritage";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BulkActionBar, BulkCheckbox, useBulkSelect, type BulkAction } from "@/components/ui/BulkActionBar";
import { bulkSetTaskStatus, bulkDeleteTasks, setTaskStatus, deleteTask } from "@/app/(app)/tasks/actions";
import { formatShortDate } from "@/lib/utils/utils";

const STATUS_ICON: Record<string, React.ReactNode> = {
  TODO:        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />,
  IN_PROGRESS: <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />,
  DONE:        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
  BLOCKED:     <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />,
};

const STATUS_AR: Record<string, string> = {
  TODO: "للتنفيذ", IN_PROGRESS: "جارية", DONE: "منجزة", BLOCKED: "متعثرة",
};
const STATUS_TONE: Record<string, "info" | "success" | "critical" | "neutral"> = {
  TODO: "neutral", IN_PROGRESS: "info", DONE: "success", BLOCKED: "critical",
};
const PRIO_TONE: Record<string, "neutral" | "info" | "warn" | "critical"> = {
  LOW: "neutral", MEDIUM: "info", HIGH: "warn", URGENT: "critical",
};
const PRIO_AR: Record<string, string> = {
  LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجل",
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  kind: string;
  points: number;
  module: string;
  dueAt: Date | null;
};

export function TaskTable({
  tasks,
  ar,
  canManage,
}: {
  tasks: TaskRow[];
  ar: boolean;
  canManage: boolean;
}) {
  const ids = tasks.map((t) => t.id);
  const { selected, toggle, selectAll, clearAll } = useBulkSelect(ids);

  const bulkActions: BulkAction[] = [
    {
      id: "done",
      label: "Mark done",
      labelAr: "إنجاز",
      icon: <CheckCheck className="h-3.5 w-3.5" />,
      action: (selectedIds) => bulkSetTaskStatus(selectedIds, "DONE"),
    },
    {
      id: "todo",
      label: "Reset to to-do",
      labelAr: "إعادة للقائمة",
      icon: <Clock className="h-3.5 w-3.5" />,
      action: (selectedIds) => bulkSetTaskStatus(selectedIds, "TODO"),
    },
    ...(canManage
      ? [
          {
            id: "delete",
            label: "Delete selected",
            labelAr: "حذف المحدد",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            tone: "danger" as const,
            action: (selectedIds: string[]) => bulkDeleteTasks(selectedIds),
          },
        ]
      : []),
  ];

  if (tasks.length === 0) return null;

  return (
    <div>
      {ids.length > 1 && (
        <BulkActionBar
          ids={ids}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={clearAll}
          actions={bulkActions}
          ar={ar}
        />
      )}

      <div className="grid gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="group relative flex items-start gap-3"
            style={{
              background: selected.has(task.id) ? "color-mix(in srgb, var(--heri-ochre) 6%, var(--heri-cream))" : "var(--heri-cream)",
              border: selected.has(task.id) ? "1px solid var(--heri-ochre)" : "1px solid var(--heri-rule)",
              padding: "12px 14px",
              transition: "background 120ms, border-color 120ms",
            }}
          >
            {/* Checkbox */}
            {ids.length > 1 && (
              <div style={{ paddingTop: 2 }}>
                <BulkCheckbox id={task.id} selected={selected} onToggle={toggle} />
              </div>
            )}

            {/* Status icon */}
            <form action={setTaskStatus} style={{ paddingTop: 2 }}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value={task.status === "DONE" ? "TODO" : "DONE"} />
              <button
                type="submit"
                title={ar ? "تبديل الحالة" : "Toggle status"}
                style={{
                  color: task.status === "DONE" ? "var(--heri-teal)" : "var(--heri-ink-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {STATUS_ICON[task.status] ?? STATUS_ICON.TODO}
              </button>
            </form>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                  letterSpacing: "-0.008em",
                  textDecoration: task.status === "DONE" ? "line-through" : "none",
                  opacity: task.status === "DONE" ? 0.5 : 1,
                  lineHeight: 1.35,
                }}
              >
                {task.title}
              </div>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-1.5"
                style={{
                  fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--heri-ink-3)",
                }}
              >
                <HeritagePill tone={STATUS_TONE[task.status] ?? "neutral"}>
                  {ar ? STATUS_AR[task.status] ?? task.status : task.status.replace("_", " ")}
                </HeritagePill>
                <HeritagePill tone={PRIO_TONE[task.priority] ?? "neutral"}>
                  {ar ? PRIO_AR[task.priority] ?? task.priority : task.priority}
                </HeritagePill>
                <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                <span>{task.points} {ar ? "نقاط" : "pts"}</span>
                {task.kind === "SIDE" && (
                  <>
                    <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                    <span style={{ color: "var(--heri-copper)" }}>×1.5</span>
                  </>
                )}
                {task.dueAt && (
                  <>
                    <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                    <span>{formatShortDate(task.dueAt)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Delete */}
            {canManage && (
              <div style={{ flexShrink: 0 }}>
                <DeleteButton action={deleteTask} payload={{ id: task.id }} softDelete />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
