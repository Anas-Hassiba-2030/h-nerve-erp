
export const dynamic = "force-dynamic";
// /education — The Tank Incubator at Al-Ahliyya Amman University.
// AAU brand identity (indigo/violet gradient + university shield logo).
// Fully bilingual.

import Link from "next/link";
import {
  GraduationCap, Plus, Users2, Banknote, Rocket, TrendingUp,
  Sparkles, BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { ExportMenu } from "@/components/ExportMenu";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import { deleteProgram } from "./actions";

const VERTICAL_LABEL: Record<string, { ar: string; en: string; tone: string }> = {
  AI:        { ar: "ذكاء اصطناعي", en: "AI",        tone: "badge-violet" },
  FINTECH:   { ar: "تقنية مالية",   en: "Fintech",   tone: "badge-emerald" },
  ECOMMERCE: { ar: "تجارة إلكترونية", en: "E-commerce", tone: "badge-amber" },
  AGRITECH:  { ar: "زراعة ذكية",     en: "Agritech",  tone: "badge-emerald" },
  EDTECH:    { ar: "تعليم تقني",     en: "EdTech",    tone: "badge-blue" },
  OTHER:     { ar: "أخرى",          en: "Other",     tone: "badge-slate" },
};

export default async function EducationPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  const accelerating = programs.filter((p) => p.stage === "ACCELERATING").length;
  const graduated = programs.filter((p) => p.stage === "GRADUATED").length;
  const totalFunding = programs.reduce((acc, p) => acc + p.fundingJod, 0);
  const totalTeam = programs.reduce((acc, p) => acc + p.teamSize, 0);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "التعليم والأبحاث" : "Education & Research"}
        title={ar ? "حاضنة The Tank" : "The Tank Incubator"}
        subtitle={
          ar
            ? "بيت الشركات الناشئة لطلاب وخريجي جامعة عمّان الأهلية."
            : "Home of student & alumni startups at Al-Ahliyya Amman University."
        }
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "حاضنة The Tank · كوهورت 2026" : "The Tank incubator · Cohort 2026"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/education/new" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "تسجيل مشروع" : "Register program"}
            </Link>
            <ExportMenu type="education" companyCode="AAU" locale={lc} />
          </div>
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "مشاريع مسجلة" : "Programs"}
            raw={programs.length}
            kind="number"
            hint={ar ? "كوهورت 2026" : "Cohort 2026"}
          />
          <HeriKpi
            label={ar ? "في طور التسريع" : "Accelerating"}
            raw={accelerating}
            kind="number"
            accent="var(--heri-teal, #1f4e4a)"
            hint={ar ? "مشاريع نشطة" : "active programs"}
          />
          <HeriKpi
            label={ar ? "تمويل تراكمي" : "Total funding"}
            raw={totalFunding}
            kind="money"
            hint={`${formatNumber(graduated)} ${ar ? "متخرج" : "graduated"}`}
          />
          <HeriKpi
            label={ar ? "المؤسسون والفرق" : "Founders & teams"}
            raw={totalTeam}
            kind="number"
            hint={ar ? "أفراد" : "members"}
          />
        </section>

        {programs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={ar ? "لا توجد مشاريع في الحاضنة بعد" : "No programs in the incubator yet"}
            description={
              ar
                ? "ابدأ بتسجيل أول شركة ناشئة في كوهورت 2026."
                : "Register your first startup in cohort 2026."
            }
            action={
              <Link href="/education/new" className="heri-btn heri-btn-primary">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {ar ? "تسجيل مشروع" : "Register program"}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 heri-stagger md:grid-cols-2 2xl:grid-cols-3">
            {programs.map((p) => {
              const vert = VERTICAL_LABEL[p.vertical] ?? VERTICAL_LABEL.OTHER;
              return (
                <article
                  key={p.id}
                  className="heri-card"
                  data-tone="violet"
                >
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className="text-[15px] font-semibold leading-tight"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {ar ? p.name : p.nameEn ?? p.name}
                          </h3>
                          <StatusBadge status={p.stage} />
                        </div>
                        {p.nameEn && ar ? (
                          <div
                            className="text-[10.5px] font-bold"
                            style={{ color: "var(--heri-ink-3)" }}
                            dir="ltr"
                          >
                            {p.nameEn}
                          </div>
                        ) : null}
                        <div className="mt-1.5 text-[11px] font-bold">
                          <span style={{ color: "var(--heri-ink-3)" }}>
                            {ar ? "المؤسس:" : "Founder:"}
                          </span>{" "}
                          <span style={{ color: "var(--heri-ink)" }}>{p.founder}</span>
                        </div>
                      </div>
                      <span className={vert.tone}>
                        {ar ? vert.ar : vert.en}
                      </span>
                    </div>

                    {p.description ? (
                      <p
                        className="line-clamp-3 text-[12px] font-medium leading-relaxed"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {p.description}
                      </p>
                    ) : null}

                    <div
                      className="grid grid-cols-3 gap-2 p-2.5 text-center"
                      style={{
                        background: "var(--heri-cream-2)",
                        border: "1px solid var(--heri-rule)",
                      }}
                    >
                      <ProgStat label={ar ? "كوهورت" : "Cohort"} value={p.cohort} />
                      <ProgStat label={ar ? "تمويل" : "Funding"} value={formatMoney(p.fundingJod)} />
                      <ProgStat label={ar ? "الفريق" : "Team"} value={formatNumber(p.teamSize)} />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 px-4 py-2.5"
                    style={{ borderTop: "1px solid var(--heri-rule)" }}
                  >
                    <DeleteButton
                      action={deleteProgram}
                      payload={{ id: p.id }}
                      label={
                        ar
                          ? `حذف مشروع ${p.name}؟`
                          : `Delete program ${p.nameEn ?? p.name}?`
                      }
                      description={
                        ar
                          ? "سيتم حذف المشروع نهائياً من حاضنة The Tank."
                          : "This will permanently delete the program from The Tank."
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </>
  );
}


function ProgStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[9px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--heri-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="heri-number-mono mt-0.5 text-[14px] font-bold"
        style={{ color: "var(--heri-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
