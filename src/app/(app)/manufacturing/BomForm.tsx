"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createBom } from "./actions";

type ProductOption = { id: string; name: string; sku: string };

type Line = { componentProductId: string; quantity: string };

const emptyLine: Line = { componentProductId: "", quantity: "1" };

export function BomForm({ products, ar }: { products: ProductOption[]; ar: boolean }) {
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

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
      .filter((l) => l.componentProductId)
      .map((l) => ({ componentProductId: l.componentProductId, quantity: l.quantity })),
  );

  if (products.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar
            ? "لا توجد منتجات بعد. أضف منتجات في المخزون أولاً."
            : "No products yet. Add inventory products first."}
        </p>
        <div className="mt-4">
          <Link href="/manufacturing/boms" className="btn-ghost inline-flex">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة" : "Back"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={createBom} className="card card-pad space-y-5" noValidate>
      <input type="hidden" name="linesJson" value={linesJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
          <input name="name" className="input" required maxLength={200} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {ar ? "المنتج الناتج" : "Output product"} *
          </label>
          <select name="productId" className="select" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {ar ? "الكمية الناتجة لكل دورة" : "Output qty per run"}
          </label>
          <input type="number" name="outputQty" min={1} defaultValue={1} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              {ar ? "كلفة العمالة / دورة" : "Labor cost / run"}
            </label>
            <input type="number" name="laborCost" min={0} step="0.01" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {ar ? "كلفة إضافية / دورة" : "Overhead / run"}
            </label>
            <input type="number" name="overheadCost" min={0} step="0.01" defaultValue={0} className="input" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">{ar ? "المكوّنات" : "Components"}</label>
          <button type="button" onClick={addLine} className="btn-ghost">
            <Plus className="h-4 w-4" />
            {ar ? "إضافة مكوّن" : "Add component"}
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 110px 32px" }}>
              <select
                className="select"
                value={l.componentProductId}
                onChange={(e) => updateLine(i, { componentProductId: e.target.value })}
              >
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
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="btn-ghost"
                aria-label={ar ? "حذف المكوّن" : "Remove component"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
        <textarea name="note" rows={3} className="textarea" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/manufacturing/boms" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {ar ? "حفظ قائمة المواد" : "Save bill of materials"}
        </button>
      </div>
    </form>
  );
}
