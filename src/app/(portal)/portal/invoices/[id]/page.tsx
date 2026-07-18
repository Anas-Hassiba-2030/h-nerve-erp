import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getCurrentPortalCustomer } from "@/lib/auth/portalSession";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatDate } from "@/lib/utils/utils";

export const dynamic = "force-dynamic";

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ar = (await getLocale()) === "ar";
  const customer = await getCurrentPortalCustomer();
  if (!customer) return null; // layout already redirects

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: true, payments: true },
  });
  // A portal customer may only ever see their OWN invoices — cross-customer
  // ids 404 rather than leak existence via a 403.
  if (!invoice || invoice.deletedAt || invoice.customerId !== customer.customerId) notFound();

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.max(0, Number(invoice.total) - paid);

  return (
    <div className="space-y-6">
      <Link href="/portal" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        {ar ? "العودة" : "Back"}
      </Link>

      <div className="card card-pad space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold font-mono">{invoice.invoiceNumber}</h1>
          <span>{formatDate(invoice.issueDate, ar ? "ar" : "en")}</span>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{ar ? "الوصف" : "Description"}</th>
                <th>{ar ? "الكمية" : "Qty"}</th>
                <th>{ar ? "السعر" : "Price"}</th>
                <th>{ar ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.description}</td>
                  <td className="font-mono">{Number(l.quantity)}</td>
                  <td className="font-mono">{formatMoney(Number(l.unitPrice))}</td>
                  <td className="font-mono">{formatMoney(Number(l.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="space-y-1 text-sm" style={{ minWidth: 220 }}>
            <div className="flex justify-between">
              <span style={{ color: "var(--ink-muted)" }}>{ar ? "الإجمالي الفرعي" : "Subtotal"}</span>
              <span className="font-mono">{formatMoney(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--ink-muted)" }}>{ar ? "الضريبة" : "Tax"}</span>
              <span className="font-mono">{formatMoney(Number(invoice.taxTotal))}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{ar ? "الإجمالي" : "Total"}</span>
              <span className="font-mono">{formatMoney(Number(invoice.total))}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--ink-muted)" }}>{ar ? "المدفوع" : "Paid"}</span>
              <span className="font-mono">{formatMoney(paid)}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ color: balance > 0 ? "#b91c1c" : undefined }}>
              <span>{ar ? "المتبقي" : "Balance"}</span>
              <span className="font-mono">{formatMoney(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {invoice.payments.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{ar ? "رقم الدفعة" : "Payment"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "المبلغ" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono">{p.paymentNumber}</td>
                  <td>{formatDate(p.paidAt, ar ? "ar" : "en")}</td>
                  <td className="font-mono">{formatMoney(Number(p.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
