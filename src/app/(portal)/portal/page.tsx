import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getCurrentPortalCustomer } from "@/lib/auth/portalSession";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { computeOutstandingBalance } from "@/lib/portal/portal";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft" },
  UNPAID: { ar: "غير مدفوعة", en: "Unpaid" },
  PARTIAL: { ar: "مدفوعة جزئياً", en: "Partial" },
  DUE: { ar: "مستحقة", en: "Due" },
  OVERDUE: { ar: "متأخرة", en: "Overdue" },
  PAID: { ar: "مدفوعة", en: "Paid" },
  OVERPAID: { ar: "مدفوعة بزيادة", en: "Overpaid" },
  CANCELLED: { ar: "ملغاة", en: "Cancelled" },
};
const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-slate",
  UNPAID: "badge-amber",
  PARTIAL: "badge-amber",
  DUE: "badge-amber",
  OVERDUE: "badge-red",
  PAID: "badge-emerald",
  OVERPAID: "badge-emerald",
  CANCELLED: "badge-slate",
};

export default async function PortalDashboardPage() {
  const ar = (await getLocale()) === "ar";
  const customer = await getCurrentPortalCustomer();
  if (!customer) return null; // layout already redirects; guards TS

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.customerId, deletedAt: null },
    orderBy: { issueDate: "desc" },
    include: { payments: true },
    take: 100,
  });

  const balanceInputs = invoices.map((i) => ({
    status: i.status,
    total: Number(i.total),
    paid: i.payments.reduce((sum, p) => sum + Number(p.amount), 0),
  }));
  const balance = computeOutstandingBalance(balanceInputs);

  return (
    <div className="space-y-6">
      <div className="card card-pad">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {ar ? "الرصيد المستحق" : "Outstanding balance"}
        </p>
        <p className="text-2xl font-bold">{formatMoney(balance)}</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={ar ? "لا توجد فواتير بعد" : "No invoices yet"}
          description={ar ? "ستظهر فواتيرك هنا فور إصدارها." : "Your invoices will appear here once issued."}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{ar ? "الرقم" : "Number"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "الإجمالي" : "Total"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = STATUS_LABEL[inv.status] ?? { ar: inv.status, en: inv.status };
                return (
                  <tr key={inv.id}>
                    <td className="font-mono">{inv.invoiceNumber}</td>
                    <td>{formatDate(inv.issueDate, ar ? "ar" : "en")}</td>
                    <td className="font-mono">{formatMoney(Number(inv.total))}</td>
                    <td>
                      <span className={STATUS_BADGE[inv.status] ?? "badge-slate"}>
                        {ar ? status.ar : status.en}
                      </span>
                    </td>
                    <td>
                      <Link href={`/portal/invoices/${inv.id}`} className="btn-ghost text-sm">
                        {ar ? "عرض" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
