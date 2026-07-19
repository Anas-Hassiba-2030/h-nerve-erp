import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber, formatMoney } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { terminateEmployee, deleteEmployee } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "badge-emerald",
  ON_LEAVE: "badge-amber",
  TERMINATED: "badge-slate",
};

export default async function EmployeesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الموارد البشرية" : "Human Resources"}
        title={ar ? "سجل الموظفين" : "Employees"}
        subtitle={
          ar
            ? "سجل الموظفين ورواتبهم الأساسية — الأساس الذي يُشغّل عليه مسير الرواتب."
            : "Employee records and base salaries — the basis payroll runs against."
        }
        status={ar ? `${formatNumber(employees.length)} موظف` : `${formatNumber(employees.length)} employees`}
        actions={
          canManage ? (
            <Link href="/hr/employees/new" className="dl-btn dl-btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "موظف جديد" : "New employee"}
            </Link>
          ) : undefined
        }
      />

      <div>
        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title={ar ? "لا يوجد موظفون بعد" : "No employees yet"}
            description={
              ar
                ? "أضف أول موظف لتتمكن من تشغيل مسير الرواتب."
                : "Add your first employee so you can run payroll against them."
            }
            action={
              canManage ? (
                <Link href="/hr/employees/new" className="dl-btn dl-btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "موظف جديد" : "New employee"}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="panel reveal table-wrap" style={{ padding: 0 }}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-start p-2">{ar ? "الرقم" : "#"}</th>
                  <th className="text-start p-2">{ar ? "الاسم" : "Name"}</th>
                  <th className="text-start p-2">{ar ? "القسم" : "Department"}</th>
                  <th className="text-start p-2">{ar ? "المنصب" : "Position"}</th>
                  <th className="text-start p-2">{ar ? "الراتب" : "Salary"}</th>
                  <th className="text-start p-2">{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th className="text-start p-2">{ar ? "إجراءات" : "Actions"}</th> : null}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="p-2">{e.employeeNumber}</td>
                    <td className="p-2">
                      <Link href={`/hr/employees/${e.id}/edit`} className="hover:underline">
                        {e.name}
                      </Link>
                    </td>
                    <td className="p-2">{e.department ?? "—"}</td>
                    <td className="p-2">{e.position ?? "—"}</td>
                    <td className="p-2 tabular-nums">{formatMoney(Number(e.baseSalary))}</td>
                    <td className="p-2">
                      <span className={`badge ${STATUS_BADGE[e.status] ?? "badge-slate"}`}>{e.status}</span>
                    </td>
                    {canManage ? (
                      <td className="p-2 flex gap-2">
                        {e.status !== "TERMINATED" ? (
                          <form action={terminateEmployee}>
                            <input type="hidden" name="id" value={e.id} />
                            <button type="submit" className="btn-ghost text-xs">
                              {ar ? "إنهاء الخدمة" : "Terminate"}
                            </button>
                          </form>
                        ) : null}
                        <form action={deleteEmployee}>
                          <input type="hidden" name="id" value={e.id} />
                          <button type="submit" className="btn-ghost text-xs">
                            {ar ? "حذف" : "Delete"}
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DaylightShell>
  );
}
