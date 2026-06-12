import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Users2,
  Rocket,
  Calendar,
  ChevronsRight,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PinButton } from "@/components/ui/PinButton";
import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import {
  formatMoney,
  formatNumber,
  STATUS_AR,
  VERTICALS_AR,
  STATUS_EN,
  VERTICALS_EN,
  loc,
} from "@/lib/utils/utils";
import "../../daylight.css";

const STAGE_FLOW = ["INTAKE", "ACCELERATING", "GRADUATED"] as const;

const VERTICAL_TONE: Record<string, string> = {
  AI: "badge-violet",
  FINTECH: "badge-emerald",
  ECOMMERCE: "badge-amber",
  AGRITECH: "badge-emerald",
  EDTECH: "badge-blue",
  OTHER: "badge-slate",
};

export default async function EducationDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
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

  const locale = await getLocale();
  const en = locale === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "The Tank Incubator" : "حاضنة The Tank"}
        title={en ? (program.nameEn ?? program.name) : program.name}
        subtitle={
          program.nameEn ??
          `${en ? "Led by" : "بقيادة"} ${program.founder} • ${en ? "Cohort" : "فوج"} ${program.cohort}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/education" className="dl-btn dl-btn-secondary" style={{ fontSize: 13 }}>
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

      <div className="flex-1 space-y-6 p-6">
        {/* Hero strip */}
        <section className="panel reveal" style={{ padding: "20px 24px" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={VERTICAL_TONE[program.vertical] ?? "badge-slate"}>
                  {loc(VERTICALS_AR, VERTICALS_EN, locale, program.vertical)}
                </span>
                <StatusBadge status={program.stage} />
                <Link
                  href={`/companies/${program.companyId}`}
                  className="hover:underline"
                  style={{ fontSize: 12, color: "var(--gold)", textDecoration: "none" }}
                >
                  {program.company.name}
                </Link>
              </div>
              <h2
                className="mt-2"
                style={{
                  fontSize: "clamp(22px,2vw,30px)",
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.012em",
                  lineHeight: 1.15,
                }}
              >
                {en ? (program.nameEn ?? program.name) : program.name}
              </h2>
              {program.nameEn ? (
                <p className="mt-1" dir="ltr" style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                  {program.nameEn}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3" style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                  {program.founder}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                  {en ? "Cohort" : "فوج"} {program.cohort}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                  {formatNumber(program.teamSize)} {en ? "members" : "فرد"}
                </span>
              </div>
            </div>
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center"
              style={{
                background: "var(--cream)",
                border: "1px solid var(--line)",
                color: "var(--gold)",
              }}
            >
              <Rocket className="h-8 w-8" strokeWidth={1.4} />
            </div>
          </div>
        </section>

        {/* KPI band */}
        <DaylightKpiGrid>
          <DaylightKpi
            label={en ? "Funding" : "التمويل"}
            value={formatMoney(program.fundingJod)}
            hint={`${en ? "Cohort" : "فوج"} ${program.cohort}`}
          />
          <DaylightKpi
            label={en ? "Team Size" : "حجم الفريق"}
            value={formatNumber(program.teamSize)}
            hint={en ? "members" : "أفراد"}
          />
          <DaylightKpi
            label={en ? "Completion Rate" : "نسبة الإنجاز"}
            value={stalled ? "0%" : `${Math.round(Math.max(0, stageIdx + 1) / STAGE_FLOW.length * 100)}%`}
            hint={loc(STATUS_AR, STATUS_EN, locale, program.stage)}
          />
        </DaylightKpiGrid>

        {/* Stage progression */}
        <DaylightPanel
          title={en ? "Startup Journey" : "مسيرة المشروع"}
          aside={
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>
              {en ? "Journey" : "المسيرة"}
            </span>
          }
        >
          {stalled ? (
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
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
                      className="flex h-12 w-12 items-center justify-center font-mono"
                      style={{
                        background: reached ? "var(--gold)" : "var(--cream)",
                        border: `1px solid ${reached ? "var(--gold)" : "var(--line)"}`,
                        color: reached ? "var(--ink)" : "var(--ink-muted)",
                        fontSize: 16,
                        fontWeight: 600,
                        borderRadius: 8,
                        transform: isCurrent ? "scale(1.08)" : undefined,
                        transition: "transform .25s ease",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      className="mt-2 text-center text-[11px] font-semibold"
                      style={{ color: reached ? "var(--ink)" : "var(--ink-muted)" }}
                    >
                      {loc(STATUS_AR, STATUS_EN, locale, stage)}
                    </div>
                    {i < STAGE_FLOW.length - 1 ? (
                      <div
                        className="absolute top-6"
                        style={{
                          insetInlineStart: "calc(50% + 1.5rem)",
                          width: "calc(100% - 3rem)",
                          height: "1px",
                          background: stageIdx >= 0 && i < stageIdx ? "var(--gold)" : "var(--line)",
                          transition: "background .6s ease",
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DaylightPanel>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {program.description ? (
              <DaylightPanel title={en ? "The Startup at a Glance" : "المشروع باختصار"}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                  {program.description}
                </p>
              </DaylightPanel>
            ) : null}

            {related.length > 0 ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {en ? "Under the Same Umbrella" : "من نفس المظلة"}
                  </span>
                }
                aside={
                  <Link href="/education" style={{ color: "var(--gold)", textDecoration: "none", fontSize: 11.5 }}>
                    {en ? "All Programs ←" : "كل البرامج ←"}
                  </Link>
                }
              >
                <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
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
                          <span className="truncate font-semibold" style={{ color: "var(--ink)", fontSize: 13 }}>
                            {en ? (r.nameEn ?? r.name) : r.name}
                          </span>
                          <span className={VERTICAL_TONE[r.vertical] ?? "badge-slate"}>
                            {loc(VERTICALS_AR, VERTICALS_EN, locale, r.vertical)}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono" style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>
                          {r.founder} • {en ? "Cohort" : "فوج"} {r.cohort} • {formatNumber(r.teamSize)} {en ? "members" : "فرد"}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono" style={{ color: "var(--ink)", fontSize: 12 }}>
                          {formatMoney(r.fundingJod)}
                        </span>
                        <StatusBadge status={r.stage} />
                      </div>
                    </li>
                  ))}
                </ul>
              </DaylightPanel>
            ) : null}
          </div>

          <aside className="space-y-6">
            <DaylightPanel title={en ? "Startup Profile" : "بطاقة المشروع"}>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Founder" : "المؤسس"} value={program.founder} />
                <Fact label={en ? "Vertical" : "القطاع"} value={loc(VERTICALS_AR, VERTICALS_EN, locale, program.vertical)} />
                <Fact label={en ? "Stage" : "المرحلة"} value={loc(STATUS_AR, STATUS_EN, locale, program.stage)} />
                <Fact label={en ? "Cohort" : "الفوج"} value={program.cohort} />
                <Fact label={en ? "Team Size" : "حجم الفريق"} value={`${formatNumber(program.teamSize)} ${en ? "members" : "فرد"}`} />
                <Fact label={en ? "Funding" : "التمويل"} value={formatMoney(program.fundingJod)} />
                <Fact
                  label={en ? "University Umbrella" : "مظلة الجامعة"}
                  value={en ? (program.company.nameEn ?? program.company.name) : program.company.name}
                  link={`/companies/${program.companyId}`}
                />
              </dl>
            </DaylightPanel>
          </aside>
        </div>
      </div>
    </DaylightShell>
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
    <div className="flex items-center justify-between border-b pb-1.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd className="text-end font-semibold" style={{ color: "var(--ink)" }}>
        {link ? (
          <Link href={link} className="hover:underline" style={{ color: "var(--gold)" }}>
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
