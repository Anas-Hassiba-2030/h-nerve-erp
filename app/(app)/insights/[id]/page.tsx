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
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatRelative,
  formatDateTime,
  severityAr,
} from "@/lib/utils";
import { rankById } from "@/lib/gamification";

const SEVERITY_ICON: Record<string, typeof Sparkles> = {
  CRITICAL: AlertTriangle,
  WARN: AlertTriangle,
  OPPORTUNITY: Lightbulb,
  INFO: Sparkles,
};

// Heritage palette — single inline-start rail per severity instead of a
// neon gradient. Matches the insight cards on /insights.
const SEVERITY_RAIL: Record<string, string> = {
  CRITICAL:    "var(--heri-terracotta)",
  WARN:        "var(--heri-ochre-2)",
  OPPORTUNITY: "var(--heri-teal)",
  INFO:        "var(--heri-copper)",
};
const SEVERITY_PILL: Record<string, "critical" | "warn" | "success" | "info"> = {
  CRITICAL: "critical",
  WARN: "warn",
  OPPORTUNITY: "success",
  INFO: "info",
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
  const rail = SEVERITY_RAIL[insight.severity] ?? SEVERITY_RAIL.INFO;
  const pillTone = SEVERITY_PILL[insight.severity] ?? "info";
  const pinned = await isPinned("INSIGHT", insight.id);

  return (
    <>
      <PageHeader
        eyebrow="إشارات الذكاء"
        title={insight.title}
        subtitle={`${MODULE_AR[insight.module] ?? insight.module} • ${severityAr(insight.severity)}`}
      />

      <PageContainer>
        <div className="heri-stagger space-y-6">
          {/* Back rail + pin */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/insights"
              className="heri-focusable inline-flex items-center gap-2"
              style={{
                fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--heri-copper)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
              العودة إلى الإشارات
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

          {/* Heritage hero plinth — single severity rail, cream surface, no neon */}
          <section
            className="heri-hero relative"
            style={{ padding: "28px 32px" }}
          >
            <span
              aria-hidden
              className="absolute top-0 bottom-0"
              style={{ insetInlineStart: 0, width: 3, background: rail }}
            />
            <div className="ms-2 flex flex-wrap items-start gap-5">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center"
                style={{
                  color: rail,
                  border: "1px solid var(--heri-rule-strong)",
                  background: "var(--heri-cream-2)",
                }}
              >
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <HeritagePill tone={pillTone}>
                    {severityAr(insight.severity)}
                  </HeritagePill>
                  <HeritagePill tone="neutral">
                    {MODULE_AR[insight.module] ?? insight.module}
                  </HeritagePill>
                  <StatusBadge status={insight.status} />
                </div>
                <h2
                  className="mt-3"
                  style={{
                    fontSize: "clamp(22px, 2.6vw, 34px)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.005em",
                    fontWeight: 600,
                    color: "var(--heri-ink)",
                    textWrap: "balance" as any,
                  }}
                >
                  {insight.title}
                </h2>
                <div
                  className="mt-3 flex flex-wrap items-center gap-3"
                  style={{
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "var(--heri-ink-3)",
                    textTransform: "uppercase",
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" strokeWidth={1.5} />
                    {formatRelative(insight.createdAt)}
                  </span>
                  {insight.author ? (
                    <>
                      <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                      <Link
                        href={`/users/${insight.author.id}`}
                        className="heri-focusable inline-flex items-center gap-1.5"
                        style={{ color: "var(--heri-copper)", textDecoration: "none" }}
                      >
                        <UserIcon className="h-3 w-3" strokeWidth={1.5} />
                        {insight.author.name}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Two columns */}
          <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
            <div className="space-y-6">
              {/* Body */}
              <section className="heri-card">
                <h3
                  className="mb-3 flex items-center gap-2 heri-eyebrow"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  <Brain className="h-3.5 w-3.5" style={{ color: "var(--heri-ochre)" }} strokeWidth={1.5} />
                  التحليل الكامل
                </h3>
                <div
                  className="measure whitespace-pre-line"
                  style={{ color: "var(--heri-ink)", fontSize: 14, lineHeight: 1.65 }}
                >
                  {insight.body}
                </div>
              </section>

              {/* Related */}
              {related.length > 0 ? (
                <section className="heri-card">
                  <header className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 heri-eyebrow" style={{ color: "var(--heri-ink-3)" }}>
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--heri-ochre)" }} strokeWidth={1.5} />
                      إشارات أخرى من {MODULE_AR[insight.module] ?? insight.module}
                    </h3>
                    <Link
                      href="/insights"
                      className="heri-focusable"
                      style={{
                        fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        color: "var(--heri-copper)",
                        textDecoration: "none",
                        textTransform: "uppercase",
                      }}
                    >
                      كل الإشارات ←
                    </Link>
                  </header>
                  <ul className="space-y-2 heri-stagger">
                    {related.map((r) => {
                      const rRail = SEVERITY_RAIL[r.severity] ?? SEVERITY_RAIL.INFO;
                      const rPill = SEVERITY_PILL[r.severity] ?? "info";
                      return (
                        <li key={r.id}>
                          <Link
                            href={`/insights/${r.id}`}
                            className="heri-focusable block relative"
                            style={{
                              background: "var(--heri-cream)",
                              border: "1px solid var(--heri-rule)",
                              textDecoration: "none",
                              padding: "10px 14px 10px 16px",
                            }}
                          >
                            <span
                              aria-hidden
                              className="absolute top-0 bottom-0"
                              style={{ insetInlineStart: 0, width: 2, background: rRail }}
                            />
                            <div className="flex items-center gap-2">
                              <HeritagePill tone={rPill}>{severityAr(r.severity)}</HeritagePill>
                              <span
                                className="truncate"
                                style={{ color: "var(--heri-ink)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}
                              >
                                {r.title}
                              </span>
                            </div>
                            <p
                              className="mt-1 line-clamp-2"
                              style={{ color: "var(--heri-ink-2)", fontSize: 12, lineHeight: 1.5 }}
                            >
                              {r.body}
                            </p>
                            <div
                              className="mt-1"
                              style={{
                                fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                                fontSize: 10,
                                letterSpacing: "0.08em",
                                color: "var(--heri-ink-3)",
                                textTransform: "uppercase",
                              }}
                            >
                              {formatRelative(r.createdAt)}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="space-y-6">
              {/* Author card */}
              {insight.author ? (
                <section className="heri-card">
                  <h3 className="mb-3 heri-eyebrow" style={{ color: "var(--heri-ink-3)" }}>
                    ناشر الإشارة
                  </h3>
                  <Link
                    href={`/users/${insight.author.id}`}
                    className="heri-focusable flex items-center gap-3 p-2 transition"
                    style={{ textDecoration: "none" }}
                  >
                    {(() => {
                      const r = rankById(insight.author.rank);
                      return (
                        <div
                          className="rank-piece"
                          style={{ color: r.color }}
                          title={r.ar}
                        >
                          {r.symbol}
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate"
                        style={{ color: "var(--heri-ink)", fontSize: 13, fontWeight: 600 }}
                      >
                        {insight.author.name}
                      </div>
                      <div
                        style={{
                          color: "var(--heri-ink-3)",
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                          marginTop: 2,
                        }}
                      >
                        {insight.author.role} · {insight.author.xp} XP
                      </div>
                    </div>
                  </Link>
                </section>
              ) : null}

              {/* Meta */}
              <section className="heri-card">
                <h3
                  className="mb-3 flex items-center gap-2 heri-eyebrow"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--heri-ochre)" }} strokeWidth={1.5} />
                  البطاقة
                </h3>
                <dl className="space-y-2" style={{ fontSize: 12 }}>
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
      </PageContainer>
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
    <div
      className="flex items-center justify-between pb-1.5 last:border-b-0"
      style={{ borderBottom: "1px solid var(--heri-rule)" }}
    >
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className="text-end"
        style={{ color: "var(--heri-ink)", fontWeight: 600 }}
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
