import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Building2,
  Trophy,
  ListChecks,
  Wallet,
  Brain,
  Sparkles,
  Clock,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import {
  ar,
  formatMoney,
  formatNumber,
  formatRelative,
  formatShortDate,
  ROLES_AR,
  ROLES_EN,
  loc,
} from "@/lib/utils";
import {
  RANKS,
  rankFor,
  rankById,
  nextRank,
  progressToNext,
} from "@/lib/gamification";
import { getCompanyBrand } from "@/lib/companyBrand";

const TIER_TONE: Record<string, string> = {
  BRONZE: "badge-amber",
  SILVER: "badge-slate",
  GOLD: "badge-gold",
  PLATINUM: "badge-violet",
};

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

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      avatarColor: true,
      rank: true,
      xp: true,
      bonusPercent: true,
      loginCount: true,
      lastLoginAt: true,
      createdAt: true,
      companyId: true,
      company: {
        select: { id: true, name: true, code: true, sector: true },
      },
    },
  });
  if (!user) notFound();

  const [
    achievements,
    earnedAchievements,
    taskCounts,
    recentTasks,
    transactions,
    forecasts,
    insights,
  ] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { threshold: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { assigneeId: user.id },
      _count: true,
    }),
    prisma.task.findMany({
      where: { assigneeId: user.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { createdById: user.id },
      orderBy: { occurredAt: "desc" },
      take: 6,
      include: { company: { select: { name: true, code: true } } },
    }),
    prisma.supplyForecast.findMany({
      where: { generatedById: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        source: { select: { name: true, code: true } },
        target: { select: { name: true, code: true } },
      },
    }),
    prisma.aIInsight.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const xp = user.xp ?? 0;
  const currentRank = rankFor(xp);
  const next = nextRank(xp);
  const progress = progressToNext(xp);

  const earnedIds = new Set(
    earnedAchievements.map((e) => e.achievementId)
  );
  const earnedCount = earnedIds.size;
  const totalCount = achievements.length;

  const tasksByStatus: Record<string, number> = {};
  let totalTasks = 0;
  for (const g of taskCounts) {
    tasksByStatus[g.status] = g._count;
    totalTasks += g._count;
  }
  const doneTasks = tasksByStatus["DONE"] ?? 0;
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const brand = user.company ? getCompanyBrand(user.company.code) : null;

  const en = getLocale() === "en";

  return (
    <>
      <Topbar
        eyebrow={en ? "Employee Profile" : "ملف الموظف"}
        title={user.name}
        subtitle={user.title ?? loc(ROLES_AR, ROLES_EN, getLocale(), user.role)}
        actions={
          <Link href="/users" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            {en ? "Team" : "الفريق"}
          </Link>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{
            background: brand
              ? brand.gradient
              : "linear-gradient(135deg, #0a4d3a 0%, #15846a 50%, #c69345 110%)",
            color: "white",
            minHeight: "200px",
          }}
        >
          <div
            className="absolute inset-0 opacity-20 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            {/* Big rank piece */}
            <div className="flex flex-col items-center gap-2 anim-pop">
              <div
                className="rank-piece rank-piece-xl"
                style={{ color: currentRank.color, filter: "drop-shadow(0 4px 14px rgba(0,0,0,.2))" }}
                title={en ? currentRank.en : currentRank.ar}
              >
                {currentRank.symbol}
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                  {currentRank.en}
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,.2)" }}
                >
                  {en ? currentRank.en : currentRank.ar}
                </div>
              </div>
            </div>

            {/* Identity */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {loc(ROLES_AR, ROLES_EN, getLocale(), user.role)}
                </span>
                {user.company ? (
                  <Link
                    href={`/companies/${user.company.id}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {user.company.name}
                  </Link>
                ) : null}
              </div>
              <h2 className="mt-1 text-3xl font-bold" style={{ letterSpacing: "-0.01em" }}>
                {user.name}
              </h2>
              {user.title ? (
                <p className="text-sm opacity-90">{user.title}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono"
                  style={{
                    background: "rgba(255,255,255,.18)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                  dir="ltr"
                >
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                {user.lastLoginAt ? (
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Clock className="h-3 w-3" />
                    {en ? "Last login" : "آخر دخول"} {formatRelative(user.lastLoginAt)}
                  </span>
                ) : null}
              </div>

              {/* XP progress */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold opacity-95">
                  <span>
                    <span className="font-mono text-sm">
                      {formatNumber(xp)}
                    </span>{" "}
                    XP
                  </span>
                  {next ? (
                    <span>
                      {en ? "Next" : "التالي"}:{" "}
                      <span style={{ color: "white" }}>{en ? next.en : next.ar}</span> (
                      {formatNumber(next.minXp - xp)} XP)
                    </span>
                  ) : (
                    <span>{en ? "Top rank 👑" : "أعلى رتبة 👑"}</span>
                  )}
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,.2)" }}
                >
                  <div
                    className="h-full rounded-full anim-rise-glow"
                    style={{
                      width: `${Math.round(progress.pct * 100)}%`,
                      background:
                        "linear-gradient(90deg, white 0%, rgba(255,255,255,.7) 100%)",
                      boxShadow: "0 0 18px rgba(255,255,255,.6)",
                      transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Rank ladder */}
            <div className="grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-1">
              {RANKS.map((r) => {
                const reached = xp >= r.minXp;
                const isCurrent = r.id === currentRank.id;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 transition"
                    style={{
                      background: isCurrent
                        ? "rgba(255,255,255,.25)"
                        : reached
                          ? "rgba(255,255,255,.1)"
                          : "transparent",
                      border: isCurrent
                        ? "1px solid rgba(255,255,255,.5)"
                        : "1px solid transparent",
                      opacity: reached ? 1 : 0.4,
                    }}
                    title={`${en ? r.en : r.ar} — ${formatNumber(r.minXp)} XP`}
                  >
                    <span
                      className="text-lg"
                      style={{
                        color: r.color,
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,.2))",
                      }}
                    >
                      {r.symbol}
                    </span>
                    <span className="text-[10px] font-bold opacity-95">
                      {en ? r.en : r.ar}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={en ? "Experience Points" : "نقاط الخبرة"}
            value={formatNumber(xp)}
            icon={Sparkles}
            tone="violet"
            hint={en ? currentRank.en : currentRank.ar}
          />
          <KpiCard
            label={en ? "Rank Bonus" : "بونص الرتبة"}
            value={`+${user.bonusPercent}٪`}
            icon={Award}
            tone="amber"
          />
          <KpiCard
            label={en ? "Badges" : "الأوسمة"}
            value={`${earnedCount}/${totalCount}`}
            icon={Trophy}
            tone="emerald"
            hint={
              totalCount > 0
                ? `${Math.round((earnedCount / totalCount) * 100)}٪ ${en ? "complete" : "إكمال"}`
                : undefined
            }
          />
          <KpiCard
            label={en ? "Task Completion" : "إنجاز المهام"}
            value={`${completionRate}٪`}
            icon={CheckCircle2}
            tone={completionRate >= 60 ? "emerald" : "amber"}
            hint={`${formatNumber(doneTasks)} ${en ? "of" : "من"} ${formatNumber(totalTasks)}`}
          />
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            {/* Tasks */}
            {recentTasks.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <ListChecks
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    {en ? "Tasks" : "المهام"}
                  </h3>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    {formatNumber(totalTasks)} {en ? "total" : "إجمالي"}
                  </span>
                </header>

                {/* Status mini-chips */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {Object.entries(tasksByStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background:
                          "color-mix(in srgb, var(--heri-ochre) 8%, transparent)",
                        border:
                          "1px solid color-mix(in srgb, var(--heri-ochre) 18%, transparent)",
                        color: "var(--heri-ink)",
                      }}
                    >
                      {(en ? TASK_STATUS_EN[status] : TASK_STATUS_AR[status]) ?? status}: {formatNumber(count)}
                    </span>
                  ))}
                </div>

                <ul className="divide-y divide-[var(--heri-rule)]">
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
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {t.title}
                          </span>
                          <span
                            className={
                              t.kind === "SIDE"
                                ? "badge-violet"
                                : "badge-emerald"
                            }
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
                          style={{ color: "var(--heri-ink-3)" }}
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
              </section>
            ) : null}

            {/* Recent insights */}
            {insights.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <Sparkles
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    {en ? "Published Signals" : "إشارات منشورة"}
                  </h3>
                  <Link
                    href="/insights"
                    className="text-[11px] font-bold"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    {en ? "View all ←" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {insights.map((ins) => (
                    <li
                      key={ins.id}
                      className="py-2"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ins.severity} />
                        <span
                          className="truncate text-sm font-bold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {ins.title}
                        </span>
                      </div>
                      <div
                        className="mt-0.5 text-[11px]"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {ins.module} • {formatRelative(ins.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Achievements */}
            {achievements.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <Trophy
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    {en ? "Badges" : "الأوسمة"}
                  </h3>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    {earnedCount}/{totalCount}
                  </span>
                </header>
                <div className="grid grid-cols-4 gap-2">
                  {achievements.slice(0, 12).map((a) => {
                    const earned = earnedIds.has(a.id);
                    return (
                      <div
                        key={a.id}
                        className={`relative flex aspect-square items-center justify-center rounded-xl text-lg ${
                          earned ? "anim-pop" : ""
                        }`}
                        style={{
                          background: earned
                            ? "linear-gradient(135deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)"
                            : "color-mix(in srgb, var(--heri-ink-3) 12%, transparent)",
                          color: earned ? "white" : "var(--heri-ink-3)",
                          boxShadow: earned
                            ? "0 8px 24px -8px var(--heri-ochre)"
                            : undefined,
                          opacity: earned ? 1 : 0.5,
                        }}
                        title={`${a.name} (${a.tier})`}
                      >
                        <Trophy className="h-4 w-4" />
                      </div>
                    );
                  })}
                </div>
                {earnedAchievements.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {earnedAchievements.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span
                          className="truncate font-bold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {e.achievement.name}
                        </span>
                        <span
                          className={
                            TIER_TONE[e.achievement.tier] ?? "badge-slate"
                          }
                        >
                          {e.achievement.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Recent forecasts */}
            {forecasts.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <Brain
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    {en ? "Published Forecasts" : "توقعات منشورة"}
                  </h3>
                </header>
                <ul className="space-y-1.5">
                  {forecasts.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-lg px-2 py-1.5 text-[11px]"
                      style={{
                        background: "color-mix(in srgb, var(--heri-ochre) 5%, transparent)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="truncate font-bold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {f.productLabel}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "var(--heri-ink-3)" }}>
                          {Math.round(f.confidence * 100)}٪
                        </span>
                      </div>
                      <div
                        className="font-mono text-[10px]"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {f.source.code} → {f.target.code}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Recent transactions created */}
            {transactions.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <Wallet
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    {en ? "Transactions" : "حركات مالية"}
                  </h3>
                </header>
                <ul className="space-y-1.5">
                  {transactions.map((t) => {
                    const isIncome = t.kind === "INCOME" || t.kind === "REVENUE";
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div
                            className="truncate font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {t.description ?? t.category}
                          </div>
                          <div
                            className="font-mono text-[10px]"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {t.company.code} • {formatShortDate(t.occurredAt)}
                          </div>
                        </div>
                        <span
                          className="font-mono font-bold"
                          style={{ color: isIncome ? "#0a8e54" : "#c0392b" }}
                        >
                          {isIncome ? "+" : "−"}
                          {formatMoney(t.amount, t.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Quick facts */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <Building2
                  className="h-4 w-4"
                  style={{ color: "var(--heri-ochre)" }}
                />
                {en ? "Employment Card" : "البطاقة الوظيفية"}
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Role" : "الدور"} value={loc(ROLES_AR, ROLES_EN, getLocale(), user.role)} />
                {user.title ? (
                  <Fact label={en ? "Job Title" : "المسمى الوظيفي"} value={user.title} />
                ) : null}
                {user.company ? (
                  <Fact
                    label={en ? "Company" : "الشركة"}
                    value={user.company.name}
                    link={`/companies/${user.company.id}`}
                  />
                ) : null}
                <Fact label={en ? "Login Count" : "مرات الدخول"} value={formatNumber(user.loginCount)} />
                <Fact
                  label={en ? "Last Login" : "آخر دخول"}
                  value={
                    user.lastLoginAt ? formatRelative(user.lastLoginAt) : "—"
                  }
                />
                <Fact
                  label={en ? "Member Since" : "منذ"}
                  value={formatShortDate(user.createdAt)}
                />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--heri-ink)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--heri-ochre)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
