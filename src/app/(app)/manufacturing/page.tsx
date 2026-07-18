import Link from "next/link";
import { Plus, Factory, ListTree } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { startOrder, completeOrder, cancelOrder } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft" },
  IN_PROGRESS: { ar: "قيد التصنيع", en: "In progress" },
  DONE: { ar: "مكتمل", en: "Done" },
  CANCELLED: { ar: "ملغى", en: "Cancelled" },
};
const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-slate",
  IN_PROGRESS: "badge-amber",
  DONE: "badge-emerald",
  CANCELLED: "badge-red",
};

export default async function ManufacturingPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const orders = await prisma.manufacturingOrder.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { bom: { include: { product: true } } },
    take: 100,
  });

  const inProgress = orders.filter((o) => o.status === "IN_PROGRESS").length;
  const producedValue = orders
    .filter((o) => o.status === "DONE")
    .reduce((sum, o) => sum + Number(o.totalCost ?? 0), 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "التصنيع" : "Manufacturing"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(orders.length)} أمر · ${formatNumber(inProgress)} قيد التصنيع · القيمة المنتجة ${formatMoney(producedValue)}`
                : `${formatNumber(orders.length)} orders · ${formatNumber(inProgress)} in progress · produced value ${formatMoney(producedValue)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/manufacturing/boms" className="btn-ghost">
              <ListTree className="h-4 w-4" />
              {ar ? "قوائم المواد" : "Bills of materials"}
            </Link>
            {canManage ? (
              <Link href="/manufacturing/new" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "أمر تصنيع جديد" : "New order"}
              </Link>
            ) : null}
          </div>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={Factory}
            title={ar ? "لا أوامر تصنيع بعد" : "No manufacturing orders yet"}
            description={
              ar
                ? "أنشئ قائمة مواد ثم أمر تصنيع لتحويل المواد الخام إلى منتج نهائي."
                : "Create a bill of materials, then a manufacturing order to turn raw materials into finished goods."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "المنتج" : "Product"}</th>
                  <th>{ar ? "الدورات" : "Runs"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "الكلفة" : "Cost"}</th>
                  <th>{ar ? "التاريخ" : "Date"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const status = STATUS_LABEL[o.status] ?? { ar: o.status, en: o.status };
                  return (
                    <tr key={o.id}>
                      <td className="font-mono">{o.orderNumber}</td>
                      <td>{o.bom.product.name}</td>
                      <td className="font-mono">{formatNumber(o.runs)}</td>
                      <td>
                        <span className={STATUS_BADGE[o.status] ?? "badge-slate"}>
                          {ar ? status.ar : status.en}
                        </span>
                      </td>
                      <td className="font-mono">
                        {o.totalCost != null ? formatMoney(Number(o.totalCost)) : "—"}
                      </td>
                      <td>{formatDate(o.completedAt ?? o.createdAt, ar ? "ar" : "en")}</td>
                      {canManage ? (
                        <td className="flex gap-2">
                          {o.status === "DRAFT" ? (
                            <>
                              <form action={startOrder}>
                                <input type="hidden" name="id" value={o.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "بدء" : "Start"}
                                </button>
                              </form>
                              <form action={cancelOrder}>
                                <input type="hidden" name="id" value={o.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "إلغاء" : "Cancel"}
                                </button>
                              </form>
                            </>
                          ) : null}
                          {o.status === "IN_PROGRESS" ? (
                            <>
                              <form action={completeOrder}>
                                <input type="hidden" name="id" value={o.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "إكمال" : "Complete"}
                                </button>
                              </form>
                              <form action={cancelOrder}>
                                <input type="hidden" name="id" value={o.id} />
                                <button type="submit" className="btn-ghost text-sm">
                                  {ar ? "إلغاء" : "Cancel"}
                                </button>
                              </form>
                            </>
                          ) : null}
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
