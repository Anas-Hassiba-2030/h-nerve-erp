export const dynamic = "force-dynamic";
// /education — The Tank Incubator at Al-Ahliyya Amman University. Fully bilingual.

import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import { deleteProgram } from "./actions";
import "../daylight.css";

const VERTICAL_LABEL: Record<string, { ar: string; en: string }> = {
  AI: { ar: "ذكاء اصطناعي", en: "AI" },
  FINTECH: { ar: "تقنية مالية", en: "Fintech" },
  ECOMMERCE: { ar: "تجارة إلكترونية", en: "E-commerce" },
  AGRITECH: { ar: "زراعة ذكية", en: "Agritech" },
  EDTECH: { ar: "تعليم تقني", en: "EdTech" },
  OTHER: { ar: "أخرى", en: "Other" },
};

export default async function EducationPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const programs = await prisma.program.findMany({ orderBy: { createdAt: "desc" }, include: { company: true } });

  const accelerating = programs.filter((p) => p.stage === "ACCELERATING").length;
  const graduated = programs.filter((p) => p.stage === "GRADUATED").length;
  const totalFunding = programs.reduce((acc, p) => acc + p.fundingJod, 0);
  const totalTeam = programs.reduce((acc, p) => acc + p.teamSize, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "القطاعات · التعليم والأبحاث" : "Sectors · Education & Research"}
        title={ar ? "حاضنة The Tank" : "The Tank Incubator"}
        subtitle={ar ? "بيت الشركات الناشئة لطلاب وخريجي جامعة عمّان الأهلية — كوهورت ٢٠٢٦." : "Home of student & alumni startups at Al-Ahliyya Amman University — cohort 2026."}
        status={ar ? "كوهورت ٢٠٢٦" : "Cohort 2026"}
        actions={
          <>
            <Link href="/education/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "تسجيل مشروع" : "Register program"}</Link>
            <ExportMenu type="education" companyCode="AAU" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "مشاريع مسجلة" : "Programs"} value={formatNumber(programs.length)} hint={ar ? "كوهورت ٢٠٢٦" : "Cohort 2026"} />
        <DaylightKpi label={ar ? "في طور التسريع" : "Accelerating"} value={formatNumber(accelerating)} hint={ar ? "مشاريع نشطة" : "active"} delta={accelerating > 0 ? { dir: "up", text: formatNumber(accelerating) } : undefined} />
        <DaylightKpi label={ar ? "تمويل تراكمي" : "Total funding"} value={formatMoney(totalFunding)} hint={`${formatNumber(graduated)} ${ar ? "متخرج" : "graduated"}`} />
        <DaylightKpi label={ar ? "المؤسسون والفرق" : "Founders & teams"} value={formatNumber(totalTeam)} hint={ar ? "أفراد" : "members"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الشركات الناشئة" : "Startups"} aside={ar ? "محفظة الحاضنة" : "Incubator portfolio"}>
        {programs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={ar ? "لا توجد مشاريع في الحاضنة بعد" : "No programs in the incubator yet"}
            action={<Link href="/education/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "تسجيل مشروع" : "Register program"}</Link>}
          />
        ) : (
          <div className="prop-grid">
            {programs.map((p) => {
              const vert = VERTICAL_LABEL[p.vertical] ?? VERTICAL_LABEL.OTHER;
              return (
                <div key={p.id} className="prop-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? p.name : p.nameEn ?? p.name}</h3>
                        <StatusBadge status={p.stage} />
                      </div>
                      {p.nameEn && ar ? <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-muted)" }} dir="ltr">{p.nameEn}</div> : null}
                      <div className="mt-1.5" style={{ fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: "var(--ink-muted)" }}>{ar ? "المؤسس:" : "Founder:"}</span>{" "}<span style={{ color: "var(--ink)" }}>{p.founder}</span>
                      </div>
                    </div>
                    <span className="tag gold">{ar ? vert.ar : vert.en}</span>
                  </div>
                  {p.description ? <p style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.6, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p> : null}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center" style={{ background: "var(--ivory)", border: "1px solid var(--line)", borderRadius: 12, padding: 10 }}>
                    <ProgStat label={ar ? "كوهورت" : "Cohort"} value={p.cohort} />
                    <ProgStat label={ar ? "تمويل" : "Funding"} value={formatMoney(p.fundingJod)} />
                    <ProgStat label={ar ? "الفريق" : "Team"} value={formatNumber(p.teamSize)} />
                  </div>
                  <div className="mt-3 flex items-center justify-end" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    <DeleteButton action={deleteProgram} payload={{ id: p.id }} label={ar ? `حذف مشروع ${p.name}؟` : `Delete program ${p.nameEn ?? p.name}?`} description={ar ? "سيتم حذف المشروع نهائياً من حاضنة The Tank." : "This will permanently delete the program."} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}

function ProgStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
