// /hr/attendance — docs/HOURANI-ERP-GAPS.md #7 🟠. Shift registry +
// today's clock-in/out roster. Overtime computed from these Attendance
// rows feeds PayrollRun's allowances line (lib/hr/payroll.ts) — this
// page only records the raw clock times, it doesn't compute pay itself.
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatDateTime, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { hoursWorked, overtimeHours } from "@/lib/hr/attendance";
import { createShift, assignShift, clockIn, clockOut } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const STATUS_BADGE: Record<string, string> = {
  PRESENT: "badge-emerald",
  LATE: "badge-amber",
  ABSENT: "badge-red",
};

export default async function AttendancePage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");
  const today = todayUtcMidnight();

  const [shifts, employees, todaysAssignments, todaysAttendance] = await Promise.all([
    prisma.shift.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.shiftAssignment.findMany({ where: { date: today }, include: { shift: true } }),
    prisma.attendance.findMany({ where: { date: today }, include: { employee: { select: { name: true } } } }),
  ]);

  const assignmentByEmployee = new Map(todaysAssignments.map((a) => [a.employeeId, a]));
  const attendanceByEmployee = new Map(todaysAttendance.map((a) => [a.employeeId, a]));

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{ar ? "الحضور والورديات" : "Attendance & Shifts"}</h1>
          <p style={{ fontSize: 15.5, color: "var(--ink-muted)" }}>
            {ar
              ? "ساعات العمل الإضافي هنا تُغذّي مسير الرواتب تلقائياً."
              : "Overtime hours recorded here feed automatically into payroll."}
          </p>
        </div>

        {canManage ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <details className="card card-pad">
              <summary className="font-medium cursor-pointer">{ar ? "وردية جديدة" : "New shift"}</summary>
              <form action={createShift} className="space-y-3 mt-4" noValidate>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
                  <input name="name" className="input" required maxLength={80} placeholder={ar ? "الوردية الصباحية" : "Morning shift"} />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{ar ? "البداية" : "Start"} *</label>
                    <input type="time" name="startTime" className="input" required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{ar ? "النهاية" : "End"} *</label>
                    <input type="time" name="endTime" className="input" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  {ar ? "إضافة" : "Add"}
                </button>
              </form>
            </details>

            <details className="card card-pad">
              <summary className="font-medium cursor-pointer">{ar ? "تعيين وردية اليوم" : "Assign today's shift"}</summary>
              <form action={assignShift} className="space-y-3 mt-4" noValidate>
                <input type="hidden" name="date" value={today.toISOString().slice(0, 10)} />
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الموظف" : "Employee"} *</label>
                  <select name="employeeId" className="select" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الوردية" : "Shift"} *</label>
                  <select name="shiftId" className="select" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime}–{s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  {ar ? "تعيين" : "Assign"}
                </button>
              </form>
            </details>
          </div>
        ) : null}

        <div>
          <h2 className="font-medium mb-3">{ar ? "حضور اليوم" : "Today's roster"}</h2>
          {employees.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={ar ? "لا موظفون نشطون" : "No active employees"}
              description={ar ? "أضف موظفين في /hr/employees أولاً." : "Add employees at /hr/employees first."}
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? "الموظف" : "Employee"}</th>
                    <th>{ar ? "الوردية" : "Shift"}</th>
                    <th>{ar ? "الحضور" : "Clock in"}</th>
                    <th>{ar ? "الانصراف" : "Clock out"}</th>
                    <th>{ar ? "الحالة" : "Status"}</th>
                    <th style={{ textAlign: "end" }}>{ar ? "إضافي" : "Overtime"}</th>
                    {canManage ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const assignment = assignmentByEmployee.get(e.id);
                    const att = attendanceByEmployee.get(e.id);
                    const worked = att?.clockIn && att?.clockOut ? hoursWorked(att.clockIn, att.clockOut) : null;
                    const ot = worked !== null ? overtimeHours(worked) : null;
                    return (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{assignment ? `${assignment.shift.name}` : "—"}</td>
                        <td>{att?.clockIn ? formatDateTime(att.clockIn, ar ? "ar" : "en") : "—"}</td>
                        <td>{att?.clockOut ? formatDateTime(att.clockOut, ar ? "ar" : "en") : "—"}</td>
                        <td>
                          {att ? (
                            <span className={STATUS_BADGE[att.status] ?? "badge-slate"}>{att.status}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="font-mono" style={{ textAlign: "end" }}>
                          {ot !== null && ot > 0 ? `${formatNumber(ot)}h` : "—"}
                        </td>
                        {canManage ? (
                          <td className="flex gap-2">
                            {!att?.clockIn ? (
                              <form action={clockIn}>
                                <input type="hidden" name="employeeId" value={e.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "حضور" : "Clock in"}
                                </button>
                              </form>
                            ) : !att?.clockOut ? (
                              <form action={clockOut}>
                                <input type="hidden" name="employeeId" value={e.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "انصراف" : "Clock out"}
                                </button>
                              </form>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
