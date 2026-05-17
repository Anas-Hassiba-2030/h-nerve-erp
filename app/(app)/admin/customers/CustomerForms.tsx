"use client";

// Client forms for /admin/customers (Phase 7). Mirror of SupplierForms.

import { Plus, Save, Trash2 } from "lucide-react";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";

type C = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
  notes: string | null;
};

function FieldGrid({ c, ar }: { c?: C; ar: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "الاسم" : "Name"}
        <input name="name" required defaultValue={c?.name ?? ""} className="input text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "البريد" : "Email"}
        <input name="email" type="email" defaultValue={c?.email ?? ""} className="input text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "الهاتف" : "Phone"}
        <input name="phone" defaultValue={c?.phone ?? ""} className="input text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "شروط الدفع" : "Payment terms"}
        <input name="paymentTerms" placeholder="Net 30 / Prepaid" defaultValue={c?.paymentTerms ?? ""} className="input text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold sm:col-span-2 lg:col-span-1">
        {ar ? "العنوان" : "Address"}
        <input name="address" defaultValue={c?.address ?? ""} className="input text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold sm:col-span-2 lg:col-span-3">
        {ar ? "ملاحظات" : "Notes"}
        <input name="notes" defaultValue={c?.notes ?? ""} className="input text-xs" />
      </label>
    </div>
  );
}

export function NewCustomerForm({ tenantDefault, ar }: { tenantDefault: string; ar: boolean }) {
  return (
    <details className="card overflow-hidden">
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold"
        style={{ listStyle: "none", color: "var(--brand-deep)" }}
      >
        <Plus className="h-4 w-4" />
        {ar ? "عميل جديد" : "New customer"}
      </summary>
      <form
        action={createCustomer}
        className="flex flex-col gap-3 px-4 pb-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <label className="flex max-w-xs flex-col gap-1 text-[11px] font-bold">
          {ar ? "المستأجر" : "Tenant"}
          <input name="tenantId" defaultValue={tenantDefault} required className="input text-xs" />
        </label>
        <FieldGrid ar={ar} />
        <div>
          <button type="submit" className="btn-primary btn-sm">
            {ar ? "إنشاء العميل" : "Create customer"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function EditCustomerForm({ customer, ar }: { customer: C; ar: boolean }) {
  return (
    <form action={updateCustomer} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={customer.id} />
      <FieldGrid c={customer} ar={ar} />
      <div>
        <button type="submit" className="btn-secondary btn-sm">
          <Save className="h-3.5 w-3.5" />
          {ar ? "حفظ" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function DeleteCustomerButton({ id, name, ar }: { id: string; name: string; ar: boolean }) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? `حذف العميل «${name}»؟ يُرفض إن كان لديه أوامر بيع غير ملغاة.`
              : `Delete customer "${name}"? Rejected if it has non-cancelled SOs.`,
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger btn-sm">
        <Trash2 className="h-3.5 w-3.5" />
        {ar ? "حذف" : "Delete"}
      </button>
    </form>
  );
}
