import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatRelative, formatNumber, pickLocale } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = { DRAFT: "مسوّدة", ACTIVE: "قيد التنفيذ", DONE: "مكتمل", ABANDONED: "مُلغى", ROLLED_BACK: "تراجع" };

export default async function PlansPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    take: 40,
  });

  const active = plans.filter((p) => p.status === "ACTIVE").length;
  const done = plans.filter((p) => p.status === "DONE").length;
  const totalSteps = plans.reduce((a, p) => a + p.steps.length, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · مركز التخطيط" : "Brain · Planning Center"}
        title={ar ? "الخطط والإجراءات" : "Plans & Actions"}
        subtitle={ar ? "كل إشارة تستحق خطة. كل خطة تُتابع حتى الإغلاق." : "Every signal deserves a plan. Every plan tracked to closure."}
        status={`${formatNumber(active)} ${ar ? "نشطة" : "active"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الخطط" : "Total plans"} value={formatNumber(plans.length)} hint={ar ? "آخر ٤٠" : "last 40"} />
        <DaylightKpi label={ar ? "نشطة" : "Active"} value={formatNumber(active)} hint={ar ? "قيد التنفيذ" : "in progress"} delta={active > 0 ? { dir: "up", text: formatNumber(active) } : undefined} />
        <DaylightKpi label={ar ? "مكتملة" : "Completed"} value={formatNumber(done)} hint={ar ? "أنجزت" : "done"} delta={done > 0 ? { dir: "up", text: formatNumber(done) } : undefined} />
        <DaylightKpi label={ar ? "خطوات" : "Steps"} value={formatNumber(totalSteps)} hint={ar ? "إجمالي" : "total"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الخطط" : "Plans"} aside={ar ? "مرتبة حسب الأحدث" : "Newest first"}>
        {plans.length === 0 ? (
          <EmptyState icon={ClipboardList} title={ar ? "لا توجد خطط بعد" : "No plans yet"} description={ar ? "ولّد خطة من إشارة أو من جلسة المجلس." : "Generate a plan from a signal or council session."} />
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const doneSteps = plan.steps.filter((s) => s.status === "DONE").length;
              return (
                <div key={plan.id} className="prop-card">
                  <div className="flex items-center gap-2">
                    <span className="tag gold">{ar ? (STATUS_AR[plan.status] ?? plan.status) : plan.status}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{formatRelative(plan.createdAt, lc)}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-muted)", marginInlineStart: "auto", fontFamily: "monospace" }}>{doneSteps}/{plan.steps.length}</span>
                  </div>
                  <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{pickLocale(ar, plan.goal, plan.goalEn)}</h3>
                  {plan.steps.length > 0 ? (
                    <ol className="mt-2 space-y-1">
                      {plan.steps.map((step) => (
                        <li key={step.id} className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                          {step.status === "DONE" ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--emerald)" }} /> : <Circle className="h-3.5 w-3.5" style={{ color: "var(--ink-muted)" }} />}
                          <span>{step.action}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
