"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createBom } from "./actions";

type ProductOption = { id: string; name: string; sku: string };
type WorkCenterOption = { id: string; name: string; code: string };

type Line = { componentProductId: string; quantity: string };
type OpRow = { name: string; workCenterId: string; durationMinutes: string };
type ByRow = { productId: string; quantity: string; costSharePercent: string; isScrap: boolean };

const emptyLine: Line = { componentProductId: "", quantity: "1" };
const emptyOp: OpRow = { name: "", workCenterId: "", durationMinutes: "60" };
const emptyBy: ByRow = { productId: "", quantity: "1", costSharePercent: "0", isScrap: false };

export function BomForm({
  products,
  workCenters = [],
  ar,
}: {
  products: ProductOption[];
  workCenters?: WorkCenterOption[];
  ar: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [ops, setOps] = useState<OpRow[]>([]);
  const [byproducts, setByproducts] = useState<ByRow[]>([]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function updateOp(i: number, patch: Partial<OpRow>) {
    setOps((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function updateBy(i: number, patch: Partial<ByRow>) {
    setByproducts((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.componentProductId)
      .map((l) => ({ componentProductId: l.componentProductId, quantity: l.quantity })),
  );
  const operationsJson = JSON.stringify(
    ops
      .filter((o) => o.name.trim() && o.workCenterId)
      .map((o) => ({ name: o.name, workCenterId: o.workCenterId, durationMinutes: o.durationMinutes })),
  );
  const byproductsJson = JSON.stringify(
    byproducts
      .filter((b) => b.productId)
      .map((b) => ({
        productId: b.productId,
        quantity: b.quantity,
        costSharePercent: b.costSharePercent,
        isScrap: b.isScrap,
      })),
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
      <input type="hidden" name="operationsJson" value={operationsJson} />
      <input type="hidden" name="byproductsJson" value={byproductsJson} />

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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">
            {ar ? "مراحل الإنتاج (اختياري)" : "Routing stages (optional)"}
          </label>
          {workCenters.length > 0 ? (
            <button
              type="button"
              onClick={() => setOps((prev) => [...prev, { ...emptyOp }])}
              className="btn-ghost"
            >
              <Plus className="h-4 w-4" />
              {ar ? "إضافة مرحلة" : "Add stage"}
            </button>
          ) : null}
        </div>
        {workCenters.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
            {ar
              ? "أنشئ مراكز العمل أولاً لإضافة مراحل إنتاج — كلفة العمالة ستُحسب من دقائق كل مرحلة."
              : "Create work centers first to add routing stages — labor cost is then computed from each stage's minutes."}
          </p>
        ) : (
          <div className="space-y-2">
            {ops.map((o, i) => (
              <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 1fr 110px 32px" }}>
                <input
                  className="input"
                  placeholder={ar ? "اسم المرحلة (خلط، تعبئة…)" : "Stage name (mixing, packing…)"}
                  value={o.name}
                  onChange={(e) => updateOp(i, { name: e.target.value })}
                  maxLength={200}
                />
                <select
                  className="select"
                  value={o.workCenterId}
                  onChange={(e) => updateOp(i, { workCenterId: e.target.value })}
                >
                  <option value="">{ar ? "مركز العمل" : "Work center"}</option>
                  {workCenters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input"
                  title={ar ? "دقائق لكل دورة" : "Minutes per run"}
                  value={o.durationMinutes}
                  onChange={(e) => updateOp(i, { durationMinutes: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setOps((prev) => prev.filter((_, idx) => idx !== i))}
                  className="btn-ghost"
                  aria-label={ar ? "حذف المرحلة" : "Remove stage"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">
            {ar ? "منتجات ثانوية / هدر متوقع (اختياري)" : "Byproducts / expected scrap (optional)"}
          </label>
          <button
            type="button"
            onClick={() => setByproducts((prev) => [...prev, { ...emptyBy }])}
            className="btn-ghost"
          >
            <Plus className="h-4 w-4" />
            {ar ? "إضافة منتج ثانوي" : "Add byproduct"}
          </button>
        </div>
        {byproducts.length > 0 ? (
          <div className="space-y-2">
            {byproducts.map((b, i) => (
              <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 90px 90px auto 32px" }}>
                <select
                  className="select"
                  value={b.productId}
                  onChange={(e) => updateBy(i, { productId: e.target.value })}
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
                  title={ar ? "الكمية لكل دورة" : "Qty per run"}
                  value={b.quantity}
                  onChange={(e) => updateBy(i, { quantity: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="input"
                  title={ar ? "حصة الكلفة ٪" : "Cost share %"}
                  value={b.costSharePercent}
                  onChange={(e) => updateBy(i, { costSharePercent: e.target.value })}
                />
                <label className="flex items-center gap-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                  <input
                    type="checkbox"
                    checked={b.isScrap}
                    onChange={(e) => updateBy(i, { isScrap: e.target.checked })}
                  />
                  {ar ? "هدر" : "Scrap"}
                </label>
                <button
                  type="button"
                  onClick={() => setByproducts((prev) => prev.filter((_, idx) => idx !== i))}
                  className="btn-ghost"
                  aria-label={ar ? "حذف المنتج الثانوي" : "Remove byproduct"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
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
