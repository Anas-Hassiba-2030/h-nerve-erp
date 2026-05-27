import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Brain,
  Lightbulb,
  Clock,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatRelative,
  formatDateTime,
  severityAr,
  severityBadge,
} from "@/lib/utils";
import { rankById } from "@/lib/gamification";

const SEVERITY_ICON: Record<string, typeof Sparkles> = {
  CRITICAL: AlertTriangle,
  WARN: AlertTriangle,
  OPPORTUNITY: Lightbulb,
  INFO: Sparkles,
};

const SEVERITY_GRADIENT: Record<string, string> = {
  CRITICAL: "linear-gradient(135deg, #7a1f1f 0%, #b91c1c 50%, #fca5a5 110%)",
  WARN: "linear-gradient(135deg, #5a3a1f 0%, #b06a1a 50%, #f5b341 110%)",
  OPPORTUNITY:
    "linear-gradient(135deg, #1a3a40 0%, #0a8e54 50%, #c69345 110%)",
  INFO: "linear-gradient(135deg, #1a2940 0%, #2c4869 50%, #6996c8 110%)",
};

const MODULE_AR: Record<string, string> = {
  HOSPITALITY: "الضيافة",
  DAIRY: "الألبان",
  AGRICULTURE: "الزراعة",
  EDUCATION: "التعليم",
  FINANCE: "المالية",
  SUPPLY: "سلسلة التوريد",
  MARKETS: "الأسواق",
  SUSTAINABILITY: "الاستدامة",
  PEOPLE: "الفريق",
  GENERAL: "عام",
};

export default async function InsightDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const insight = await prisma.aIInsight.findUnique({
    where: { id: params.id },
    include: {
      author: {
        select: { id: true, name: true, role: true, rank: true, xp: true },
      },
    },
  });
  if (!insight) notFound();

  const related = await prisma.aIInsight.findMany({
    where: {
      module: insight.module,
      id: { not: insight.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const Icon = SEVERITY_ICON[insight.severity] ?? Sparkles;
  const gradient =
    SEVERITY_GRADIENT[insight.severity] ?? SEVERITY_GRADIENT.INFO;
  const pinned = await isPinned("INSIGHT", insight.id);

  return (
    <>
      <Topbar
        eyebrow="إشارات الذكاء"
        title={insight.title}
        subtitle={`${MODULE_AR[insight.module] ?? insight.module} • ${severityAr(insight.severity)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/insights" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              الإشارات
            </Link>
            <PinButton
              entityType="INSIGHT"
              entityId={insight.id}
              label={insight.title}
              href={`/insights/${insight.id}`}
              icon="Sparkles"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{ background: gradient, color: "white", minHeight: "180px" }}
        >
          <div
            className="absolute inset-0 opacity-20 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl anim-pop"
                style={{
                  background: "rgba(255,255,255,.15)",
                  border: "1px solid rgba(255,255,255,.35)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Icon className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={severityBadge(insight.severity)}>
                    {severityAr(insight.severity)}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {MODULE_AR[insight.module] ?? insight.module}
                  </span>
                  <StatusBadge status={insight.status} />
                </div>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                  {insight.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Clock className="h-3 w-3" />
                    {formatRelative(insight.createdAt)}
                  </span>
                  {insight.author ? (
                    <Link
                      href={`/users/${insight.author.id}`}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition hover:bg-white/30"
                      style={{
                        background: "rgba(255,255,255,.15)",
                        border: "1px solid rgba(255,255,255,.25)",
                      }}
                    >
                      <UserIcon className="h-3 w-3" />
                      {insight.author.name}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Body */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <Brain className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
                التحليل الكامل
              </h3>
              <div
                className="whitespace-pre-line text-sm leading-relaxed"
                style={{ color: "var(--heri-ink)" }}
              >
                {insight.body}
              </div>
            </section>

            {/* Related */}
            {related.length > 0 ? (
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
                    إشارات أخرى من{" "}
                    {MODULE_AR[insight.module] ?? insight.module}
                  </h3>
                  <Link
                    href="/insights"
                    className="text-[11px] font-bold"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    كل الإشارات ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {related.map((r, i) => (
                    <li
                      key={r.id}
                      className="py-2 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/insights/${r.id}`}
                        className="block hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span className={severityBadge(r.severity)}>
                            {severityAr(r.severity)}
                          </span>
                          <span
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {r.title}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 line-clamp-2 text-[11px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {r.body}
                        </p>
                        <div
                          className="mt-1 text-[10px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {formatRelative(r.createdAt)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Author card */}
            {insight.author ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  ناشر الإشارة
                </h3>
                <Link
                  href={`/users/${insight.author.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--heri-cream-2)]"
                >
                  {(() => {
                    const r = rankById(insight.author.rank);
                    return (
                      <div
                        className="rank-piece anim-pop"
                        style={{ color: r.color }}
                        title={r.ar}
                      >
                        {r.symbol}
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {insight.author.name}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {insight.author.role} •{" "}
                      <span className="font-mono">
                        {insight.author.xp} XP
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            ) : null}

            {/* Meta */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <CheckCircle2
                  className="h-4 w-4"
                  style={{ color: "var(--heri-ochre)" }}
                />
                البطاقة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact
                  label="الوحدة"
                  value={MODULE_AR[insight.module] ?? insight.module}
                />
                <Fact label="الخطورة" value={severityAr(insight.severity)} />
                <Fact label="الحالة" value={insight.status} />
                <Fact label="نُشرت" value={formatDateTime(insight.createdAt)} />
                <Fact
                  label="آخر تحديث"
                  value={formatRelative(insight.updatedAt)}
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
