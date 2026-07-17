"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupplierPayment } from "./actions";

type Supplier = { id: string; name: string };
type Treasury = { id: string; name: string; currency: string };
type PurchaseInvoiceOption = {
  id: string;
  supplierId: string;
  purchaseInvoiceNumber: string;
  total: number;
  paid: number;
  currency: string;
};

const METHODS = [
  ["CASH", { ar: "نقداً", en: "Cash" }],
  ["BANK_TRANSFER", { ar: "تحويل بنكي", en: "Bank transfer" }],
  ["CHEQUE", { ar: "شيك", en: "Cheque" }],
  ["CARD", { ar: "بطاقة", en: "Card" }],
  ["OTHER", { ar: "أخرى", en: "Other" }],
] as const;

export function SupplierPaymentForm({
  suppliers,
  treasuries,
  purchaseInvoices,
  ar,
  defaultSupplierId,
  defaultPurchaseInvoiceId,
}: {
  suppliers: Supplier[];
  treasuries: Treasury[];
  purchaseInvoices: PurchaseInvoiceOption[];
  ar: boolean;
  defaultSupplierId?: string;
  defaultPurchaseInvoiceId?: string;
}) {
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? suppliers[0]?.id ?? "");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState(defaultPurchaseInvoiceId ?? "");

  const supplierInvoices = useMemo(
    () => purchaseInvoices.filter((i) => i.supplierId === supplierId),
    [purchaseInvoices, supplierId],
  );
  const selected = supplierInvoices.find((i) => i.id === purchaseInvoiceId);
  const outstanding = selected ? selected.total - selected.paid : undefined;

  if (suppliers.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar ? "لا يوجد موردون بعد." : "No suppliers yet."}
        </p>
        <Link href="/suppliers/new" className="btn btn-primary mt-4 inline-flex">
          {ar ? "إضافة مورّد" : "Add a supplier"}
        </Link>
      </div>
    );
  }
  if (treasuries.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar ? "لا خزائن بعد. أضف خزينة للدفع منها." : "No treasuries yet. Add one to pay from."}
        </p>
        <Link href="/treasuries/new" className="btn btn-primary mt-4 inline-flex">
          {ar ? "إضافة خزينة" : "Add a treasury"}
        </Link>
      </div>
    );
  }

  return (
    <form action={createSupplierPayment} className="card card-pad space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "المورّد" : "Supplier"} *</label>
        <select
          name="supplierId"
          className="select"
          required
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPurchaseInvoiceId("");
          }}
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {ar ? "فاتورة المشتريات (اختياري)" : "Purchase invoice (optional)"}
        </label>
        <select
          name="purchaseInvoiceId"
          className="select"
          value={purchaseInvoiceId}
          onChange={(e) => setPurchaseInvoiceId(e.target.value)}
        >
          <option value="">{ar ? "دفعة على الحساب (بلا فاتورة)" : "On-account payment (no invoice)"}</option>
          {supplierInvoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.purchaseInvoiceNumber} — {ar ? "مستحق" : "due"} {(i.total - i.paid).toFixed(2)} {i.currency}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "المبلغ" : "Amount"} *</label>
          <input
            type="number"
            name="amount"
            min={0}
            step="0.01"
            className="input"
            required
            defaultValue={outstanding !== undefined ? outstanding.toFixed(2) : undefined}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "العملة" : "Currency"}</label>
          <input name="currency" defaultValue="JOD" className="input font-mono uppercase" maxLength={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "الخزينة (الدفع منها)" : "Treasury (pay from)"} *</label>
          <select name="treasuryId" className="select" required>
            {treasuries.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "طريقة الدفع" : "Method"}</label>
          <select name="method" defaultValue="CASH" className="select">
            {METHODS.map(([v, l]) => (
              <option key={v} value={v}>
                {ar ? l.ar : l.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الدفع" : "Paid on"}</label>
          <input type="date" name="paidAt" className="input" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
        <textarea name="note" rows={2} className="textarea" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <Link href="/purchase-payments" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "العودة" : "Back"}
        </Link>
        <button type="submit" className="btn btn-primary">
          {ar ? "تسجيل الدفعة" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
