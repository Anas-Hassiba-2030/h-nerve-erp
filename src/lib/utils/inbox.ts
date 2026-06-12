// Phase 9 — unified per-user notification aggregator. Fail-soft: each
// source is independently try/caught so one failing query never sinks
// the inbox. Reused by Phase 10 (universal search) — keep it pure data.

import { prisma } from "@/lib/db/db";
import { unreadCountFor } from "@/lib/utils/messages";

export type InboxKind = "brain" | "insight" | "task" | "message";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  severity: "INFO" | "WARNING" | "CRITICAL" | "OPPORTUNITY";
  title: string;
  body: string;
  href: string;
  at: Date;
};

const CAP = 40;

function normSev(s: string | null | undefined): InboxItem["severity"] {
  const v = (s ?? "").toUpperCase();
  if (v === "CRITICAL") return "CRITICAL";
  if (v === "WARNING" || v === "WARN" || v === "HIGH" || v === "URGENT") return "WARNING";
  if (v === "OPPORTUNITY") return "OPPORTUNITY";
  return "INFO";
}

export async function getInboxItems(userId: string): Promise<InboxItem[]> {
  const items: InboxItem[] = [];

  // Brain insights — active (not resolved/dismissed).
  try {
    const rows = await prisma.brainInsight.findMany({
      where: { resolvedAt: null, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: CAP,
      select: { id: true, severity: true, title: true, body: true, createdAt: true },
    });
    for (const r of rows)
      items.push({
        id: `brain:${r.id}`, kind: "brain", severity: normSev(r.severity),
        title: r.title, body: r.body, href: "/admin/brain", at: r.createdAt,
      });
  } catch { /* fail-soft */ }

  // AI insights — open, not deleted.
  try {
    const rows = await prisma.aIInsight.findMany({
      where: { deletedAt: null, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: CAP,
      select: { id: true, module: true, severity: true, title: true, body: true, createdAt: true },
    });
    for (const r of rows)
      items.push({
        id: `insight:${r.id}`, kind: "insight", severity: normSev(r.severity),
        title: r.title, body: r.body, href: `/insights/${r.id}`, at: r.createdAt,
      });
  } catch { /* fail-soft */ }

  // Tasks assigned to me, still open.
  try {
    const rows = await prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null, status: { not: "DONE" } },
      orderBy: { dueAt: "asc" },
      take: CAP,
      select: { id: true, title: true, priority: true, dueAt: true, createdAt: true },
    });
    for (const r of rows) {
      const overdue = r.dueAt ? r.dueAt < new Date() : false;
      items.push({
        id: `task:${r.id}`, kind: "task",
        severity: overdue ? "CRITICAL" : normSev(r.priority),
        title: r.title,
        body: r.dueAt
          ? overdue ? "متأخرة · overdue" : `تستحق · due ${r.dueAt.toISOString().slice(0, 10)}`
          : "بدون موعد · no due date",
        href: "/tasks", at: r.dueAt ?? r.createdAt,
      });
    }
  } catch { /* fail-soft */ }

  // Unread messages — one rolled-up item (thread-level detail is in /messages).
  try {
    const unread = await unreadCountFor(userId);
    if (unread > 0)
      items.push({
        id: "messages:unread", kind: "message", severity: "INFO",
        title: `${unread} رسالة غير مقروءة · ${unread} unread message(s)`,
        body: "لديك رسائل تنتظر الرد · You have messages waiting",
        href: "/messages", at: new Date(),
      });
  } catch { /* fail-soft */ }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 100);
}
