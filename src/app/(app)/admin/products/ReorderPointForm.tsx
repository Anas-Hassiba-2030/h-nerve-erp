"use client";

// Phase 10 — inline reorder-point setter on /admin/products. Plain
// FormData → setReorderPoint server action; empty value clears it
// (engine then uses the default of 50). Mirrors AdjustStockForm.

import { Target } from "lucide-react";
import { setReorderPoint } from "./actions";

export function ReorderPointForm({
  productId,
  current,
  ar,
}: {
  productId: string;
  current: number | null;
  ar: boolean;
}) {
  return (
    <form action={setReorderPoint} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="productId" value={productId} />
      <label className="flex flex-col gap-1 text-[11px] font-bold">
        {ar ? "نقطة إعادة الطلب" : "Reorder point"}
        <input
          type="number"
          name="reorderPoint"
          min={0}
          step={1}
          defaultValue={current ?? ""}
          placeholder={ar ? "افتراضي ٥٠" : "default 50"}
          className="input w-28 font-mono text-xs"
          aria-label={ar ? "نقطة إعادة الطلب" : "Reorder point"}
        />
      </label>
      <button type="submit" className="btn-secondary btn-sm">
        <Target className="h-3.5 w-3.5" />
        {ar ? "حفظ النقطة" : "Set point"}
      </button>
    </form>
  );
}
