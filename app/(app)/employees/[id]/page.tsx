import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Mail, Activity, Trophy, ListChecks, CheckCircle2,
  Clock, AlertTriangle, Zap,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import "../../daylight.css";
import { CompanyCover } from "@/components/CompanyCover";
import { RankBadge } from "@/components/RankBadge";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { BarChart } from "@/components/charts/BarChart";
import { prisma } from "@/lib/db";
import {
  formatNumber, formatRelative, formatShortDate,
  ROLES_AR, ROLES_EN, STATUS_AR, STATUS_EN, loc,
} from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { rankById, RANKS, progressToNext, nextRank } from "@/lib/gamification";

const STATUS_TONE: Record<string, string> = {
  TODO: "badge-slate", IN_PROGRESS: "badge-blue",
  DONE: "badge-emerald", BLOCKED: "badge-red",
};

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const ar = getLocale() === "ar";
  const lc = ar ? "ar" : "en";

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      achievements: { include: { achievement: true }, orderBy: { earnedAt: "desc" } },
    },
  });
  if (!user) notFound();

  const r = rankById(user.rank);
  const next = nextRank(user.xp);
  const progress = progressToNext(user.xp);

  const taskCounts = {
    todo: user.tasks.filter((t) => t.status === "TODO").length,
    inProgress: user.tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: user.tasks.filter((t) => t.status === "DONE").length,
    blocked: user.tasks.filter((t) => t.status === "BLOCKED").length,
  };
  const sideDone = user.tasks.filter((t) => t.status === "DONE" && t.kind === "SIDE").length;
  const totalPoints = user.tasks
    .filter((t) => t.status === "DONE")
    .reduce((a, t) => a + t.points * (t.kind === "SIDE" ? 1.5 : 1), 0);

  // Bar chart of tasks by module
  const moduleCounts = new Map<string, { done: number; total: number }>();
  for (const t of user.tasks) {
    const cur = moduleCounts.get(t.module) ?? { done: 0, total: 0 };
    cur.total++;
    if (t.status === "DONE") cur.done++;
    moduleCounts.set(t.module, cur);
  }
  const moduleData = [...moduleCounts.entries()].map(([k, v]) => ({
    label: k,
    value: v.done,
  }));
  const moduleBaseline = [...moduleCounts.values()].map((v) => v.total);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "ملف موظف" : "Employee profile"}
        title={user.name}
        subtitle={user.title ?? loc(ROLES_AR, ROLES_EN, lc, user.role)}
        actions={
          <Link href="/employees" className="dl-btn dl-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "كل الفريق" : "All employees"}
          </Link>
        }
      />

      <div className="space-y-6 p-6">
        {/* Hero with rank badge centered */}
        <CompanyCover
          code={user.company?.code ?? "HH"}
          eyebrow={loc(ROLES_AR, ROLES_EN, lc, user.role)}
          title={user.name}
          subtitle={user.title ?? "—"}
          metrics={[
            { label: "Rank", value: `${r.symbol} ${ar ? r.ar : r.en}` },
            { label: "XP", value: formatNumber(user.xp) },
            { label: ar ? "بونص" : "Bonus", value: `+${user.bonusPercent}%` },
          ]}
        />

        {/* Identity + rank progress */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <div className="card card-pad">
            <div className="section-title mb-3">{ar ? "الملف الشخصي" : "Profile"}</div>
            <div className="flex flex-col items-center gap-2 text-center">
              <RankBadge rank={user.rank as any} size="xl" showLabel={false} />
              <div className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                {ar ? r.ar : r.en}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                {ar ? r.description : r.descriptionEn}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label={ar ? "البريد الإلكتروني" : "Email"} value={
                <a href={`mailto:${user.email}`} dir="ltr" className="font-mono" style={{ color: "var(--gold)" }}>{user.email}</a>
              } />
              <Row label={ar ? "الشركة" : "Company"} value={user.company?.name ?? "—"} />
              <Row label={ar ? "الدور" : "Role"} value={loc(ROLES_AR, ROLES_EN, lc, user.role)} />
              <Row label={ar ? "تاريخ الانضمام" : "Joined"} value={formatShortDate(user.createdAt, lc)} />
              <Row label={ar ? "آخر دخول" : "Last login"} value={formatRelative(user.lastLoginAt, lc)} />
              <Row label={ar ? "تسجيلات الدخول" : "Login count"} value={formatNumber(user.loginCount)} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <div className="section-title">{ar ? "تقدم الرتبة" : "Rank progress"}</div>
              <span className="text-[11px] font-mono" style={{ color: "var(--ink-muted)" }}>
                {formatNumber(user.xp)} XP
              </span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {RANKS.map((rank) => {
                const reached = user.xp >= rank.minXp;
                const isCurrent = rank.id === user.rank;
                return (
                  <div
                    key={rank.id}
                    className={`relative flex flex-col items-center gap-1 rounded-xl p-3 text-center ${isCurrent ? "shadow-glow" : ""}`}
                    style={{
                      background: reached ? "var(--cream)" : "transparent",
                      border: `1px solid ${isCurrent ? rank.color : "var(--line)"}`,
                    }}
                  >
                    {isCurrent ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--gold)] px-1.5 text-[8px] font-bold text-[#1a0e02]">
                        {ar ? "الآن" : "NOW"}
                      </span>
                    ) : null}
                    <div
                      className="text-3xl"
                      style={{
                        color: reached ? rank.color : "var(--ink-muted)",
                        opacity: reached ? 1 : 0.4,
                      }}
                    >
                      {rank.symbol}
                    </div>
                    <div className="text-[11px] font-semibold" style={{ color: "var(--ink)" }}>
                      {ar ? rank.ar : rank.en}
                    </div>
                    <div className="font-mono text-[9px]" style={{ color: "var(--ink-muted)" }}>
                      {rank.minXp} XP
                    </div>
                  </div>
                );
              })}
            </div>
            {next ? (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span style={{ color: "var(--ink-muted)" }}>
                    {ar ? `إلى رتبة ${next.ar}` : `Toward ${next.en}`}
                  </span>
                  <span className="font-mono" style={{ color: "var(--gold)" }}>
                    {formatNumber(progress.current)} / {formatNumber(progress.needed)} XP
                  </span>
                </div>
                <div className="bar"><div className="bar-fill" style={{ width: `${progress.pct * 100}%` }} /></div>
              </div>
            ) : (
              <div className="mt-4 alert-success">
                {ar ? "لقد بلغت أعلى رتبة في النظام — ملك ♚" : "You've reached the highest rank — King ♚"}
              </div>
            )}
          </div>
        </div>

        {/* Activity KPIs */}
        <DaylightKpiGrid>
          <DaylightKpi
            label={ar ? "للتنفيذ" : "Todo"}
            value={formatNumber(taskCounts.todo)}
          />
          <DaylightKpi
            label={ar ? "جارية" : "In progress"}
            value={formatNumber(taskCounts.inProgress)}
          />
          <DaylightKpi
            label={ar ? "منجزة" : "Done"}
            value={formatNumber(taskCounts.done)}
            hint={ar ? `بونص ${sideDone} مهمة جانبية` : `Plus ${sideDone} side tasks`}
          />
          <DaylightKpi
            label={ar ? "نقاط مكتسبة" : "Points earned"}
            value={formatNumber(totalPoints)}
          />
        </DaylightKpiGrid>

        {/* Activity bar chart by module */}
        {moduleData.length > 0 ? (
          <section className="card card-pad">
            <div className="card-title mb-2">
              {ar ? "النشاط حسب الوحدة" : "Activity by module"}
            </div>
            <div className="card-sub mb-4">
              {ar ? "المهام المنجزة (الأمامي) مقابل إجمالي المهام (الخلفي)" : "Done tasks (front) vs total tasks (back)"}
            </div>
            <BarChart
              data={moduleData}
              baseline={moduleBaseline}
              height={220}
              showValues
            />
          </section>
        ) : null}

        {/* Achievements + Tasks */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{ar ? "الإنجازات المكتسبة" : "Earned badges"}</div>
                <div className="card-sub">
                  {user.achievements.length} {ar ? "إنجاز" : "badges"}
                </div>
              </div>
              <Trophy className="h-4 w-4" style={{ color: "var(--gold)" }} />
            </div>
            <div className="space-y-2 p-5">
              {user.achievements.length === 0 ? (
                <div className="text-sm" style={{ color: "var(--ink-muted)" }}>
                  {ar ? "لا توجد إنجازات بعد." : "No badges yet."}
                </div>
              ) : (
                user.achievements.slice(0, 8).map((ua) => (
                  <div
                    key={ua.id}
                    className="flex items-center gap-3 rounded-xl p-2.5"
                    style={{ background: "var(--cream)" }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "var(--heri-cream)", color: "var(--gold)" }}
                    >
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                        {ar ? ua.achievement.name : ua.achievement.nameEn}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                        {ua.achievement.description}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--ink-muted)" }}>
                      {formatRelative(ua.earnedAt, lc)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{ar ? "المهام الحديثة" : "Recent tasks"}</div>
                <div className="card-sub">{formatNumber(user.tasks.length)} {ar ? "إجمالي" : "total"}</div>
              </div>
              <ListChecks className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
            </div>
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {user.tasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {t.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={STATUS_TONE[t.status]}>{loc(STATUS_AR, STATUS_EN, lc, t.status)}</span>
                      {t.kind === "SIDE" ? <span className="badge-amber">⚡ {ar ? "جانبية" : "Side"}</span> : null}
                      <span className="badge-violet">+{Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1))} XP</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    {t.dueAt ? formatShortDate(t.dueAt, lc) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DaylightShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd className="font-bold" style={{ color: "var(--ink)" }}>{value}</dd>
    </div>
  );
}
