// /workspace/pipeline — future-projects pipeline for this company.

import { redirect } from "next/navigation";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { StatusBadge } from "@/components/StatusBadge";
import { advanceProjectStage, updateProjectBudget } from "../actions";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils";

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
    <div className="ws-page">
      <section className="ws-stat-row">
        <St label={ar ? "إجمالي المشاريع" : "Total projects"} v={formatNumber(projects.length)} />
        <St label={ar ? "إجمالي الميزانية" : "Total budget"} v={formatMoney(totalBudget)} />
        <St label={ar ? "قيد التنفيذ" : "In progress"} v={formatNumber(projects.filter((p) => p.stage === "IN_PROGRESS").length)} />
        <St label={ar ? "أولوية عالية" : "High priority"} v={formatNumber(projects.filter((p) => p.priority === "HIGH").length)} />
      </section>

      <HeritageSection
        eyebrow={ar ? "خط مشاريع هذه الوحدة فقط" : "This unit's pipeline only"}
        title={ar ? "مراحل المشاريع" : "Project stages"}
      >
        {projects.length === 0 ? (
          <div className="ws-empty">
            {ar ? "لا مشاريع مستقبلية مسجّلة." : "No future projects recorded."}
          </div>
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
                        <HeritagePill
                          tone={
                            p.priority === "HIGH"
                              ? "critical"
                              : p.priority === "MEDIUM"
                                ? "warn"
                                : "neutral"
                          }
                        >
                          {p.priority}
                        </HeritagePill>
                        <span className="ws-mono">{formatMoney(p.budgetJod)}</span>
                      </div>
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
                        <button type="submit" className="ws-act ws-act-ghost">
                          {ar ? "حفظ" : "Save"}
                        </button>
                      </form>
                      {p.stage !== "LIVE" ? (
                        <form action={advanceProjectStage} className="ws-act-form">
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="ws-act">
                            {ar ? "تقديم المرحلة" : "Advance stage"}
                            <span aria-hidden>{ar ? " ←" : " →"}</span>
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </HeritageSection>
    </div>
  );
}

function St({ label, v }: { label: string; v: string }) {
  return (
    <div className="ws-stat">
      <div className="ws-stat-label">{label}</div>
      <div className="ws-stat-value">{v}</div>
    </div>
  );
}
