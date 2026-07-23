"use client";

// Client forms for /admin/purchase-orders (Phase 6). The line builder
// keeps rows in React state and serializes to a hidden `linesJson`
// input; everything else is plain named inputs the server action reads
// from FormData. Confirm-gated where a transition is irreversible
// (receipt writes ledger movements; cancel is terminal) — same pattern
// as ClearTestImportsButton / AdjustStockForm.

import { useState } from "react";
import { Plus, Trash2, PackageCheck, Send, Ban } from "lucide-react";
import {
  createPurchaseOrder,
  markPurchaseOrderSent,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./actions";

type ProductOpt = { id: string; sku: string; name: string };
type SupplierOpt = { id: string; name: string };
type Line = { productId: string; quantity: string; unitCost: string };

export function NewPOForm({
  products,
  suppliers,
  tenantDefault,
  ar,
}: {
  products: ProductOpt[];
  suppliers: SupplierOpt[];
  tenantDefault: string;
  ar: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantity: "", unitCost: "" },
  ]);
  const set = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const clean = lines
    .filter((l) => l.productId && Number(l.quantity) > 0)
    .map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      unitCost: l.unitCost === "" ? null : Number(l.unitCost),
    }));

  return (
    <details className="card overflow-hidden">
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold"
        style={{ listStyle: "none", color: "var(--brand-deep)" }}
      >
        <Plus className="h-4 w-4" />
        {ar ? "أمر شراء جديد" : "New purchase order"}
      </summary>
      <form
        action={createPurchaseOrder}
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
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            {ar ? "المستأجر" : "Tenant"}
            <input name="tenantId" defaultValue={tenantDefault} required className="input text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            {ar ? "المورّد" : "Supplier"}
            {suppliers.length > 0 ? (
              <select name="supplierId" required defaultValue="" className="input text-xs">
                <option value="" disabled>
                  {ar ? "— اختر مورّداً —" : "— select supplier —"}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              // No suppliers yet — a required empty <select> is unsubmittable.
              // Free-text name → the action's find-or-create supplier path.
              <input
                name="supplier"
                required
                placeholder={ar ? "اسم المورّد (سيُنشأ تلقائياً)" : "Supplier name (auto-created)"}
                className="input text-xs"
              />
            )}
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            {ar ? "متوقع في" : "Expected at"}
            <input type="date" name="expectedAt" className="input text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            {ar ? "ملاحظة" : "Note"}
            <input name="note" className="input text-xs" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-bold">
                {ar ? "المنتج" : "Product"}
                <select
                  value={l.productId}
                  onChange={(e) => set(i, "productId", e.target.value)}
                  className="input text-xs"
                >
                  <option value="">{ar ? "— اختر —" : "— select —"}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] font-bold">
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
              <label className="flex flex-col gap-1 text-[13px] font-bold">
                {ar ? "تكلفة الوحدة" : "Unit cost"}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unitCost}
                  onChange={(e) => set(i, "unitCost", e.target.value)}
                  className="input w-28 text-xs"
                />
              </label>
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
          ))}
          <div>
            <button
              type="button"
              onClick={() =>
                setLines((ls) => [...ls, { productId: "", quantity: "", unitCost: "" }])
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
            {ar ? "إنشاء أمر الشراء" : "Create PO"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function MarkSentButton({ poId, ar }: { poId: string; ar: boolean }) {
  return (
    <form action={markPurchaseOrderSent}>
      <input type="hidden" name="poId" value={poId} />
      <button type="submit" className="btn-secondary btn-sm">
        <Send className="h-3.5 w-3.5" />
        {ar ? "وضع كمُرسَل" : "Mark as Sent"}
      </button>
    </form>
  );
}

export function ReceiveForm({
  poId,
  lines,
  ar,
}: {
  poId: string;
  lines: { lineId: string; label: string; ordered: number; received: number }[];
  ar: boolean;
}) {
  const open = lines.filter((l) => l.received < l.ordered);
  if (open.length === 0) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-bold" style={{ color: "var(--brand-deep)" }}>
        <PackageCheck className="me-1 inline h-3.5 w-3.5" />
        {ar ? "استلام" : "Receive"}
      </summary>
      <form
        action={receivePurchaseOrder}
        onSubmit={(e) => {
          if (
            !confirm(
              ar
                ? "تسجيل الاستلام؟ ستُكتب حركات RECEIVED ولا يمكن تعديلها (تُصحَّح بحركة معاكسة)."
                : "Record receipt? RECEIVED movements will be written and can't be edited (correct via ADJUSTMENT).",
            )
          )
            e.preventDefault();
        }}
        className="mt-2 flex flex-col gap-2"
      >
        <input type="hidden" name="poId" value={poId} />
        {open.map((l) => {
          const remaining = l.ordered - l.received;
          return (
            <label key={l.lineId} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="min-w-[180px] font-mono">{l.label}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {ar ? "المتبقي" : "remaining"} {remaining}
              </span>
              <input
                type="number"
                name={`recv_${l.lineId}`}
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
            {ar ? "تسجيل الاستلام" : "Record receipt"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function CancelPOButton({ poId, ar }: { poId: string; ar: boolean }) {
  return (
    <form
      action={cancelPurchaseOrder}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? "إلغاء أمر الشراء؟ لا يمكن التراجع. إن كان مستلَماً جزئياً فستُرفض العملية."
              : "Cancel this PO? This is terminal. Rejected if stock was already received.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="poId" value={poId} />
      <button type="submit" className="btn-danger btn-sm">
        <Ban className="h-3.5 w-3.5" />
        {ar ? "إلغاء" : "Cancel"}
      </button>
    </form>
  );
}
