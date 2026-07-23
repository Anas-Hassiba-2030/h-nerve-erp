"use client";

// Inline manual stock-adjustment form. Phase P4 — replaces the
// alert()-on-submit pattern with inline validation: the submit button
// stays DISABLED until both delta and reason are valid, and an inline
// red error message appears under the field as soon as the user types
// something invalid. window.confirm() still gates the destructive
// commit so the user can review the exact wording before recording.

import { useState } from "react";
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
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  // Live validation. Empty inputs → no error shown yet (avoid yelling
  // at the user before they've typed); typing something invalid → red.
  const deltaNum = Number(delta);
  const deltaTouched = delta.trim().length > 0;
  const deltaInvalid =
    deltaTouched && (!Number.isInteger(deltaNum) || deltaNum === 0);
  const reasonInvalid = reason.trim().length === 0 && reason.length > 0;
  const canSubmit =
    Number.isInteger(deltaNum) && deltaNum !== 0 && reason.trim().length > 0;

  return (
    <form
      action={adjustStock}
      onSubmit={(e) => {
        if (!canSubmit) {
          e.preventDefault();
          return;
        }
        const n = Number(delta);
        const s = n > 0 ? `+${n}` : String(n);
        if (
          !confirm(
            ar
              ? `تسوية ${sku} بمقدار ${s} وحدة. السبب: «${reason.trim()}». لا يمكن تعديل الحركة بعد تسجيلها (تُصحَّح بحركة معاكسة). متابعة؟`
              : `Adjust ${sku} by ${s} units. Reason: "${reason.trim()}". Recorded movements can't be edited (corrected by a reverse movement). Proceed?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-start gap-2"
    >
      <input type="hidden" name="productId" value={productId} />

      <label className="flex flex-col gap-1 text-[13px] font-bold">
        {ar ? "التغيّر (± وحدات)" : "Delta (± units)"}
        <input
          type="number"
          name="delta"
          step={1}
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder={ar ? "مثال: -3" : "e.g. -3"}
          className="input w-28 font-mono text-xs"
          aria-label={ar ? "التغيّر بالوحدات" : "Delta in units"}
          aria-invalid={deltaInvalid ? "true" : undefined}
        />
        {deltaInvalid ? (
          <span style={{ color: "#c54242", fontSize: 12 }}>
            {ar
              ? "أدخل عدداً صحيحاً غير صفري"
              : "Non-zero whole number"}
          </span>
        ) : null}
      </label>

      <label className="flex flex-1 flex-col gap-1 text-[13px] font-bold">
        {ar ? "السبب" : "Reason"}
        <input
          type="text"
          name="reason"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            ar ? "مثال: جرد ربعي صحّح ٣ وحدات" : "e.g. Quarterly count corrected −3 units"
          }
          className="input w-full text-xs"
          aria-label={ar ? "سبب التسوية" : "Adjustment reason"}
          aria-invalid={reasonInvalid ? "true" : undefined}
        />
      </label>

      <button
        type="submit"
        className="btn-secondary btn-sm"
        disabled={!canSubmit}
        title={
          canSubmit
            ? undefined
            : ar
              ? "أدخل التغيّر والسبب أولاً"
              : "Fill in delta and reason first"
        }
        style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {ar ? "تسوية المخزون" : "Adjust stock"}
      </button>
    </form>
  );
}
