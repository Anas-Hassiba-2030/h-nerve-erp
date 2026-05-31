import { Rocket, Plus } from "lucide-react";
import Link from "next/link";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const projects = await prisma.futureProject.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { company: true },
  });

  const totalBudget = projects.reduce((a, p) => a + p.budgetJod, 0);
  const active = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "RAMPING").length;
  const planned = projects.filter((p) => p.status === "PLANNED" || p.status === "INTAKE").length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية · النمو والتوسع" : "Finance · Growth & Expansion"}
        title={ar ? "المشاريع المستقبلية" : "Future Projects"}
        subtitle={ar ? "مبادرات النمو والتوسع المخطط لها عبر المجموعة." : "Planned growth and expansion initiatives across the group."}
        status={`${formatNumber(active)} ${ar ? "نشطة" : "active"}`}
        actions={<ExportMenu type="projects" locale={lc} />}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي المشاريع" : "Total projects"} value={formatNumber(projects.length)} hint={ar ? "في الأفق" : "in pipeline"} />
        <DaylightKpi label={ar ? "نشطة" : "Active"} value={formatNumber(active)} hint={ar ? "قيد التنفيذ" : "in progress"} delta={active > 0 ? { dir: "up", text: formatNumber(active) } : undefined} />
        <DaylightKpi label={ar ? "مخطط لها" : "Planned"} value={formatNumber(planned)} hint={ar ? "قادمة" : "upcoming"} />
        <DaylightKpi label={ar ? "إجمالي الميزانية" : "Total budget"} value={formatMoney(totalBudget)} hint={ar ? "مخصصة" : "allocated"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "المشاريع" : "Projects"} aside={ar ? "خط أنابيب النمو" : "Growth pipeline"}>
        {projects.length === 0 ? (
          <EmptyState icon={Rocket} title={ar ? "لا توجد مشاريع بعد" : "No projects yet"} description={ar ? "أضف مبادرة نمو مستقبلية." : "Add a future growth initiative."} />
        ) : (
          <div className="prop-grid">
            {projects.map((project) => {
              const pct = project.progressPct ?? 0;
              return (
                <div key={project.id} className="prop-card">
                  <StatusBadge status={project.status} />
                  <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? project.name : (project.nameEn ?? project.name)}</h3>
                  <p className="mt-1" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-muted)" }}>{ar ? project.description : (project.descriptionEn ?? project.description)}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                      <span>{ar ? "التقدم" : "Progress"}</span><span style={{ fontFamily: "monospace" }}>{pct}%</span>
                    </div>
                    <div className="dl-bar"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--ink-muted)" }}>{ar ? project.company.name : project.company.nameEn}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--ink)" }}>{formatMoney(project.budgetJod)}</span>
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
