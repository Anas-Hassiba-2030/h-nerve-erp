import Link from "next/link";
import {
  ListChecks, Plus, Trash2, CheckCircle2, Clock, Zap, Trophy, AlertTriangle, Target,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { KpiCard } from "@/components/KpiCard";
import { RankBadge } from "@/components/RankBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { prisma } from "@/lib/db";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { rankById, progressToNext, nextRank } from "@/lib/gamification";
import { setTaskStatus, deleteTask } from "./actions";

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
const STATUS_AR: Record<string, string> = { TODO: "للتنفيذ", IN_PROGRESS: "جارية", DONE: "منجزة", BLOCKED: "متعثرة" };
const STATUS_TONE: Record<string, string> = { TODO: "badge-slate", IN_PROGRESS: "badge-blue", DONE: "badge-emerald", BLOCKED: "badge-red" };
const PRIO_TONE: Record<string, string> = { LOW: "badge-slate", MEDIUM: "badge-blue", HIGH: "badge-amber", URGENT: "badge-red" };
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

  // Group by status
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
        <HeroPanel
          gradient="linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #3b82f6 75%, #93c5fd 110%)"
          accent="#3b82f6"
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <RankBadge rank={(me?.rank ?? "PAWN") as any} size="xl" showLabel={false} />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <Trophy className="h-3 w-3" />
                  {ar ? rank.ar : rank.en} · +{rank.bonusPercent}%
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? `${formatNumber(me?.xp ?? 0)} XP` : `${formatNumber(me?.xp ?? 0)} XP`}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {next
                    ? ar
                      ? `${formatNumber(progress.needed - progress.current)} XP حتى الترقية إلى ${next.ar}`
                      : `${formatNumber(progress.needed - progress.current)} XP to reach ${next.en}`
                    : ar
                    ? "أعلى رتبة — King ♚"
                    : "Top rank — King ♚"}
                </p>
                {next ? (
                  <div
                    className="mt-2 h-2 max-w-xs overflow-hidden rounded-full"
                    style={{ background: "rgba(0,0,0,0.18)" }}
                  >
                    <div
                      className="hn-shimmer h-full rounded-full"
                      style={{
                        width: `${(progress.pct * 100).toFixed(1)}%`,
                        background: `linear-gradient(90deg, ${rank.color}, ${next.color})`,
                      }}
                    />
                  </div>
                ) : null}
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#1e3a8a" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "مهمة جديدة" : "New task"}
                  </Link>
                  <Link
                    href="/achievements"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.32)",
                      backdropFilter: "blur(6px)",
                      color: "white",
                    }}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    {ar ? "الإنجازات" : "Achievements"}
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <TasksHeroStat label={ar ? "للتنفيذ" : "To do"} value={formatNumber(todoCount)} icon={ListChecks} />
              <TasksHeroStat label={ar ? "جارية" : "In progress"} value={formatNumber(inProg)} icon={Clock} />
              <TasksHeroStat label={ar ? "نقاط مكتسبة" : "Points earned"} value={formatNumber(Math.round(totalPoints))} icon={Zap} />
              <TasksHeroStat label={ar ? "بونص شهري" : "Monthly bonus"} value={`+${(me?.bonusPercent ?? 0).toFixed(1)}%`} icon={Trophy} />
            </div>
          </div>
        </HeroPanel>
        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "للتنفيذ" : "To do"}
            value={formatNumber(todoCount)}
            icon={ListChecks}
            tone="brand"
            hint={ar ? "في الانتظار" : "queued"}
          />
          <MetricTile
            label={ar ? "جارية" : "In progress"}
            value={formatNumber(inProg)}
            icon={Clock}
            tone="blue"
            hint={ar ? "نشطة الآن" : "active now"}
          />
          <MetricTile
            label={ar ? "مهام جانبية منجزة" : "Side tasks done"}
            value={formatNumber(sideDone)}
            icon={Zap}
            tone="amber"
            hint={ar ? "× 1.5 نقاط" : "1.5× points"}
          />
          <MetricTile
            label={ar ? "إجمالي النقاط" : "Total points"}
            value={formatNumber(Math.round(totalPoints))}
            icon={Trophy}
            tone="emerald"
            hint={ar ? "كسبتها" : "earned"}
          />
        </section>

        {tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={ar ? "لا مهام بعد" : "No tasks yet"}
            description={ar ? "ابدأ بإضافة أول مهمة لكسب XP." : "Add your first task to start earning XP."}
            action={
              <Link href="/tasks/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "أضف مهمة" : "Add task"}
              </Link>
            }
          />
        ) : (
          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {grouped.map((g) => (
              <div key={g.status} className="space-y-2">
                <div className="flex items-center justify-between rounded-xl px-3 py-2"
                     style={{ background: "var(--brand-soft)" }}>
                  <span className="flex items-center gap-2 text-xs font-extrabold" style={{ color: "var(--brand-deep)" }}>
                    <span className={STATUS_TONE[g.status]}>{ar ? STATUS_AR[g.status] : g.status}</span>
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{g.items.length}</span>
                </div>
                <div className="space-y-2 stagger">
                  {g.items.map((t) => (
                    <div key={t.id} className="card card-hover card-pad">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-extrabold" style={{ color: "var(--text)" }}>{t.title}</h3>
                        {t.kind === "SIDE" ? <span className="badge-amber">{ar ? "جانبية" : "Side"} ⚡</span> : null}
                      </div>
                      {t.description ? (
                        <p className="mt-1 line-clamp-2 text-[12px]" style={{ color: "var(--text-muted)" }}>{t.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className={PRIO_TONE[t.priority]}>{ar ? PRIO_AR[t.priority] : t.priority}</span>
                        <span className="badge-slate">{t.module}</span>
                        <span className="badge-violet">+{Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1))} XP</span>
                        {t.dueAt ? <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{ar ? "حتى" : "due"} {formatShortDate(t.dueAt)}</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                        {STATUS_ORDER.filter((s) => s !== g.status).map((s) => (
                          <form key={s} action={setTaskStatus}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="status" value={s} />
                            <button type="submit" className="btn-ghost btn-sm">
                              {s === "DONE" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
                               s === "BLOCKED" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> :
                               <Clock className="h-3.5 w-3.5" />}
                              {ar ? STATUS_AR[s] : s}
                            </button>
                          </form>
                        ))}
                        <div className="ms-auto"><DeleteButton softDelete action={deleteTask} payload={{ id: t.id }} label={ar ? `حذف "${t.title}"` : `Delete "${t.title}"`} /></div>
                      </div>
                    </div>
                  ))}
                  {g.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-6 text-center text-[11px]"
                         style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      —
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}
      </PageContainer>
    </>
  );
}

function TasksHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-base font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--brand-soft)" }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="font-extrabold" style={{ color: "var(--brand-deep)" }}>{value}</div>
    </div>
  );
}
