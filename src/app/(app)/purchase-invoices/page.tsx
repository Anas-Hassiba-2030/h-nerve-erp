import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deletePurchaseInvoice } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

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

export default async function PurchaseInvoicesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: { deletedAt: null },
    orderBy: { issueDate: "desc" },
    include: { supplierRef: true },
    take: 100,
  });

  const totalPayable = purchaseInvoices
    .filter((i) => !["PAID", "CANCELLED"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "فواتير المشتريات" : "Purchase Invoices"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(purchaseInvoices.length)} فاتورة`
                : `${formatNumber(purchaseInvoices.length)} purchase invoices`}
              {" · "}
              {ar ? "مستحق الدفع" : "payable"}: {formatMoney(totalPayable)}
            </p>
          </div>
          {canManage ? (
            <Link href="/purchase-invoices/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "فاتورة مشتريات جديدة" : "New purchase invoice"}
            </Link>
          ) : null}
        </div>

        {purchaseInvoices.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={ar ? "لا فواتير مشتريات بعد" : "No purchase invoices yet"}
            description={
              ar
                ? "سجّل أول فاتورة مشتريات لبدء تتبع المستحقات للموردين."
                : "Record your first purchase invoice to start tracking payables to suppliers."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "المورّد" : "Supplier"}</th>
                  <th>{ar ? "تاريخ الإصدار" : "Issue date"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "الإجمالي" : "Total"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {purchaseInvoices.map((inv) => {
                  const status = STATUS_LABEL[inv.status] ?? { ar: inv.status, en: inv.status };
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono">{inv.purchaseInvoiceNumber}</td>
                      <td>{inv.supplierRef.name}</td>
                      <td>{formatDate(inv.issueDate, ar ? "ar" : "en")}</td>
                      <td>
                        <span className={STATUS_BADGE[inv.status] ?? "badge-slate"}>{ar ? status.ar : status.en}</span>
                      </td>
                      <td className="font-mono">{formatMoney(Number(inv.total), inv.currency)}</td>
                      {canManage ? (
                        <td>
                          <div className="flex items-center gap-2">
                            {PAYABLE_STATUSES.has(inv.status) ? (
                              <Link
                                href={`/purchase-payments/new?supplierId=${inv.supplierId}&purchaseInvoiceId=${inv.id}`}
                                className="btn-ghost text-sm"
                              >
                                {ar ? "تسجيل دفعة" : "Record payment"}
                              </Link>
                            ) : null}
                            <form action={deletePurchaseInvoice}>
                              <input type="hidden" name="id" value={inv.id} />
                              <button type="submit" className="btn-ghost text-sm">
                                {ar ? "حذف" : "Delete"}
                              </button>
                            </form>
                          </div>
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
