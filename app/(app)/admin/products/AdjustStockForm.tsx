"use client";

// Inline manual stock-adjustment form (Phase 5). Mirrors the
// destructive-action pattern in ClearTestImportsButton: a
// <form action={serverAction}> whose onSubmit gates on window.confirm().
// Records an ADJUSTMENT movement; the server action re-validates and
// recalcs the cached quantity.

import { SlidersHorizontal } from "lucide-react";
import { adjustStock } from "./actions";

export function AdjustStockForm({
  productId,
  sku,
  ar,
}: {
  productId: string;
  sku: string;
  ar: boolean;
}) {
  return (
    <form
      action={adjustStock}
      onSubmit={(e) => {
        const f = e.currentTarget;
        const delta = (f.elements.namedItem("delta") as HTMLInputElement)?.value.trim();
        const reason = (f.elements.namedItem("reason") as HTMLInputElement)?.value.trim();
        const n = Number(delta);
        if (!Number.isInteger(n) || n === 0) {
          e.preventDefault();
          alert(
            ar
              ? "أدخل عدداً صحيحاً غير صفري (موجب للزيادة، سالب للنقص)."
              : "Enter a non-zero whole number (positive to add, negative to remove).",
          );
          return;
        }
        if (!reason) {
          e.preventDefault();
          alert(ar ? "السبب مطلوب." : "A reason is required.");
          return;
        }
        const s = n > 0 ? `+${n}` : String(n);
        if (
          !confirm(
            ar
              ? `تسوية ${sku} بمقدار ${s} وحدة. السبب: «${reason}». لا يمكن تعديل الحركة بعد تسجيلها (تُصحَّح بحركة معاكسة). متابعة؟`
              : `Adjust ${sku} by ${s} units. Reason: "${reason}". Recorded movements can't be edited (corrected by a reverse movement). Proceed?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="productId" value={productId} />
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "التغيّر (± وحدات)" : "Delta (± units)"}
        <input
          type="number"
          name="delta"
          step={1}
          placeholder={ar ? "مثال: -3" : "e.g. -3"}
          className="input w-28 font-mono text-xs"
          aria-label={ar ? "التغيّر بالوحدات" : "Delta in units"}
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-[11px] font-bold">
        {ar ? "السبب" : "Reason"}
        <input
          type="text"
          name="reason"
          maxLength={200}
          placeholder={
            ar ? "مثال: جرد ربعي صحّح ٣ وحدات" : "e.g. Quarterly count corrected −3 units"
          }
          className="input w-full text-xs"
          aria-label={ar ? "سبب التسوية" : "Adjustment reason"}
        />
      </label>
      <button type="submit" className="btn-secondary btn-sm">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {ar ? "تسوية المخزون" : "Adjust stock"}
      </button>
    </form>
  );
}
