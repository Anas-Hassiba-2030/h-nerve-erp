import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { setTaskStatus } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  const session = await getCurrentUser();

  const [tasks, me] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { assignee: true },
      take: 60,
    }),
    session ? prisma.user.findUnique({ where: { id: session.id } }) : Promise.resolve(null),
  ]);

  const todo = tasks.filter((t) => t.status === "TODO");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const done = tasks.filter((t) => t.status === "DONE");
  const myXp = me?.xp ?? 0;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · المهام والإنتاجية" : "Team · Tasks & Productivity"}
        title={ar ? "المهام" : "Tasks"}
        subtitle={ar ? "مهام الفريق ونقاط الخبرة والتقدّم." : "Team tasks, XP and progress."}
        status={`${formatNumber(inProgress.length)} ${ar ? "نشطة" : "active"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "للقيام" : "To do"} value={formatNumber(todo.length)} hint={ar ? "بانتظار" : "waiting"} />
        <DaylightKpi label={ar ? "قيد التنفيذ" : "In progress"} value={formatNumber(inProgress.length)} hint={ar ? "نشطة" : "active"} />
        <DaylightKpi label={ar ? "منجزة" : "Completed"} value={formatNumber(done.length)} hint={ar ? "أحسنت" : "great"} delta={done.length > 0 ? { dir: "up", text: formatNumber(done.length) } : undefined} />
        <DaylightKpi label={ar ? "نقاطك" : "Your XP"} value={formatNumber(myXp)} hint={ar ? "خبرة" : "experience"} />
      </DaylightKpiGrid>

      {tasks.length === 0 ? (
        <DaylightPanel title={ar ? "المهام" : "Tasks"}>
          <EmptyState icon={CheckSquare} title={ar ? "لا توجد مهام" : "No tasks"} description={ar ? "أضف أول مهمة." : "Add your first task."} />
        </DaylightPanel>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <TaskColumn title={ar ? "للقيام" : "To do"} tasks={todo} ar={ar} lc={lc} />
          <TaskColumn title={ar ? "قيد التنفيذ" : "In progress"} tasks={inProgress} ar={ar} lc={lc} />
          <TaskColumn title={ar ? "منجزة" : "Done"} tasks={done} ar={ar} lc={lc} done />
        </div>
      )}
    </DaylightShell>
  );
}

function TaskColumn({ title, tasks, ar, lc, done }: { title: string; tasks: any[]; ar: boolean; lc: "ar" | "en"; done?: boolean }) {
  return (
    <DaylightPanel title={title} aside={String(tasks.length)}>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="prop-card" style={{ padding: 12, opacity: done ? 0.75 : 1 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                  {task.assignee ? <span>{task.assignee.name}</span> : null}
                  {task.dueAt ? <span>· {formatShortDate(task.dueAt, lc)}</span> : null}
                  {task.points ? <span style={{ fontFamily: "monospace" }}>· +{task.points} XP</span> : null}
                </div>
              </div>
              {!done ? (
                <form action={setTaskStatus}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="status" value="DONE" />
                  <button type="submit" style={{ color: "var(--emerald)", fontWeight: 700, fontSize: 13, padding: "2px 6px" }} title={ar ? "إنجاز" : "Complete"}>✓</button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {tasks.length === 0 ? <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>—</p> : null}
      </div>
    </DaylightPanel>
  );
}
