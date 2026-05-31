import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatRelative, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const plans = await prisma.plan.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { company: true, insight: true, steps: { orderBy: { order: "asc" } } },
    take: 40,
  });

  const active = plans.filter((p) => p.status === "EXECUTED" || p.status === "RAMPING");
  const done = plans.filter((p) => p.status === "DONE");

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · مركز التخطيط" : "Brain · Planning Center"}
        title={ar ? "الخطط والإجراءات" : "Plans & Actions"}
        subtitle={ar ? "خطط العمل المولّدة من إشارات الدماغ." : "Action plans generated from brain signals."}
        status={`${formatNumber(active.length)} ${ar ? "نشطة" : "active"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الخطط" : "Total plans"} value={formatNumber(plans.length)} hint={ar ? "آخر ٤٠" : "last 40"} />
        <DaylightKpi label={ar ? "نشطة" : "Active"} value={formatNumber(active.length)} hint={ar ? "قيد التنفيذ" : "in progress"} delta={active.length > 0 ? { dir: "up", text: formatNumber(active.length) } : undefined} />
        <DaylightKpi label={ar ? "مكتملة" : "Completed"} value={formatNumber(done.length)} hint={ar ? "أنجزت" : "done"} delta={done.length > 0 ? { dir: "up", text: formatNumber(done.length) } : undefined} />
        <DaylightKpi label={ar ? "خطوات" : "Steps"} value={formatNumber(plans.reduce((a, p) => a + p.steps.length, 0))} hint={ar ? "إجمالي" : "total"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الخطط" : "Plans"} aside={ar ? "مرتبة حسب الأحدث" : "Newest first"}>
        {plans.length === 0 ? (
          <EmptyState icon={ClipboardList} title={ar ? "لا توجد خطط بعد" : "No plans yet"} description={ar ? "أنشئ خطة من إشارة قابلة للتنفيذ." : "Create a plan from an actionable signal."} />
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="prop-card">
                <div className="flex items-center gap-2">
                  <StatusBadge status={plan.status} />
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{formatRelative(plan.createdAt, lc)}</span>
                </div>
                <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? plan.title : (plan.titleEn ?? plan.title)}</h3>
                {plan.steps.length > 0 ? (
                  <ol className="mt-2 space-y-1">
                    {plan.steps.map((step) => (
                      <li key={step.id} className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                        {step.done ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--emerald)" }} /> : <Circle className="h-3.5 w-3.5" style={{ color: "var(--ink-muted)" }} />}
                        <span>{ar ? step.text : (step.textEn ?? step.text)}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
                {plan.company ? <div className="mt-2" style={{ fontSize: 11, color: "var(--ink-muted)" }}>{ar ? plan.company.name : plan.company.nameEn}</div> : null}
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
