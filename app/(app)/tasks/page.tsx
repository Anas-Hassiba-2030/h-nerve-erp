import Link from "next/link";
import {
  ListChecks, Plus, CheckCircle2, Clock, Zap, Trophy, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { RankBadge } from "@/components/RankBadge";
import { EmptyState } from "@/components/EmptyState";
import { TaskTable } from "@/components/tasks/TaskTable";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { rankById, progressToNext, nextRank } from "@/lib/gamification";
import { hasRole } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
const STATUS_AR: Record<string, string> = { TODO: "للتنفيذ", IN_PROGRESS: "جارية", DONE: "منجزة", BLOCKED: "متعثرة" };
const STATUS_TONE: Record<string, "info" | "success" | "critical" | "neutral"> = {
  TODO: "neutral", IN_PROGRESS: "info", DONE: "success", BLOCKED: "critical",
};
const PRIO_TONE: Record<string, "neutral" | "info" | "warn" | "critical"> = {
  LOW: "neutral", MEDIUM: "info", HIGH: "warn", URGENT: "critical",
};
const PRIO_AR: Record<string, string> = { LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجل" };

export default async function TasksPage() {
  const ar = getLocale() === "ar";
  const session = await getCurrentUser();
  if (!session) return null;

  const me = await prisma.user.findUnique({ where: { id: session.id } });
  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.id, deletedAt: null },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
  });

  const totalPoints = tasks.filter((t) => t.status === "DONE").reduce((a, t) => a + t.points * (t.kind === "SIDE" ? 1.5 : 1), 0);
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProg = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const sideDone = tasks.filter((t) => t.status === "DONE" && t.kind === "SIDE").length;

  const rank = rankById(me?.rank ?? "PAWN");
  const progress = progressToNext(me?.xp ?? 0);
  const next = nextRank(me?.xp ?? 0);
  const canManage = hasRole(session, "MANAGER");

  const grouped = STATUS_ORDER.map((s) => ({ status: s, items: tasks.filter((t) => t.status === s) }));

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الفريق والمهام" : "People & Tasks"}
        title={ar ? "مهامي والتلعيب" : "My Tasks & Gamification"}
        subtitle={
          ar
            ? "كل مهمة منجزة ترفع XP. كلما زادت رتبتك، زادت نسبة البونص الشهري."
            : "Every completed task earns XP. Higher rank = bigger monthly bonus."
        }
      />

      <PageContainer>
        {/* Rank + XP strip */}
        <HeritageSection
          eyebrow={ar ? "الرتبة والتلعيب" : "Rank & gamification"}
          title={ar ? `${rank.ar} · ${formatNumber(me?.xp ?? 0)} XP` : `${rank.en} · ${formatNumber(me?.xp ?? 0)} XP`}
          aside={ar ? `+${rank.bonusPercent}% بونص` : `+${rank.bonusPercent}% bonus`}
          href="/achievements"
          hrefLabel={ar ? "الإنجازات" : "Achievements"}
          rtl={ar}
        >
          <div className="flex flex-wrap items-center gap-4">
            <RankBadge rank={(me?.rank ?? "PAWN") as any} size="xl" showLabel={false} />
            <div className="min-w-0 flex-1">
              {next ? (
                <>
                  <div className="mb-1" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
                    {ar
                      ? `${formatNumber(progress.needed - progress.current)} XP حتى ${next.ar}`
                      : `${formatNumber(progress.needed - progress.current)} XP to reach ${next.en}`}
                  </div>
                  <div
                    className="h-1.5 w-full max-w-[280px] overflow-hidden"
                    style={{ background: "var(--heri-rule)", position: "relative" }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        insetInlineStart: 0,
                        top: 0,
                        height: "100%",
                        width: `${(progress.pct * 100).toFixed(1)}%`,
                        background: "var(--heri-ochre)",
                      }}
                    />
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "var(--heri-teal)" }}>
                  {ar ? "أعلى رتبة — King" : "Top rank — King"}
                </span>
              )}
            </div>
            <Link href="/tasks/new" className="heri-btn heri-btn-primary" style={{ fontSize: 12, textDecoration: "none" }}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "مهمة جديدة" : "New task"}
            </Link>
          </div>
        </HeritageSection>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi label={ar ? "للتنفيذ" : "To do"} raw={todoCount} kind="number" hint={ar ? "في الانتظار" : "queued"} />
          <HeriKpi label={ar ? "جارية" : "In progress"} raw={inProg} kind="number" accent="var(--heri-copper)" hint={ar ? "نشطة الآن" : "active now"} />
          <HeriKpi label={ar ? "مهام جانبية منجزة" : "Side tasks done"} raw={sideDone} kind="number" hint={ar ? "× 1.5 نقاط" : "1.5× points"} />
          <HeriKpi label={ar ? "إجمالي النقاط" : "Total points"} raw={Math.round(totalPoints)} kind="number" accent="var(--heri-teal)" hint={ar ? "كسبتها" : "earned"} />
        </section>

        {tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={ar ? "لا مهام بعد" : "No tasks yet"}
            description={ar ? "ابدأ بإضافة أول مهمة لكسب XP." : "Add your first task to start earning XP."}
            action={
              <Link href="/tasks/new" className="heri-btn heri-btn-primary">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {ar ? "أضف مهمة" : "Add task"}
              </Link>
            }
          />
        ) : (
          <section className="grid gap-5">
            {grouped.filter((g) => g.items.length > 0).map((g) => (
              <div key={g.status}>
                {/* Section header */}
                <div
                  className="mb-2 flex items-center justify-between px-3 py-2"
                  style={{ background: "var(--heri-cream-2)", border: "1px solid var(--heri-rule)" }}
                >
                  <HeritagePill tone={STATUS_TONE[g.status]}>
                    {ar ? STATUS_AR[g.status] : g.status.replace("_", " ")}
                  </HeritagePill>
                  <span
                    className="heri-number-mono"
                    style={{ fontSize: 10, color: "var(--heri-ink-3)" }}
                  >
                    {g.items.length}
                  </span>
                </div>
                <TaskTable
                  tasks={g.items}
                  ar={ar}
                  canManage={canManage}
                />
              </div>
            ))}
          </section>
        )}
      </PageContainer>
    </>
  );
}
