import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import "../daylight.css";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, { ar: string; en: string }> = {
  CASH: { ar: "نقداً", en: "Cash" },
  BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer" },
  CHEQUE: { ar: "شيك", en: "Cheque" },
  CARD: { ar: "بطاقة", en: "Card" },
  OTHER: { ar: "أخرى", en: "Other" },
};

export default async function PaymentsPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const payments = await prisma.payment.findMany({
    orderBy: { paidAt: "desc" },
    include: { customerRef: true, invoice: true, treasury: true },
    take: 100,
  });

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الدفعات" : "Payments"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(payments.length)} دفعة` : `${formatNumber(payments.length)} payments`}
              {" · "}
              {ar ? "إجمالي" : "total"}: {formatMoney(totalReceived)}
            </p>
          </div>
          {canManage ? (
            <Link href="/payments/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "دفعة جديدة" : "New payment"}
            </Link>
          ) : null}
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={ar ? "لا دفعات بعد" : "No payments yet"}
            description={
              ar
                ? "سجّل دفعة عميل لتطبيقها على فاتورة أو كدفعة على الحساب."
                : "Record a customer payment against an invoice or on-account."
            }
            action={
              canManage ? (
                <Link href="/payments/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "دفعة جديدة" : "New payment"}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "العميل" : "Client"}</th>
                  <th>{ar ? "الفاتورة" : "Invoice"}</th>
                  <th>{ar ? "الخزينة" : "Treasury"}</th>
                  <th>{ar ? "الطريقة" : "Method"}</th>
                  <th>{ar ? "التاريخ" : "Date"}</th>
                  <th>{ar ? "المبلغ" : "Amount"}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const method = METHOD_LABEL[p.method] ?? { ar: p.method, en: p.method };
                  return (
                    <tr key={p.id}>
                      <td className="font-mono">{p.paymentNumber}</td>
                      <td>{p.customerRef.name}</td>
                      <td className="font-mono">{p.invoice?.invoiceNumber ?? "—"}</td>
                      <td>{p.treasury.name}</td>
                      <td>{ar ? method.ar : method.en}</td>
                      <td>{formatDate(p.paidAt, ar ? "ar" : "en")}</td>
                      <td className="font-mono">{formatMoney(Number(p.amount), p.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
