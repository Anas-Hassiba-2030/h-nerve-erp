import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { decideLeaveRequest } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-emerald",
  REJECTED: "badge-red",
};

export default async function LeavePage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const requests = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { name: true, employeeNumber: true } } },
    take: 200,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "طلبات الإجازة" : "Leave Requests"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(requests.length)} طلب` : `${formatNumber(requests.length)} requests`}
            </p>
          </div>
          {canManage ? (
            <Link href="/hr/leave/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "طلب جديد" : "New request"}
            </Link>
          ) : null}
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={ar ? "لا توجد طلبات إجازة بعد" : "No leave requests yet"}
            description={ar ? "قدّم أول طلب إجازة لموظف." : "Submit the first leave request for an employee."}
            action={
              canManage ? (
                <Link href="/hr/leave/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "طلب جديد" : "New request"}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-start p-2">{ar ? "الموظف" : "Employee"}</th>
                  <th className="text-start p-2">{ar ? "النوع" : "Type"}</th>
                  <th className="text-start p-2">{ar ? "من" : "From"}</th>
                  <th className="text-start p-2">{ar ? "إلى" : "To"}</th>
                  <th className="text-start p-2">{ar ? "أيام" : "Days"}</th>
                  <th className="text-start p-2">{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th className="text-start p-2">{ar ? "إجراءات" : "Actions"}</th> : null}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="p-2">{r.employee.name}</td>
                    <td className="p-2">{r.type}</td>
                    <td className="p-2 tabular-nums">{formatDate(r.startDate, locale)}</td>
                    <td className="p-2 tabular-nums">{formatDate(r.endDate, locale)}</td>
                    <td className="p-2 tabular-nums">{r.days}</td>
                    <td className="p-2">
                      <span className={`badge ${STATUS_BADGE[r.status] ?? "badge-slate"}`}>{r.status}</span>
                    </td>
                    {canManage ? (
                      <td className="p-2 flex gap-2">
                        {r.status === "PENDING" ? (
                          <>
                            <form action={decideLeaveRequest}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="decision" value="APPROVED" />
                              <button type="submit" className="btn-ghost text-xs">
                                {ar ? "موافقة" : "Approve"}
                              </button>
                            </form>
                            <form action={decideLeaveRequest}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="decision" value="REJECTED" />
                              <button type="submit" className="btn-ghost text-xs">
                                {ar ? "رفض" : "Reject"}
                              </button>
                            </form>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
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
