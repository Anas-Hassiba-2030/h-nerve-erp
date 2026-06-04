// /workspace/pipeline — future-projects pipeline for this company.

import { redirect } from "next/navigation";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/StatusBadge";
import "../../daylight.css";
import { advanceProjectStage, updateProjectBudget } from "../actions";
import { getUserIfRole } from "@/lib/auth/authz";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils/utils";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["IDEA", "EVALUATION", "APPROVED", "IN_PROGRESS", "LIVE"];
const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
  IDEA: { ar: "فكرة", en: "Idea" },
  EVALUATION: { ar: "تقييم", en: "Evaluation" },
  APPROVED: { ar: "معتمد", en: "Approved" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  LIVE: { ar: "مُطلق", en: "Live" },
};

export default async function WorkspacePipelinePage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  // W6 — STAFF see the pipeline read-only; only MANAGER+ may edit.
  const canMutate = !!(await getUserIfRole("MANAGER"));

  const projects = await prisma.futureProject.findMany({
    orderBy: { budgetJod: "desc" },
  });
  const totalBudget = projects.reduce((a, p) => a + (p.budgetJod ?? 0), 0);
  const byStage = STAGE_ORDER.map((s) => ({
    stage: s,
    label: STAGE_LABEL[s] ?? { ar: s, en: s },
    items: projects.filter((p) => p.stage === s),
  })).filter((c) => c.items.length > 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "خط المشاريع" : "Pipeline"}
        title={ar ? "مراحل المشاريع" : "Project stages"}
        subtitle={ar ? "خط مشاريع هذه الوحدة فقط" : "This unit's pipeline only"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي المشاريع" : "Total projects"} value={formatNumber(projects.length)} />
        <DaylightKpi label={ar ? "إجمالي الميزانية" : "Total budget"} value={formatMoney(totalBudget)} />
        <DaylightKpi label={ar ? "قيد التنفيذ" : "In progress"} value={formatNumber(projects.filter((p) => p.stage === "IN_PROGRESS").length)} />
        <DaylightKpi label={ar ? "أولوية عالية" : "High priority"} value={formatNumber(projects.filter((p) => p.priority === "HIGH").length)} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "مراحل المشاريع" : "Project stages"} aside={ar ? "خط مشاريع هذه الوحدة فقط" : "This unit's pipeline only"}>
        {projects.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
            {ar ? "لا مشاريع مستقبلية مسجّلة." : "No future projects recorded."}
          </p>
        ) : (
          <div className="ws-board">
            {byStage.map((col) => (
              <div key={col.stage} className="ws-board-col">
                <header className="ws-board-col-head">
                  <span>{ar ? col.label.ar : col.label.en}</span>
                  <span className="ws-board-col-count">{col.items.length}</span>
                </header>
                <div className="ws-board-col-body">
                  {col.items.map((p) => (
                    <div key={p.id} className="ws-board-card">
                      <div className="ws-board-card-title">{p.title}</div>
                      <div className="ws-board-card-meta">
                        <span className="ws-mono">
                          {p.startQuarter ?? "—"} → {p.targetQuarter ?? "—"}
                        </span>
                      </div>
                      <div className="ws-board-card-foot">
                        <span className={`tag ${p.priority === "HIGH" ? "gold" : p.priority === "MEDIUM" ? "gold" : "ok"}`} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                          {p.priority}
                        </span>
                        <span className="ws-mono">{formatMoney(p.budgetJod)}</span>
                      </div>
                      {canMutate ? (
                        <>
                          <form action={updateProjectBudget} className="ws-budget-form">
                            <input type="hidden" name="id" value={p.id} />
                            <span className="ws-budget-cur">JOD</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              name="budget"
                              defaultValue={Math.round(p.budgetJod)}
                              className="ws-budget-input ws-mono"
                              aria-label={ar ? "ميزانية المشروع" : "Project budget"}
                            />
                            <button type="submit" className="dl-btn dl-btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
                              {ar ? "حفظ" : "Save"}
                            </button>
                          </form>
                          {p.stage !== "LIVE" ? (
                            <form action={advanceProjectStage} className="ws-act-form">
                              <input type="hidden" name="id" value={p.id} />
                              <button type="submit" className="dl-btn dl-btn-primary" style={{ fontSize: 12, padding: "4px 10px" }}>
                                {ar ? "تقديم المرحلة" : "Advance stage"}
                                <span aria-hidden>{ar ? " ←" : " →"}</span>
                              </button>
                            </form>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
