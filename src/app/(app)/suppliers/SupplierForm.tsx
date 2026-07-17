"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupplier, updateSupplier } from "./actions";

type Supplier = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
};

export function SupplierForm({
  defaults,
  ar,
}: {
  defaults?: Supplier;
  ar: boolean;
}) {
  const isEdit = Boolean(defaults?.id);
  const action = isEdit ? updateSupplier : createSupplier;

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
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">{ar ? "العنوان" : "Address"}</label>
          <input name="address" defaultValue={defaults?.address ?? ""} className="input" maxLength={400} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "شروط الدفع" : "Payment terms"}</label>
          <input name="paymentTerms" defaultValue={defaults?.paymentTerms ?? ""} className="input" placeholder="Net 30" maxLength={60} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظات" : "Notes"}</label>
        <textarea name="notes" rows={3} defaultValue={defaults?.notes ?? ""} className="textarea" maxLength={2000} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/suppliers" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {isEdit ? (ar ? "حفظ التغييرات" : "Save changes") : ar ? "إضافة مورّد" : "Add supplier"}
        </button>
      </div>
    </form>
  );
}
