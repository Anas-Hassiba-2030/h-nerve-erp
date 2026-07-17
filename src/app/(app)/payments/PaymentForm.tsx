"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createPayment } from "./actions";

type Customer = { id: string; name: string };
type Treasury = { id: string; name: string; currency: string };
type InvoiceOption = { id: string; customerId: string; invoiceNumber: string; total: number; paid: number; currency: string };

const METHODS = [
  ["CASH", { ar: "نقداً", en: "Cash" }],
  ["BANK_TRANSFER", { ar: "تحويل بنكي", en: "Bank transfer" }],
  ["CHEQUE", { ar: "شيك", en: "Cheque" }],
  ["CARD", { ar: "بطاقة", en: "Card" }],
  ["OTHER", { ar: "أخرى", en: "Other" }],
] as const;

export function PaymentForm({
  customers,
  treasuries,
  invoices,
  ar,
  defaultCustomerId,
  defaultInvoiceId,
}: {
  customers: Customer[];
  treasuries: Treasury[];
  invoices: InvoiceOption[];
  ar: boolean;
  defaultCustomerId?: string;
  defaultInvoiceId?: string;
}) {
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ?? "");

  const customerInvoices = useMemo(
    () => invoices.filter((i) => i.customerId === customerId),
    [invoices, customerId],
  );
  const selectedInvoice = customerInvoices.find((i) => i.id === invoiceId);
  const outstanding = selectedInvoice ? selectedInvoice.total - selectedInvoice.paid : undefined;

  if (customers.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar ? "لا يوجد عملاء بعد." : "No customers yet."}
        </p>
        <Link href="/customers/new" className="btn btn-primary mt-4 inline-flex">
          {ar ? "إضافة عميل" : "Add a customer"}
        </Link>
      </div>
    );
  }
  if (treasuries.length === 0) {
    return (
      <div className="card card-pad">
        <p style={{ color: "var(--ink-muted)" }}>
          {ar ? "لا خزائن بعد. أضف خزينة لتسجيل الدفعات فيها." : "No treasuries yet. Add one to record payments into."}
        </p>
        <Link href="/treasuries/new" className="btn btn-primary mt-4 inline-flex">
          {ar ? "إضافة خزينة" : "Add a treasury"}
        </Link>
      </div>
    );
  }

  return (
    <form action={createPayment} className="card card-pad space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "العميل" : "Client"} *</label>
        <select
          name="customerId"
          className="select"
          required
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setInvoiceId("");
          }}
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{ar ? "الفاتورة (اختياري)" : "Invoice (optional)"}</label>
        <select name="invoiceId" className="select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
          <option value="">{ar ? "دفعة على الحساب (بلا فاتورة)" : "On-account payment (no invoice)"}</option>
          {customerInvoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.invoiceNumber} — {ar ? "مستحق" : "due"} {(i.total - i.paid).toFixed(2)} {i.currency}
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
          <label className="block text-sm font-medium mb-1">{ar ? "الخزينة" : "Treasury"} *</label>
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
        <Link href="/payments" className="btn-ghost">
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
