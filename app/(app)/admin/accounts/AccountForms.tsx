"use client";

// New-account form for /admin/accounts (Phase 8). Plain named inputs;
// the server action validates. Mirror of NewSupplierForm.

import { Plus } from "lucide-react";
import { createLedgerAccount } from "./actions";

export function NewAccountForm({
  tenantDefault,
  ar,
}: {
  tenantDefault: string;
  ar: boolean;
}) {
  return (
    <details className="card overflow-hidden">
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold"
        style={{ listStyle: "none", color: "var(--brand-deep)" }}
      >
        <Plus className="h-4 w-4" />
        {ar ? "حساب جديد" : "New account"}
      </summary>
      <form
        action={createLedgerAccount}
        className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "المستأجر" : "Tenant"}
          <input name="tenantId" defaultValue={tenantDefault} required className="input text-xs" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "الرمز" : "Code"}
          <input name="code" required placeholder="6001" className="input text-xs" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "الاسم" : "Name"}
          <input name="name" required className="input text-xs" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "النوع" : "Type"}
          <select name="type" required defaultValue="EXPENSE" className="input text-xs">
            {["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "COGS"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "الوصف" : "Description"}
          <input name="description" className="input text-xs" />
        </label>
        <div className="sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary btn-sm">
            {ar ? "إنشاء الحساب" : "Create account"}
          </button>
        </div>
      </form>
    </details>
  );
}
