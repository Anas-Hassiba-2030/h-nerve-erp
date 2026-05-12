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
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { ExportMenu } from "@/components/ExportMenu";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { getCompanyBrand } from "@/lib/companyBrand";
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

  const brand = getCompanyBrand("AAU");

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
        <HeroPanel
          gradient={brand.gradient}
          accent={brand.accent}
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <CompanyLogo code="AAU" size={88} light />
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
                  <BookOpen className="h-3 w-3" />
                  {ar ? "حاضنة جامعية" : "University incubator"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "جامعة عمّان الأهلية" : "Al-Ahliyya Amman University"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "أول جامعة خاصة في الأردن منذ 1990 — رافد المجموعة بأفكار AgriTech و AI."
                    : "Jordan's first private university since 1990 — feeding the group with AgriTech & AI ideas."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <Link
                    href="/education/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#1d2680" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "تسجيل مشروع" : "Register program"}
                  </Link>
                  <ExportMenu type="education" companyCode="AAU" locale={lc} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <AauHeroStat label={ar ? "مشاريع" : "Programs"} value={formatNumber(programs.length)} icon={Rocket} />
              <AauHeroStat label={ar ? "تسريع" : "Accelerating"} value={formatNumber(accelerating)} icon={TrendingUp} />
              <AauHeroStat label={ar ? "تمويل" : "Funding"} value={formatMoney(totalFunding)} icon={Banknote} />
              <AauHeroStat label={ar ? "متخرجون" : "Graduated"} value={formatNumber(graduated)} icon={Sparkles} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "مشاريع مسجلة" : "Programs"}
            value={formatNumber(programs.length)}
            icon={Rocket}
            tone="violet"
            hint={ar ? `كوهورت 2026` : "Cohort 2026"}
          />
          <MetricTile
            label={ar ? "في طور التسريع" : "Accelerating"}
            value={formatNumber(accelerating)}
            icon={TrendingUp}
            tone="emerald"
            hint={ar ? "مشاريع نشطة" : "active programs"}
          />
          <MetricTile
            label={ar ? "تمويل تراكمي" : "Total funding"}
            value={formatMoney(totalFunding)}
            icon={Banknote}
            tone="amber"
            hint={`${formatNumber(graduated)} ${ar ? "متخرج" : "graduated"}`}
          />
          <MetricTile
            label={ar ? "المؤسسون والفرق" : "Founders & teams"}
            value={formatNumber(totalTeam)}
            icon={Users2}
            tone="blue"
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
              <Link href="/education/new" className="btn-primary hn-hover-shine">
                <Plus className="h-4 w-4" />
                {ar ? "تسجيل مشروع" : "Register program"}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 hn-stagger md:grid-cols-2 2xl:grid-cols-3">
            {programs.map((p) => {
              const vert = VERTICAL_LABEL[p.vertical] ?? VERTICAL_LABEL.OTHER;
              return (
                <article
                  key={p.id}
                  className="exec-card hn-anim-rise hn-hover-lift"
                  data-tone="violet"
                >
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className="text-[15px] font-black leading-tight"
                            style={{ color: "var(--text)" }}
                          >
                            {ar ? p.name : p.nameEn ?? p.name}
                          </h3>
                          <StatusBadge status={p.stage} />
                        </div>
                        {p.nameEn && ar ? (
                          <div
                            className="text-[10.5px] font-bold"
                            style={{ color: "var(--text-muted)" }}
                            dir="ltr"
                          >
                            {p.nameEn}
                          </div>
                        ) : null}
                        <div className="mt-1.5 text-[11px] font-bold">
                          <span style={{ color: "var(--text-muted)" }}>
                            {ar ? "المؤسس:" : "Founder:"}
                          </span>{" "}
                          <span style={{ color: "var(--text)" }}>{p.founder}</span>
                        </div>
                      </div>
                      <span className={vert.tone}>
                        {ar ? vert.ar : vert.en}
                      </span>
                    </div>

                    {p.description ? (
                      <p
                        className="line-clamp-3 text-[12px] font-medium leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {p.description}
                      </p>
                    ) : null}

                    <div
                      className="grid grid-cols-3 gap-2 rounded-lg p-2.5 text-center"
                      style={{
                        background: "var(--brand-soft)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <ProgStat label={ar ? "كوهورت" : "Cohort"} value={p.cohort} />
                      <ProgStat label={ar ? "تمويل" : "Funding"} value={formatMoney(p.fundingJod)} />
                      <ProgStat label={ar ? "الفريق" : "Team"} value={formatNumber(p.teamSize)} />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 px-4 py-2.5"
                    style={{ borderTop: "1px solid var(--border)" }}
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

function AauHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
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
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function ProgStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[9px] font-extrabold uppercase tracking-[0.1em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="exec-num mt-0.5 text-[14px] font-black"
        style={{ color: "var(--text)" }}
      >
        {value}
      </div>
    </div>
  );
}
