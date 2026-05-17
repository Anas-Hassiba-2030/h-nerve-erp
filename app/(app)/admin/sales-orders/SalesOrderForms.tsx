"use client";

// Client forms for /admin/sales-orders (Phase 6). Mirror of
// PurchaseOrderForms: line builder → hidden linesJson, confirm-gated on
// the irreversible transitions (fulfill writes SOLD movements; cancel is
// terminal). Confirm-order has no dialog — it only runs a soft stock
// check; the result (pass / which SKUs short) comes back as a toast.

import { useState } from "react";
import { Plus, Trash2, Truck, CheckCircle2, Ban } from "lucide-react";
import {
  createSalesOrder,
  confirmSalesOrder,
  fulfillSalesOrder,
  cancelSalesOrder,
} from "./actions";

type ProductOpt = { id: string; sku: string; name: string; quantity: number };
type Line = { productId: string; quantity: string; unitPrice: string };

export function NewSOForm({
  products,
  tenantDefault,
  ar,
}: {
  products: ProductOpt[];
  tenantDefault: string;
  ar: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantity: "", unitPrice: "" },
  ]);
  const set = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const clean = lines
    .filter((l) => l.productId && Number(l.quantity) > 0)
    .map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      unitPrice: l.unitPrice === "" ? null : Number(l.unitPrice),
    }));

  return (
    <details className="card overflow-hidden">
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold"
        style={{ listStyle: "none", color: "var(--brand-deep)" }}
      >
        <Plus className="h-4 w-4" />
        {ar ? "أمر بيع جديد" : "New sales order"}
      </summary>
      <form
        action={createSalesOrder}
        onSubmit={(e) => {
          if (clean.length === 0) {
            e.preventDefault();
            alert(
              ar
                ? "أضف بنداً واحداً على الأقل بمنتج وكمية موجبة."
                : "Add at least one line with a product and a positive quantity.",
            );
          }
        }}
        className="flex flex-col gap-3 px-4 pb-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <input type="hidden" name="linesJson" value={JSON.stringify(clean)} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "المستأجر" : "Tenant"}
            <input name="tenantId" defaultValue={tenantDefault} required className="input text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "العميل" : "Customer"}
            <input name="customer" required placeholder={ar ? "مثال: فندق عمّان" : "e.g. Hotel Amman"} className="input text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "مطلوب بحلول" : "Required by"}
            <input type="date" name="requiredBy" className="input text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold">
            {ar ? "ملاحظة" : "Note"}
            <input name="note" className="input text-xs" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((l, i) => {
            const sel = products.find((p) => p.id === l.productId);
            return (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-[11px] font-bold">
                  {ar ? "المنتج" : "Product"}
                  <select
                    value={l.productId}
                    onChange={(e) => set(i, "productId", e.target.value)}
                    className="input text-xs"
                  >
                    <option value="">{ar ? "— اختر —" : "— select —"}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} ({ar ? "متوفر" : "avail"} {p.quantity})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold">
                  {ar ? "الكمية" : "Qty"}
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={l.quantity}
                    onChange={(e) => set(i, "quantity", e.target.value)}
                    className="input w-24 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold">
                  {ar ? "سعر الوحدة" : "Unit price"}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unitPrice}
                    onChange={(e) => set(i, "unitPrice", e.target.value)}
                    className="input w-28 text-xs"
                  />
                </label>
                {sel && Number(l.quantity) > sel.quantity ? (
                  <span className="badge-amber" title={ar ? "أكثر من المتوفر" : "exceeds available"}>
                    {ar ? "نقص" : "short"}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  className="btn-ghost btn-sm"
                  disabled={lines.length === 1}
                  aria-label={ar ? "حذف البند" : "Remove line"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <div>
            <button
              type="button"
              onClick={() =>
                setLines((ls) => [...ls, { productId: "", quantity: "", unitPrice: "" }])
              }
              className="btn-ghost btn-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              {ar ? "إضافة بند" : "Add line"}
            </button>
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary btn-sm">
            {ar ? "إنشاء أمر البيع" : "Create SO"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function ConfirmSOButton({ soId, ar }: { soId: string; ar: boolean }) {
  return (
    <form action={confirmSalesOrder}>
      <input type="hidden" name="soId" value={soId} />
      <button type="submit" className="btn-secondary btn-sm">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {ar ? "تأكيد الطلب" : "Confirm order"}
      </button>
    </form>
  );
}

export function FulfillForm({
  soId,
  lines,
  ar,
}: {
  soId: string;
  lines: { lineId: string; label: string; ordered: number; fulfilled: number }[];
  ar: boolean;
}) {
  const open = lines.filter((l) => l.fulfilled < l.ordered);
  if (open.length === 0) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-bold" style={{ color: "var(--brand-deep)" }}>
        <Truck className="me-1 inline h-3.5 w-3.5" />
        {ar ? "تنفيذ" : "Fulfill"}
      </summary>
      <form
        action={fulfillSalesOrder}
        onSubmit={(e) => {
          if (
            !confirm(
              ar
                ? "تسجيل التنفيذ؟ ستُكتب حركات SOLD (سالبة) ولا يمكن تعديلها."
                : "Record fulfillment? SOLD (negative) movements will be written and can't be edited.",
            )
          )
            e.preventDefault();
        }}
        className="mt-2 flex flex-col gap-2"
      >
        <input type="hidden" name="soId" value={soId} />
        {open.map((l) => {
          const remaining = l.ordered - l.fulfilled;
          return (
            <label key={l.lineId} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="min-w-[180px] font-mono">{l.label}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {ar ? "المتبقي" : "remaining"} {remaining}
              </span>
              <input
                type="number"
                name={`ful_${l.lineId}`}
                min={0}
                max={remaining}
                step={1}
                placeholder="0"
                className="input w-24 text-xs"
              />
            </label>
          );
        })}
        <div>
          <button type="submit" className="btn-primary btn-sm">
            {ar ? "تسجيل التنفيذ" : "Record fulfillment"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function CancelSOButton({ soId, ar }: { soId: string; ar: boolean }) {
  return (
    <form
      action={cancelSalesOrder}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? "إلغاء أمر البيع؟ لا يمكن التراجع. إن كان منفَّذاً جزئياً فستُرفض العملية."
              : "Cancel this SO? This is terminal. Rejected if stock was already shipped.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="soId" value={soId} />
      <button type="submit" className="btn-danger btn-sm">
        <Ban className="h-3.5 w-3.5" />
        {ar ? "إلغاء" : "Cancel"}
      </button>
    </form>
  );
}
