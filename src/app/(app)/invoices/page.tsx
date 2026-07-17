import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteInvoice } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft" },
  UNPAID: { ar: "غير مدفوعة", en: "Unpaid" },
  PARTIAL: { ar: "مدفوعة جزئياً", en: "Partial" },
  DUE: { ar: "مستحقة", en: "Due" },
  OVERDUE: { ar: "متأخرة", en: "Overdue" },
  PAID: { ar: "مدفوعة", en: "Paid" },
  OVERPAID: { ar: "مدفوعة زيادة", en: "Overpaid" },
  CANCELLED: { ar: "ملغاة", en: "Cancelled" },
};
const PAYABLE_STATUSES = new Set(["UNPAID", "PARTIAL", "DUE", "OVERDUE"]);

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-slate",
  UNPAID: "badge-amber",
  PARTIAL: "badge-sky",
  DUE: "badge-gold",
  OVERDUE: "badge-red",
  PAID: "badge-emerald",
  OVERPAID: "badge-violet",
  CANCELLED: "badge-slate",
};

export default async function InvoicesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null },
    orderBy: { issueDate: "desc" },
    include: { customerRef: true },
    take: 100,
  });

  const totalOutstanding = invoices
    .filter((i) => !["PAID", "CANCELLED"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الفواتير" : "Invoices"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(invoices.length)} فاتورة` : `${formatNumber(invoices.length)} invoices`}
              {" · "}
              {ar ? "مستحق" : "outstanding"}: {formatMoney(totalOutstanding)}
            </p>
          </div>
          {canManage ? (
            <Link href="/invoices/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "فاتورة جديدة" : "New invoice"}
            </Link>
          ) : null}
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={ar ? "لا فواتير بعد" : "No invoices yet"}
            description={
              ar
                ? "أصدر أول فاتورة لبدء تتبع المبيعات والمستحقات."
                : "Issue your first invoice to start tracking sales and receivables."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "العميل" : "Client"}</th>
                  <th>{ar ? "تاريخ الإصدار" : "Issue date"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "الإجمالي" : "Total"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const status = STATUS_LABEL[inv.status] ?? { ar: inv.status, en: inv.status };
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono">{inv.invoiceNumber}</td>
                      <td>{inv.customerRef.name}</td>
                      <td>{formatDate(inv.issueDate, ar ? "ar" : "en")}</td>
                      <td>
                        <span className={STATUS_BADGE[inv.status] ?? "badge-slate"}>{ar ? status.ar : status.en}</span>
                      </td>
                      <td className="font-mono">{formatMoney(Number(inv.total), inv.currency)}</td>
                      {canManage ? (
                        <td className="flex gap-2">
                          {PAYABLE_STATUSES.has(inv.status) ? (
                            <Link
                              href={`/payments/new?customerId=${inv.customerId}&invoiceId=${inv.id}`}
                              className="btn-ghost text-sm"
                            >
                              {ar ? "تسجيل دفعة" : "Record payment"}
                            </Link>
                          ) : null}
                          <form action={deleteInvoice}>
                            <input type="hidden" name="id" value={inv.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "حذف" : "Delete"}
                            </button>
                          </form>
                        </td>
                      ) : null}
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
