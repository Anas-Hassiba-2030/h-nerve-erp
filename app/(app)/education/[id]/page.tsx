import Link from "next/link";
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
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
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
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

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

  const brand = getCompanyBrand(program.company.code);
  const pinned = await isPinned("PROGRAM", program.id);

  return (
    <>
      <Topbar
        eyebrow="حاضنة The Tank"
        title={program.name}
        subtitle={
          program.nameEn ?? `بقيادة ${program.founder} • فوج ${program.cohort}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/education" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              البرامج
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
        {/* Brand cover */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white anim-fade-up"
          style={{ background: brand.gradient, minHeight: "180px" }}
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
                <Rocket className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={VERTICAL_TONE[program.vertical] ?? "badge-slate"}
                  >
                    {ar(VERTICALS_AR, program.vertical)}
                  </span>
                  <StatusBadge status={program.stage} />
                  <Link
                    href={`/companies/${program.companyId}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {program.company.name}
                  </Link>
                </div>
                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                  {program.name}
                </h2>
                {program.nameEn ? (
                  <p className="text-sm opacity-90" dir="ltr">
                    {program.nameEn}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Users2 className="h-3 w-3" />
                    {program.founder}
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Calendar className="h-3 w-3" />
                    فوج {program.cohort}
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Users2 className="h-3 w-3" />
                    {formatNumber(program.teamSize)} فرد
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="التمويل"
            value={formatMoney(program.fundingJod)}
            icon={Banknote}
            tone="amber"
          />
          <KpiCard
            label="حجم الفريق"
            value={formatNumber(program.teamSize)}
            icon={Users2}
            tone="indigo"
          />
          <KpiCard
            label="القطاع"
            value={ar(VERTICALS_AR, program.vertical)}
            icon={Sparkles}
            tone="violet"
          />
          <KpiCard
            label="المرحلة"
            value={ar(STATUS_AR, program.stage)}
            icon={Rocket}
            tone={stalled ? "red" : "emerald"}
          />
        </section>

        {/* Stage progression */}
        <section className="card card-pad anim-fade-up">
          <header className="mb-4 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-extrabold"
              style={{ color: "var(--text)" }}
            >
              <ChevronsRight
                className="h-4 w-4"
                style={{ color: "var(--brand)" }}
              />
              مسيرة المشروع
            </h3>
            {stalled ? <span className="badge-red">متعثر</span> : null}
          </header>

          {stalled ? (
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              المشروع في حالة تعثر — يحتاج تدخل من فريق الحاضنة لإعادته للمسار.
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
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black transition ${
                        reached ? "anim-pop" : ""
                      }`}
                      style={{
                        background: reached
                          ? "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)"
                          : "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                        color: reached ? "white" : "var(--text-muted)",
                        transform: isCurrent ? "scale(1.1)" : undefined,
                        boxShadow: isCurrent
                          ? "0 14px 36px -10px var(--brand)"
                          : undefined,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      className="mt-2 text-center text-[11px] font-bold"
                      style={{
                        color: reached ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      {ar(STATUS_AR, stage)}
                    </div>
                    {i < STAGE_FLOW.length - 1 ? (
                      <div
                        className="absolute top-6"
                        style={{
                          insetInlineStart: "calc(50% + 1.5rem)",
                          width: "calc(100% - 3rem)",
                          height: "2px",
                          background:
                            stageIdx >= 0 && i < stageIdx
                              ? "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)"
                              : "color-mix(in srgb, var(--text-muted) 18%, transparent)",
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
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {program.description ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  نظرة عامة
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text)" }}
                >
                  {program.description}
                </p>
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    <GraduationCap
                      className="h-4 w-4"
                      style={{ color: "var(--brand)" }}
                    />
                    برامج زميلة
                  </h3>
                  <Link
                    href="/education"
                    className="text-[11px] font-bold"
                    style={{ color: "var(--brand)" }}
                  >
                    كل البرامج ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {related.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/education/${r.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {r.name}
                          </span>
                          <span
                            className={
                              VERTICAL_TONE[r.vertical] ?? "badge-slate"
                            }
                          >
                            {ar(VERTICALS_AR, r.vertical)}
                          </span>
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {r.founder} • فوج {r.cohort} •{" "}
                          {formatNumber(r.teamSize)} فرد
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: "var(--text)" }}
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
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                بطاقة المشروع
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="المؤسس" value={program.founder} />
                <Fact
                  label="القطاع"
                  value={ar(VERTICALS_AR, program.vertical)}
                />
                <Fact
                  label="المرحلة"
                  value={ar(STATUS_AR, program.stage)}
                />
                <Fact label="الفوج" value={program.cohort} />
                <Fact
                  label="حجم الفريق"
                  value={`${formatNumber(program.teamSize)} فرد`}
                />
                <Fact
                  label="التمويل"
                  value={formatMoney(program.fundingJod)}
                />
                <Fact
                  label="مظلة الجامعة"
                  value={program.company.name}
                  link={`/companies/${program.companyId}`}
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
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--text)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--brand)" }}
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
