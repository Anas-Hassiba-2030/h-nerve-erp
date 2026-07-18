"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createOrder } from "./actions";

type BomOption = {
  id: string;
  bomNumber: string;
  name: string;
  outputQty: number;
  productName: string;
};

export function OrderForm({ boms, ar }: { boms: BomOption[]; ar: boolean }) {
  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [runs, setRuns] = useState("1");

  const bom = boms.find((b) => b.id === bomId);
  const outputUnits = bom ? bom.outputQty * (Number(runs) || 0) : 0;

  if (boms.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar
            ? "لا توجد قوائم مواد بعد. أنشئ قائمة مواد أولاً."
            : "No bills of materials yet. Create a BOM first."}
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/manufacturing/boms/new" className="btn btn-primary">
            {ar ? "إنشاء قائمة مواد" : "Create a BOM"}
          </Link>
          <Link href="/manufacturing" className="btn-ghost inline-flex">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة" : "Back"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={createOrder} className="card card-pad space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "قائمة المواد" : "Bill of materials"} *</label>
          <select
            name="bomId"
            className="select"
            required
            value={bomId}
            onChange={(e) => setBomId(e.target.value)}
          >
            {boms.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bomNumber} — {b.name} → {b.productName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "عدد الدورات" : "Runs"}</label>
          <input
            type="number"
            name="runs"
            min={1}
            className="input"
            value={runs}
            onChange={(e) => setRuns(e.target.value)}
          />
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
        {ar
          ? `الناتج المتوقع: ${outputUnits} وحدة`
          : `Expected output: ${outputUnits} units`}
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
        <textarea name="note" rows={3} className="textarea" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/manufacturing" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {ar ? "إنشاء أمر التصنيع" : "Create order"}
        </button>
      </div>
    </form>
  );
}
