"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createEstimate } from "./actions";

type Customer = { id: string; name: string };
type TaxRate = { id: string; name: string; rate: number };

type Line = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRateId: string;
};

const emptyLine: Line = { description: "", quantity: "1", unitPrice: "0", taxRateId: "" };

export function EstimateForm({
  customers,
  taxRates,
  ar,
}: {
  customers: Customer[];
  taxRates: TaxRate[];
  ar: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const rateById = new Map(taxRates.map((r) => [r.id, r.rate]));
  const totals = lines.reduce(
    (acc, l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const gross = qty * price;
      const tax = gross * (rateById.get(l.taxRateId) ?? 0);
      acc.subtotal += gross;
      acc.tax += tax;
      return acc;
    },
    { subtotal: 0, tax: 0 },
  );
  const total = totals.subtotal + totals.tax;

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRateId: l.taxRateId || undefined,
      })),
  );

  if (customers.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar
            ? "لا يوجد عملاء بعد. أضف عميلاً أولاً قبل إنشاء عرض سعر."
            : "No customers yet. Add a customer before creating an estimate."}
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/customers/new" className="btn btn-primary">
            {ar ? "إضافة عميل" : "Add a customer"}
          </Link>
          <Link href="/estimates" className="btn-ghost inline-flex">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة" : "Back"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={createEstimate} className="card card-pad space-y-5" noValidate>
      <input type="hidden" name="linesJson" value={linesJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "العميل" : "Client"} *</label>
          <select name="customerId" className="select" required>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "العملة" : "Currency"}</label>
          <input name="currency" defaultValue="JOD" className="input font-mono uppercase" maxLength={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الإصدار" : "Issue date"}</label>
          <input type="date" name="issueDate" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الانتهاء" : "Expiry date"}</label>
          <input type="date" name="expiryDate" className="input" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">{ar ? "البنود" : "Line items"}</label>
          <button type="button" onClick={addLine} className="btn-ghost">
            <Plus className="h-4 w-4" />
            {ar ? "إضافة بند" : "Add line"}
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 90px 110px 140px 32px" }}>
              <input
                className="input"
                placeholder={ar ? "الوصف" : "Description"}
                value={l.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={l.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={l.unitPrice}
                onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
              />
              <select
                className="select"
                value={l.taxRateId}
                onChange={(e) => updateLine(i, { taxRateId: e.target.value })}
              >
                <option value="">{ar ? "بلا ضريبة" : "No tax"}</option>
                {taxRates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="btn-ghost"
                aria-label={ar ? "حذف البند" : "Remove line"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full sm:w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "var(--ink-muted)" }}>{ar ? "المجموع الفرعي" : "Subtotal"}</span>
            <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--ink-muted)" }}>{ar ? "الضريبة" : "Tax"}</span>
            <span className="font-mono">{totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: "var(--line)" }}>
            <span>{ar ? "الإجمالي" : "Total"}</span>
            <span className="font-mono">{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
        <textarea name="note" rows={3} className="textarea" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/estimates" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {ar ? "حفظ عرض السعر" : "Save estimate"}
        </button>
      </div>
    </form>
  );
}
