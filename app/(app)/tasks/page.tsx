// المهام · Tasks — ports docs/design/system/sections/tasks.html + tasks.js.
//
// Night register: title-box + KPI strip + chess-rank card, filter pills +
// search + inline composer, tasks table with priority/owner/due/status/XP,
// bulk toolbar, confetti + rank-up toast. The look is the Claude Design
// reference; data comes from Prisma; mutations go through server actions
// in ./actions.ts. The client-side behaviour lives in TasksBoard.tsx.

import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { rankFor, nextRank, progressToNext } from "@/lib/gamification";
import { TasksBoard, type BoardTask, type BoardRank, type BoardPrio, type BoardStatus } from "./TasksBoard";
import "../daylight.css";
import "./tasks.css";

export const dynamic = "force-dynamic";

const DOMAIN_PRIO: Record<string, BoardPrio> = {
  HIGH: "high", URGENT: "high", MEDIUM: "med", LOW: "low",
};
const DOMAIN_STATUS: Record<string, BoardStatus> = {
  TODO: "todo", IN_PROGRESS: "doing", BLOCKED: "todo", DONE: "done",
};

function initialGlyph(name: string): string {
  return name?.trim()?.[0] ?? "?";
}

function dueLabel(d: Date | null | undefined, ar: boolean): string {
  if (!d) return ar ? "—" : "—";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  const days = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (days === 0) return ar ? "اليوم" : "Today";
  if (days === 1) return ar ? "غداً" : "Tomorrow";
  if (days === -1) return ar ? "أمس" : "Yesterday";
  if (days < 0) return ar ? `قبل ${formatNumber(-days)} أيام` : `${-days}d ago`;
  if (days < 7) return ar ? `بعد ${formatNumber(days)} أيام` : `in ${days}d`;
  return new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { day: "numeric", month: "short" }).format(d);
}

export default async function TasksPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();

  const [tasks, me] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { assignee: true },
      take: 100,
    }),
    session ? prisma.user.findUnique({ where: { id: session.id } }) : Promise.resolve(null),
  ]);

  // KPI ribbon
  const myTasks = session ? tasks.filter((t) => t.assigneeId === session.id) : [];
  const doingTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const doneToday = tasks.filter((t) => t.status === "DONE" && t.completedAt && new Date(t.completedAt) >= today);
  const todayXp = doneToday.reduce((a, t) => a + Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1)), 0);

  // Rank card data
  const myXp = me?.xp ?? 0;
  const rk = rankFor(myXp);
  const nxt = nextRank(myXp);
  const prog = progressToNext(myXp);
  const rank: BoardRank = {
    name: ar ? rk.ar : rk.en,
    symbol: rk.symbol,
    xp: myXp,
    pct: Math.round(prog.pct * 100),
    nextLabel: nxt
      ? (ar ? `التالي: ${formatNumber(nxt.minXp)}` : `Next: ${formatNumber(nxt.minXp)}`)
      : (ar ? "أعلى رتبة" : "Top rank"),
  };

  // Board tasks
  const initialTasks: BoardTask[] = tasks.map((t) => {
    const ownerName = t.assignee?.name ?? (ar ? "—" : "—");
    return {
      id: t.id,
      title: ar ? t.title : (t.titleEn || t.title),
      prio: DOMAIN_PRIO[t.priority] ?? "med",
      owner: ownerName,
      ownerGlyph: initialGlyph(ownerName),
      due: dueLabel(t.dueAt ?? null, ar),
      status: DOMAIN_STATUS[t.status] ?? "todo",
      xp: Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1)),
      mine: !!session && t.assigneeId === session.id,
    };
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="tk-wrap">
        <div className="tk-top">
          <div className="tk-title-box">
            <span className="eb"><span className="tick" />{ar ? "الأفراد" : "People"}</span>
            <h1>{ar ? "المهام" : "Tasks"}</h1>
          </div>
          <div className="tk-kpis">
            <div className="tk-kpi"><div className="v" id="kp_mine">{formatNumber(myTasks.length)}</div><div className="k">{ar ? "مهامي" : "My tasks"}</div></div>
            <div className="tk-kpi"><div className="v" id="kp_doing">{formatNumber(doingTasks.length)}</div><div className="k">{ar ? "قيد التنفيذ" : "In progress"}</div></div>
            <div className="tk-kpi"><div className="v" id="kp_done">{formatNumber(doneToday.length)}</div><div className="k">{ar ? "مكتملة اليوم" : "Done today"}</div></div>
            <div className="tk-kpi"><div className="v" id="kp_xp">{formatNumber(todayXp)}</div><div className="k">{ar ? "XP المكتسبة اليوم" : "XP today"}</div></div>
          </div>
          <div className="rank-card" id="rankCard">
            <div className="rank-piece" id="rankPiece">{rk.symbol}</div>
            <div className="rank-info">
              <div className="rank-name">{ar ? "رتبتك: " : "Your rank: "}<b id="rankName">{rank.name}</b></div>
              <div className="rank-bar"><span id="rankBar" style={{ width: `${Math.max(3, Math.min(100, rank.pct))}%` }} /></div>
              <div className="rank-meta">
                <span id="rankXp">{formatNumber(myXp)} XP</span>
                <span id="rankNext">{rank.nextLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <TasksBoard
          initialTasks={initialTasks}
          rank={rank}
          todayXp={todayXp}
          ar={ar}
          labels={{
            prio: { high: ar ? "عالية" : "High", med: ar ? "متوسطة" : "Medium", low: ar ? "منخفضة" : "Low" },
            stat: { todo: ar ? "قيد الانتظار" : "To do", doing: ar ? "قيد التنفيذ" : "In progress", done: ar ? "مكتمل" : "Done" },
            searchPlaceholder: ar ? "بحث في المهام…" : "Search tasks…",
            add: ar ? "＋ مهمة جديدة" : "＋ New task",
            selected: (n) => ar ? `${n} محدّد` : `${n} selected`,
            bulkDone: ar ? "حدّد كمكتمل" : "Mark done",
            bulkDoing: ar ? "حدّد قيد التنفيذ" : "Mark in-progress",
            bulkDel: ar ? "حذف" : "Delete",
            congrats: ar ? "تهانينا!" : "Congratulations!",
            rankUp: (name) => ar ? `ترقّيت إلى ${name}` : `Promoted to ${name}`,
            composer: { title: ar ? "عنوان المهمة…" : "Task title…" },
            newHref: "/tasks/new",
          }}
        />
      </div>
    </div>
  );
}
