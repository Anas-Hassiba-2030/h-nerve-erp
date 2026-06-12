"use client";

// New-transfer form for /admin/transfers (Phase 9). Plain named inputs
// the server action reads from FormData. Source is a (product@warehouse)
// row; destination is a warehouse. Same-warehouse / over-quantity /
// cross-tenant are rejected server-side by createTransfer (fail-loud).

import { Plus, ArrowRightLeft } from "lucide-react";
import { createTransferAction } from "./actions";

export function NewTransferForm({
  products,
  warehouses,
  ar,
}: {
  products: { id: string; label: string }[];
  warehouses: { id: string; label: string }[];
  ar: boolean;
}) {
  return (
    <details className="card overflow-hidden">
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold"
        style={{ listStyle: "none", color: "var(--brand-deep)" }}
      >
        <Plus className="h-4 w-4" />
        {ar ? "تحويل جديد" : "New transfer"}
      </summary>
      <form
        action={createTransferAction}
        className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <label className="flex flex-col gap-1 text-[11px] font-bold sm:col-span-2">
          {ar ? "المصدر (صنف @ مستودع)" : "Source (SKU @ warehouse)"}
          <select name="fromProductId" required className="input text-xs">
            <option value="">{ar ? "— اختر —" : "— select —"}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "المستودع الوجهة" : "Destination warehouse"}
          <select name="toWarehouseId" required className="input text-xs">
            <option value="">{ar ? "— اختر —" : "— select —"}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold">
          {ar ? "الكمية" : "Quantity"}
          <input
            name="qty"
            type="number"
            min={1}
            step={1}
            required
            className="input text-xs"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold sm:col-span-2 lg:col-span-4">
          {ar ? "السبب" : "Reason"}
          <input
            name="reason"
            required
            placeholder={
              ar ? "إعادة توزيع المخزون…" : "Stock rebalance…"
            }
            className="input text-xs"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary btn-sm">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {ar ? "تنفيذ التحويل" : "Execute transfer"}
          </button>
        </div>
      </form>
    </details>
  );
}
