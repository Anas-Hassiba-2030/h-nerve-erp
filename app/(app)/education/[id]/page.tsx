import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Banknote,
  Users2,
  Rocket,
  Sparkles,
  Calendar,
  ChevronsRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  ar,
  formatMoney,
  formatNumber,
  STATUS_AR,
  VERTICALS_AR,
  STATUS_EN,
  VERTICALS_EN,
  loc,
} from "@/lib/utils";

const STAGE_FLOW = ["INTAKE", "ACCELERATING", "GRADUATED"] as const;

const VERTICAL_TONE: Record<string, string> = {
  AI: "badge-violet",
  FINTECH: "badge-emerald",
  ECOMMERCE: "badge-amber",
  AGRITECH: "badge-emerald",
  EDTECH: "badge-blue",
  OTHER: "badge-slate",
};

export default async function EducationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const program = await prisma.program.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!program) notFound();

  const related = await prisma.program.findMany({
    where: {
      companyId: program.companyId,
      id: { not: program.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const stageIdx = STAGE_FLOW.indexOf(program.stage as (typeof STAGE_FLOW)[number]);
  const stalled = program.stage === "STALLED";

  const pinned = await isPinned("PROGRAM", program.id);

  const en = getLocale() === "en";

  return (
    <>
      <PageHeader
        eyebrow={en ? "The Tank Incubator" : "حاضنة The Tank"}
        title={en ? (program.nameEn ?? program.name) : program.name}
        subtitle={
          program.nameEn ??
          `${en ? "Led by" : "بقيادة"} ${program.founder} • ${en ? "Cohort" : "فوج"} ${program.cohort}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/education" className="heri-btn heri-btn-ghost" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {en ? "Programs" : "البرامج"}
            </Link>
            <PinButton
              entityType="PROGRAM"
              entityId={program.id}
              label={program.name}
              labelEn={program.nameEn ?? undefined}
              href={`/education/${program.id}`}
              icon="GraduationCap"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <PageContainer>
        {/* Hero strip — Heritage Modern cream plinth */}
        <section className="heri-hero" style={{ padding: "20px 24px" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={VERTICAL_TONE[program.vertical] ?? "badge-slate"}>
                  {loc(VERTICALS_AR, VERTICALS_EN, getLocale(), program.vertical)}
                </span>
                <StatusBadge status={program.stage} />
                <Link
                  href={`/companies/${program.companyId}`}
                  className="heri-pill heri-pill-info"
                  style={{ textDecoration: "none" }}
                >
                  {program.company.name}
                </Link>
              </div>
              <h2
                className="mt-2"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: "clamp(22px,2vw,30px)",
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                  letterSpacing: "-0.012em",
                  lineHeight: 1.15,
                }}
              >
                {en ? (program.nameEn ?? program.name) : program.name}
              </h2>
              {program.nameEn ? (
                <p
                  className="mt-1"
                  dir="ltr"
                  style={{ fontSize: 12.5, color: "var(--heri-ink-3)" }}
                >
                  {program.nameEn}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 heri-number-mono" style={{ fontSize: 11.5, color: "var(--heri-ink-3)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  {program.founder}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  {en ? "Cohort" : "فوج"} {program.cohort}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  {formatNumber(program.teamSize)} {en ? "members" : "فرد"}
                </span>
              </div>
            </div>
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center"
              style={{
                background: "var(--heri-cream-2)",
                border: "1px solid var(--heri-rule-strong)",
                color: "var(--heri-ochre)",
              }}
            >
              <Rocket className="h-8 w-8" strokeWidth={1.4} />
            </div>
          </div>
        </section>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-3">
          <HeriKpi
            label={en ? "Funding" : "التمويل"}
            raw={program.fundingJod}
            kind="money"
            hint={`${en ? "Cohort" : "فوج"} ${program.cohort}`}
          />
          <HeriKpi
            label={en ? "Team Size" : "حجم الفريق"}
            raw={program.teamSize}
            kind="number"
            hint={en ? "members" : "أفراد"}
          />
          <HeriKpi
            label={en ? "Completion Rate" : "نسبة الإنجاز"}
            raw={stalled ? 0 : (Math.max(0, stageIdx + 1) / STAGE_FLOW.length)}
            kind="percent"
            accent={stalled ? "var(--heri-terracotta)" : "var(--heri-teal)"}
            hint={loc(STATUS_AR, STATUS_EN, getLocale(), program.stage)}
          />
        </section>

        {/* Stage progression */}
        <section className="heri-card">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Journey" : "المسيرة"}</div>
              <h3
                className="mt-1 flex items-center gap-2"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                }}
              >
                <ChevronsRight className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                {en ? "Startup Journey" : "مسيرة المشروع"}
              </h3>
            </div>
            {stalled ? <span className="heri-pill heri-pill-critical">{en ? "Stalled" : "متعثر"}</span> : null}
          </header>

          {stalled ? (
            <p className="text-xs" style={{ color: "var(--heri-ink-3)" }}>
              {en
                ? "The startup is stalled — it needs intervention from the incubator team to get back on track."
                : "المشروع في حالة تعثر — يحتاج تدخل من فريق الحاضنة لإعادته للمسار."}
            </p>
          ) : (
            <div className="relative flex items-center justify-between gap-2">
              {STAGE_FLOW.map((stage, i) => {
                const reached = stageIdx >= 0 && i <= stageIdx;
                const isCurrent = i === stageIdx;
                return (
                  <div
                    key={stage}
                    className="relative flex flex-1 flex-col items-center"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center heri-number-mono"
                      style={{
                        background: reached
                          ? "var(--heri-ochre)"
                          : "var(--heri-cream-2)",
                        border: `1px solid ${reached ? "var(--heri-ochre)" : "var(--heri-rule-strong)"}`,
                        color: reached ? "var(--heri-ink)" : "var(--heri-ink-3)",
                        fontSize: 16,
                        fontWeight: 600,
                        transform: isCurrent ? "scale(1.08)" : undefined,
                        transition: "transform .25s var(--ease-out-quart)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      className="mt-2 text-center text-[11px] font-semibold"
                      style={{
                        color: reached ? "var(--heri-ink)" : "var(--heri-ink-3)",
                      }}
                    >
                      {loc(STATUS_AR, STATUS_EN, getLocale(), stage)}
                    </div>
                    {i < STAGE_FLOW.length - 1 ? (
                      <div
                        className="absolute top-6"
                        style={{
                          insetInlineStart: "calc(50% + 1.5rem)",
                          width: "calc(100% - 3rem)",
                          height: "1px",
                          background:
                            stageIdx >= 0 && i < stageIdx
                              ? "var(--heri-ochre)"
                              : "var(--heri-rule)",
                          transition: "background .6s ease",
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px] heri-stagger">
          <div className="space-y-6">
            {program.description ? (
              <section className="heri-card">
                <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Overview" : "نظرة عامة"}</div>
                <h3
                  className="mt-1 mb-2"
                  style={{
                    fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--heri-ink)",
                  }}
                >
                  {en ? "The Startup at a Glance" : "المشروع باختصار"}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {program.description}
                </p>
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className="heri-card">
                <header className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Peer Programs" : "برامج زميلة"}</div>
                    <h3
                      className="mt-1 flex items-center gap-2"
                      style={{
                        fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--heri-ink)",
                      }}
                    >
                      <GraduationCap className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                      {en ? "Under the Same Umbrella" : "من نفس المظلة"}
                    </h3>
                  </div>
                  <Link
                    href="/education"
                    className="heri-eyebrow"
                    style={{ color: "var(--heri-ochre)", textDecoration: "none" }}
                  >
                    {en ? "All Programs ←" : "كل البرامج ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {related.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <Link
                        href={`/education/${r.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-semibold"
                            style={{ color: "var(--heri-ink)", fontSize: 13 }}
                          >
                            {en ? (r.nameEn ?? r.name) : r.name}
                          </span>
                          <span className={VERTICAL_TONE[r.vertical] ?? "badge-slate"}>
                            {loc(VERTICALS_AR, VERTICALS_EN, getLocale(), r.vertical)}
                          </span>
                        </div>
                        <div
                          className="heri-number-mono mt-0.5"
                          style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                        >
                          {r.founder} • {en ? "Cohort" : "فوج"} {r.cohort} • {formatNumber(r.teamSize)} {en ? "members" : "فرد"}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span
                          className="heri-number-mono font-semibold"
                          style={{ color: "var(--heri-ink)", fontSize: 12 }}
                        >
                          {formatMoney(r.fundingJod)}
                        </span>
                        <StatusBadge status={r.stage} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="heri-card">
              <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Profile" : "البطاقة"}</div>
              <h3
                className="mt-1 mb-3"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                }}
              >
                {en ? "Startup Profile" : "بطاقة المشروع"}
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Founder" : "المؤسس"} value={program.founder} />
                <Fact label={en ? "Vertical" : "القطاع"} value={loc(VERTICALS_AR, VERTICALS_EN, getLocale(), program.vertical)} />
                <Fact label={en ? "Stage" : "المرحلة"} value={loc(STATUS_AR, STATUS_EN, getLocale(), program.stage)} />
                <Fact label={en ? "Cohort" : "الفوج"} value={program.cohort} />
                <Fact label={en ? "Team Size" : "حجم الفريق"} value={`${formatNumber(program.teamSize)} ${en ? "members" : "فرد"}`} />
                <Fact label={en ? "Funding" : "التمويل"} value={formatMoney(program.fundingJod)} />
                <Fact
                  label={en ? "University Umbrella" : "مظلة الجامعة"}
                  value={en ? (program.company.nameEn ?? program.company.name) : program.company.name}
                  link={`/companies/${program.companyId}`}
                />
              </dl>
            </section>
          </aside>
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
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className="text-end font-semibold"
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
