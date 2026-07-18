"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { checkout } from "./actions";

type ProductOption = { id: string; name: string; sku: string; unitCost: number | null };

type Line = { productId: string; quantity: string; unitPrice: string };

const emptyLine: Line = { productId: "", quantity: "1", unitPrice: "0" };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function CheckoutForm({
  sessionId,
  products,
  ar,
}: {
  sessionId: string;
  products: ProductOption[];
  ar: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [discountTotal, setDiscountTotal] = useState("0");
  const [taxTotal, setTaxTotal] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }
  function pickProduct(i: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(i, { productId, unitPrice: String(product?.unitCost ?? 0) });
  }

  const subtotal = useMemo(
    () =>
      r2(
        lines.reduce(
          (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
          0,
        ),
      ),
    [lines],
  );
  const total = r2(subtotal - (Number(discountTotal) || 0) + (Number(taxTotal) || 0));

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
  );

  if (products.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar ? "لا توجد منتجات بعد. أضف منتجات في المخزون أولاً." : "No products yet. Add inventory products first."}
        </p>
      </div>
    );
  }

  return (
    <form action={checkout} className="card card-pad space-y-5" noValidate>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="linesJson" value={linesJson} />
      <input type="hidden" name="discountTotal" value={discountTotal} />
      <input type="hidden" name="taxTotal" value={taxTotal} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">{ar ? "المنتجات" : "Items"}</label>
          <button type="button" onClick={addLine} className="btn-ghost">
            <Plus className="h-4 w-4" />
            {ar ? "إضافة سطر" : "Add line"}
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 90px 110px 32px" }}>
              <select className="select" value={l.productId} onChange={(e) => pickProduct(i, e.target.value)}>
                <option value="">{ar ? "اختر منتجاً" : "Pick a product"}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
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
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="btn-ghost"
                aria-label={ar ? "حذف السطر" : "Remove line"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "خصم" : "Discount"}</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={discountTotal}
            onChange={(e) => setDiscountTotal(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "ضريبة" : "Tax"}</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={taxTotal}
            onChange={(e) => setTaxTotal(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "طريقة الدفع" : "Payment method"}</label>
          <select
            name="paymentMethod"
            className="select"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="CASH">{ar ? "نقدي" : "Cash"}</option>
            <option value="CARD">{ar ? "بطاقة" : "Card"}</option>
            <option value="TRANSFER">{ar ? "تحويل" : "Transfer"}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <div className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {ar ? "الإجمالي الفرعي" : "Subtotal"} {subtotal.toFixed(2)}
        </div>
        <div className="text-lg font-bold">
          {ar ? "الإجمالي" : "Total"} {total.toFixed(2)}
        </div>
        <button type="submit" className="btn btn-primary" disabled={total < 0 || !linesJson || linesJson === "[]"}>
          {ar ? "إتمام البيع" : "Complete sale"}
        </button>
      </div>
    </form>
  );
}
