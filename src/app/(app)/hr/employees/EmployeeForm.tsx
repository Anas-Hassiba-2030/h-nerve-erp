"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEmployee, updateEmployee } from "./actions";

type Employee = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  baseSalary?: number | string;
  note?: string | null;
};

export function EmployeeForm({ defaults, ar }: { defaults?: Employee; ar: boolean }) {
  const isEdit = Boolean(defaults?.id);
  const action = isEdit ? updateEmployee : createEmployee;

  return (
    <form action={action} className="card card-pad space-y-5" noValidate>
      {isEdit ? <input type="hidden" name="id" value={defaults!.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
          <input name="name" defaultValue={defaults?.name ?? ""} className="input" required maxLength={120} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "البريد الإلكتروني" : "Email"}</label>
          <input type="email" name="email" defaultValue={defaults?.email ?? ""} className="input" dir="ltr" maxLength={200} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "الهاتف" : "Phone"}</label>
          <input name="phone" defaultValue={defaults?.phone ?? ""} className="input" dir="ltr" maxLength={40} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "القسم" : "Department"}</label>
          <input name="department" defaultValue={defaults?.department ?? ""} className="input" maxLength={80} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "المنصب" : "Position"}</label>
          <input name="position" defaultValue={defaults?.position ?? ""} className="input" maxLength={80} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">{ar ? "الراتب الأساسي الشهري" : "Monthly base salary"} *</label>
          <input
            type="number"
            name="baseSalary"
            defaultValue={defaults?.baseSalary ?? ""}
            className="input"
            dir="ltr"
            min={0}
            step="0.01"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظات" : "Notes"}</label>
        <textarea name="note" rows={3} defaultValue={defaults?.note ?? ""} className="textarea" maxLength={2000} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/hr/employees" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {isEdit ? (ar ? "حفظ التغييرات" : "Save changes") : ar ? "إضافة موظف" : "Add employee"}
        </button>
      </div>
    </form>
  );
}
