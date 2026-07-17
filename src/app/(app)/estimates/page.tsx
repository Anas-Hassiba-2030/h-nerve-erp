import Link from "next/link";
import { Plus, FileSpreadsheet } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteEstimate, convertToInvoice } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft" },
  SENT: { ar: "مرسل", en: "Sent" },
  ACCEPTED: { ar: "مقبول", en: "Accepted" },
  DECLINED: { ar: "مرفوض", en: "Declined" },
  EXPIRED: { ar: "منتهي", en: "Expired" },
  CONVERTED: { ar: "تم تحويله لفاتورة", en: "Converted" },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-slate",
  SENT: "badge-blue",
  ACCEPTED: "badge-emerald",
  DECLINED: "badge-red",
  EXPIRED: "badge-slate",
  CONVERTED: "badge-violet",
};

export default async function EstimatesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const estimates = await prisma.estimate.findMany({
    where: { deletedAt: null },
    orderBy: { issueDate: "desc" },
    include: { customerRef: true },
    take: 100,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "عروض الأسعار" : "Estimates"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(estimates.length)} عرض سعر` : `${formatNumber(estimates.length)} estimates`}
            </p>
          </div>
          {canManage ? (
            <Link href="/estimates/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "عرض سعر جديد" : "New estimate"}
            </Link>
          ) : null}
        </div>

        {estimates.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title={ar ? "لا عروض أسعار بعد" : "No estimates yet"}
            description={
              ar
                ? "أنشئ عرض سعر لعميل، ثم حوّله إلى فاتورة عند الموافقة."
                : "Create an estimate for a client, then convert it to an invoice once accepted."
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
                {estimates.map((est) => {
                  const status = STATUS_LABEL[est.status] ?? { ar: est.status, en: est.status };
                  const canConvert = canManage && est.status !== "CONVERTED";
                  return (
                    <tr key={est.id}>
                      <td className="font-mono">{est.estimateNumber}</td>
                      <td>{est.customerRef.name}</td>
                      <td>{formatDate(est.issueDate, ar ? "ar" : "en")}</td>
                      <td>
                        <span className={STATUS_BADGE[est.status] ?? "badge-slate"}>{ar ? status.ar : status.en}</span>
                      </td>
                      <td className="font-mono">{formatMoney(Number(est.total), est.currency)}</td>
                      {canManage ? (
                        <td className="flex gap-2">
                          {canConvert ? (
                            <form action={convertToInvoice}>
                              <input type="hidden" name="id" value={est.id} />
                              <button type="submit" className="btn-ghost text-sm">
                                {ar ? "تحويل إلى فاتورة" : "Convert to invoice"}
                              </button>
                            </form>
                          ) : null}
                          <form action={deleteEstimate}>
                            <input type="hidden" name="id" value={est.id} />
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
