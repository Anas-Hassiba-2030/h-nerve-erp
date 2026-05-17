"use client";

// Client forms for /admin/warehouses (Phase 9). Plain named inputs the
// server action reads from FormData; confirm-gated delete. Mirrors
// SupplierForms / AccountForms. `code` is editable only on create —
// the import resolver keys off it, so it's shown read-only on edit.

import { Plus, Save, Trash2 } from "lucide-react";
import {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  WAREHOUSE_TYPES,
} from "./actions";

type W = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  type: string;
  active: boolean;
};

function Fields({ w, ar }: { w?: W; ar: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "الاسم" : "Name"}
        <input
          name="name"
          required
          defaultValue={w?.name ?? ""}
          className="input text-xs"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "النوع" : "Type"}
        <select
          name="type"
          defaultValue={w?.type ?? "MAIN"}
          className="input text-xs"
        >
          {WAREHOUSE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "نشط" : "Active"}
        <select
          name="active"
          defaultValue={w ? String(w.active) : "true"}
          className="input text-xs"
        >
          <option value="true">{ar ? "نعم" : "Yes"}</option>
          <option value="false">{ar ? "لا" : "No"}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-bold sm:col-span-2 lg:col-span-1">
        {ar ? "العنوان" : "Address"}
        <input
          name="address"
          defaultValue={w?.address ?? ""}
          className="input text-xs"
        />
      </label>
    </div>
  );
}

export function NewWarehouseForm({
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
        {ar ? "مستودع جديد" : "New warehouse"}
      </summary>
      <form
        action={createWarehouse}
        className="flex flex-col gap-3 px-4 pb-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "المستأجر" : "Tenant"}
            <input
              name="tenantId"
              defaultValue={tenantDefault}
              required
              className="input text-xs"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "الرمز" : "Code"}
            <input
              name="code"
              required
              placeholder="AMM-A"
              className="input text-xs"
            />
          </label>
        </div>
        <Fields ar={ar} />
        <div>
          <button type="submit" className="btn-primary btn-sm">
            {ar ? "إنشاء المستودع" : "Create warehouse"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function EditWarehouseForm({ w, ar }: { w: W; ar: boolean }) {
  return (
    <form action={updateWarehouse} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={w.id} />
      <Fields w={w} ar={ar} />
      <div>
        <button type="submit" className="btn-secondary btn-sm">
          <Save className="h-3.5 w-3.5" />
          {ar ? "حفظ" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function DeleteWarehouseButton({
  id,
  name,
  ar,
}: {
  id: string;
  name: string;
  ar: boolean;
}) {
  return (
    <form
      action={deleteWarehouse}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? `حذف المستودع «${name}»؟ يُرفض إن كان يحوي منتجات.`
              : `Delete warehouse "${name}"? Rejected if it still holds products.`,
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
