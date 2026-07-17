import { Wallet } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber, formatMoney } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { runPayrollAction } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [runs, treasuries, activeEmployeeCount] = await Promise.all([
    prisma.payrollRun.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      include: { treasury: { select: { name: true } }, payslips: { select: { id: true } } },
      take: 60,
    }),
    prisma.treasury.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
    prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "مسير الرواتب" : "Payroll"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(activeEmployeeCount)} موظف نشط`
                : `${formatNumber(activeEmployeeCount)} active employee(s)`}
            </p>
          </div>
        </div>

        {canManage ? (
          treasuries.length === 0 ? (
            <div className="card card-pad text-sm" style={{ color: "var(--ink-muted)" }}>
              {ar ? "أضف خزينة أولاً لتتمكن من تشغيل الرواتب." : "Add a treasury first so payroll has somewhere to pay from."}
            </div>
          ) : (
            <form action={runPayrollAction} className="card card-pad flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الصرف من خزينة" : "Pay from treasury"}</label>
                <select name="treasuryId" className="input" required defaultValue="">
                  <option value="" disabled>
                    {ar ? "اختر خزينة" : "Select a treasury"}
                  </option>
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                {ar ? "تشغيل رواتب هذا الشهر" : "Run this month's payroll"}
              </button>
            </form>
          )
        ) : null}

        {runs.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={ar ? "لا توجد دورات رواتب بعد" : "No payroll runs yet"}
            description={ar ? "شغّل أول دورة رواتب أعلاه." : "Run your first payroll cycle above."}
          />
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-start p-2">{ar ? "الفترة" : "Period"}</th>
                  <th className="text-start p-2">{ar ? "الخزينة" : "Treasury"}</th>
                  <th className="text-start p-2">{ar ? "عدد الموظفين" : "Employees"}</th>
                  <th className="text-start p-2">{ar ? "الإجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="p-2 tabular-nums">
                      {r.periodYear}-{String(r.periodMonth).padStart(2, "0")}
                    </td>
                    <td className="p-2">{r.treasury.name}</td>
                    <td className="p-2 tabular-nums">{formatNumber(r.payslips.length)}</td>
                    <td className="p-2 tabular-nums">{formatMoney(Number(r.totalAmount))}</td>
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
