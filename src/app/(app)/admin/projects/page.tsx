// /admin/projects — project accounting / timesheets (docs/HOURANI-ERP-GAPS.md
// #9 🟠, the last item on the ranked build order). Budget-vs-actual read
// computed from logged TimesheetEntry hours (rate from Employee.baseSalary
// unless overridden) + ProjectExpense lines (lib/projects/projects.ts). Not
// wired into the ledger — see prisma/schema/projects.prisma's header.
import { Briefcase } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { hourlyRateFromMonthlySalary } from "@/lib/hr/attendance";
import { computeProjectActuals, budgetVariance } from "@/lib/projects/projects";
import { createProjectAcct, logTimesheetEntry, logProjectExpense } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  PLANNING: { ar: "تخطيط", en: "Planning" },
  ACTIVE: { ar: "نشط", en: "Active" },
  ON_HOLD: { ar: "متوقف", en: "On hold" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  CANCELLED: { ar: "ملغى", en: "Cancelled" },
};

const VARIANCE_BADGE: Record<string, string> = {
  UNDER: "badge-emerald",
  ON_TRACK: "badge-amber",
  OVER: "badge-red",
};
const VARIANCE_LABEL: Record<string, { ar: string; en: string }> = {
  UNDER: { ar: "دون الميزانية", en: "Under budget" },
  ON_TRACK: { ar: "ضمن الخطة", en: "On track" },
  OVER: { ar: "تجاوز الميزانية", en: "Over budget" },
};

export default async function ProjectsAcctPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [projects, employees] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        timesheetEntries: { include: { employee: { select: { baseSalary: true } } } },
        expenses: true,
      },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, baseSalary: true },
    }),
  ]);

  const rows = projects.map((p) => {
    const actuals = computeProjectActuals(
      p.timesheetEntries.map((t) => ({
        hours: Number(t.hours),
        hourlyRate: t.hourlyRate !== null ? Number(t.hourlyRate) : hourlyRateFromMonthlySalary(Number(t.employee.baseSalary)),
        billable: t.billable,
      })),
      p.expenses.map((e) => ({ amount: Number(e.amount) })),
    );
    const variance = budgetVariance(Number(p.budget), actuals.totalActual);
    return { project: p, actuals, variance };
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/projects" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "محاسبة المشاريع" : "Project Accounting"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "ميزانية مقابل الفعلي من ساعات العمل المسجّلة والمصاريف — للحاضنة وأي عمل تعاقدي."
              : "Budget vs. actual from logged hours and expenses — for the incubator and contracting work."}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "مشروع جديد" : "New project"}</summary>
            <form action={createProjectAcct} className="grid gap-4 sm:grid-cols-2 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الرمز" : "Code"} *</label>
                <input name="code" className="input font-mono" required maxLength={40} placeholder="INCUB-2026-01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
                <input name="name" className="input" required maxLength={160} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">{ar ? "الوصف" : "Description"}</label>
                <textarea name="description" className="input" rows={2} maxLength={2000} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الميزانية (د.أ)" : "Budget (JOD)"}</label>
                <input type="number" step="0.01" name="budget" className="input font-mono" defaultValue={0} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحالة" : "Status"}</label>
                <select name="status" className="select" defaultValue="PLANNING">
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{ar ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "تاريخ البدء" : "Start date"}</label>
                <input type="date" name="startDate" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الانتهاء" : "End date"}</label>
                <input type="date" name="endDate" className="input" />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-2">{ar ? "إنشاء" : "Create"}</button>
            </form>
          </details>
        ) : null}

        {canManage && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card card-pad space-y-4">
              <h2 className="font-medium">{ar ? "تسجيل ساعات عمل" : "Log timesheet hours"}</h2>
              <form action={logTimesheetEntry} className="grid gap-3" noValidate>
                <select name="projectId" className="select" required defaultValue="">
                  <option value="" disabled>{ar ? "المشروع" : "Project"}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
                  ))}
                </select>
                <select name="employeeId" className="select" required defaultValue="">
                  <option value="" disabled>{ar ? "الموظف" : "Employee"}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <input type="date" name="date" className="input" required />
                <input type="number" step="0.25" min="0.25" max="24" name="hours" className="input font-mono" required placeholder={ar ? "الساعات" : "Hours"} />
                <input type="number" step="0.01" name="hourlyRate" className="input font-mono" placeholder={ar ? "معدل الساعة (اختياري)" : "Hourly rate override (optional)"} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="billable" defaultChecked /> {ar ? "قابل للفوترة" : "Billable"}
                </label>
                <input name="note" className="input" maxLength={300} placeholder={ar ? "ملاحظة" : "Note"} />
                <button type="submit" className="btn btn-primary">{ar ? "تسجيل" : "Log"}</button>
              </form>
            </div>
            <div className="card card-pad space-y-4">
              <h2 className="font-medium">{ar ? "تسجيل مصروف" : "Log an expense"}</h2>
              <form action={logProjectExpense} className="grid gap-3" noValidate>
                <select name="projectId" className="select" required defaultValue="">
                  <option value="" disabled>{ar ? "المشروع" : "Project"}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
                  ))}
                </select>
                <input name="description" className="input" required maxLength={200} placeholder={ar ? "الوصف" : "Description"} />
                <input type="number" step="0.01" name="amount" className="input font-mono" required placeholder={ar ? "المبلغ (د.أ)" : "Amount (JOD)"} />
                <button type="submit" className="btn btn-primary">{ar ? "تسجيل" : "Log"}</button>
              </form>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={ar ? "لا مشاريع بعد" : "No projects yet"}
            description={ar ? "أنشئ مشروعاً أعلاه لبدء تتبّع الميزانية والساعات." : "Create a project above to start tracking budget and hours."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "المشروع" : "Project"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "الميزانية" : "Budget"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "ساعات العمل" : "Labor cost"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "المصاريف" : "Expenses"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "الفعلي الإجمالي" : "Total actual"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "الساعات" : "Hours"}</th>
                  <th>{ar ? "الحالة مقابل الميزانية" : "Budget status"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ project: p, actuals, variance }) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-medium">{p.code}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{p.name}</div>
                    </td>
                    <td>{ar ? STATUS_LABEL[p.status]?.ar : STATUS_LABEL[p.status]?.en}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(Number(p.budget))}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(actuals.laborCost)}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(actuals.expenseCost)}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(actuals.totalActual)}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatNumber(actuals.totalHours)}</td>
                    <td>
                      <span className={VARIANCE_BADGE[variance.status]}>
                        {ar ? VARIANCE_LABEL[variance.status].ar : VARIANCE_LABEL[variance.status].en}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
