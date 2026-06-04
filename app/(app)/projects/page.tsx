import { Rocket, Plus } from "lucide-react";
import Link from "next/link";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STAGE_AR: Record<string, string> = {
  IDEA: "فكرة", RESEARCH: "أبحاث", PLANNED: "مخطط", APPROVED: "معتمد",
  IN_PROGRESS: "قيد التنفيذ", ON_HOLD: "معلّق", DONE: "مكتمل",
};
const PRIORITY_AR: Record<string, string> = { LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجل" };

export default async function ProjectsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const projects = await prisma.futureProject.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { company: true },
  });

  const totalBudget = projects.reduce((a, p) => a + p.budgetJod, 0);
  const inProgress = projects.filter((p) => p.stage === "IN_PROGRESS").length;
  const urgent = projects.filter((p) => p.priority === "URGENT").length;
  const avgProgress = projects.length ? projects.reduce((a, p) => a + p.progressPct, 0) / projects.length : 0;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية · النمو والتوسع" : "Finance · Growth & Expansion"}
        title={ar ? "المشاريع المستقبلية" : "Future Projects"}
        subtitle={ar ? "كل توسعة أو استثمار أو منتج جديد قيد التخطيط — منظّمة حسب الشركة." : "Every planned expansion, investment, or product — grouped by owning company."}
        status={`${formatNumber(inProgress)} ${ar ? "نشطة" : "active"}`}
        actions={<ExportMenu type="projects" locale={lc} />}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي المشاريع" : "Total projects"} value={formatNumber(projects.length)} hint={ar ? "كل المراحل" : "all stages"} />
        <DaylightKpi label={ar ? "قيد التنفيذ" : "In progress"} value={formatNumber(inProgress)} hint={ar ? "نشطة الآن" : "active now"} delta={inProgress > 0 ? { dir: "up", text: formatNumber(inProgress) } : undefined} />
        <DaylightKpi label={ar ? "عاجلة" : "Urgent"} value={formatNumber(urgent)} hint={ar ? "أولوية قصوى" : "top priority"} delta={urgent > 0 ? { dir: "down", text: formatNumber(urgent) } : undefined} />
        <DaylightKpi label={ar ? "إجمالي الميزانية" : "Total budget"} value={formatMoney(totalBudget)} hint={`${avgProgress.toFixed(0)}% ${ar ? "متوسط" : "avg"}`} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "المشاريع" : "Projects"} aside={ar ? "خط أنابيب النمو" : "Growth pipeline"}>
        {projects.length === 0 ? (
          <EmptyState icon={Rocket} title={ar ? "لا توجد مشاريع بعد" : "No projects yet"} description={ar ? "أضف مبادرة نمو مستقبلية." : "Add a future growth initiative."} action={<Link href="/projects/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" />{ar ? "مشروع جديد" : "New project"}</Link>} />
        ) : (
          <div className="prop-grid">
            {projects.map((p) => (
              <div key={p.id} className="prop-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag gold">{ar ? (STAGE_AR[p.stage] ?? p.stage) : p.stage}</span>
                  <span className="tag" style={{ color: p.priority === "URGENT" ? "var(--brick)" : "var(--ink-muted)", background: "var(--ivory)" }}>{ar ? (PRIORITY_AR[p.priority] ?? p.priority) : p.priority}</span>
                </div>
                <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{p.title}</h3>
                {p.description ? <p className="mt-1" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p> : null}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    <span>{ar ? "التقدم" : "Progress"}</span><span style={{ fontFamily: "monospace" }}>{p.progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="dl-bar"><i style={{ width: `${p.progressPct}%` }} /></div>
                </div>
                <div className="mt-3 flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--ink-muted)" }}>{ar ? p.company.name : p.company.nameEn}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--ink)" }}>{formatMoney(p.budgetJod)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
