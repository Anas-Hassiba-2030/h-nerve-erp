"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLeaveRequest } from "./actions";

type Employee = { id: string; name: string };

const TYPES = ["ANNUAL", "SICK", "UNPAID", "OTHER"];

export function LeaveForm({ employees, ar }: { employees: Employee[]; ar: boolean }) {
  return (
    <form action={createLeaveRequest} className="card card-pad space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">{ar ? "الموظف" : "Employee"} *</label>
          <select name="employeeId" className="input" required defaultValue="">
            <option value="" disabled>
              {ar ? "اختر موظفاً" : "Select an employee"}
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "نوع الإجازة" : "Leave type"}</label>
          <select name="type" className="input" defaultValue="ANNUAL">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div />
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "تاريخ البدء" : "Start date"} *</label>
          <input type="date" name="startDate" className="input" dir="ltr" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الانتهاء" : "End date"} *</label>
          <input type="date" name="endDate" className="input" dir="ltr" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظات" : "Notes"}</label>
        <textarea name="note" rows={3} className="textarea" maxLength={2000} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/hr/leave" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {ar ? "تقديم طلب الإجازة" : "Submit leave request"}
        </button>
      </div>
    </form>
  );
}
