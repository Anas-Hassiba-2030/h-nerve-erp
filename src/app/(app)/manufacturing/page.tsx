import Link from "next/link";
import { Plus, Factory, ListTree, Workflow } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  startOrder, completeOrder, cancelOrder,
  startWorkOrder, completeWorkOrder, cancelWorkOrder,
} from "./actions";
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
    include: {
      bom: { include: { product: true } },
      workOrders: { orderBy: { sequence: "asc" }, include: { workCenter: true } },
    },
    take: 100,
  });

  // Routed orders currently in progress — their stages render below the table.
  const activeRouted = orders.filter(
    (o) => o.status === "IN_PROGRESS" && o.workOrders.length > 0,
  );

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
            <Link href="/manufacturing/workcenters" className="btn-ghost">
              <Workflow className="h-4 w-4" />
              {ar ? "مراكز العمل" : "Work centers"}
            </Link>
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
                  <th>{ar ? "المراحل" : "Stages"}</th>
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
                      <td className="font-mono">
                        {o.workOrders.length > 0
                          ? `${o.workOrders.filter((w) => w.status === "DONE").length}/${o.workOrders.length}`
                          : "—"}
                      </td>
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

        {activeRouted.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-base font-bold">
              {ar ? "مراحل الأوامر الجارية" : "Stages of orders in progress"}
            </h2>
            {activeRouted.map((o) => {
              // First non-terminal stage is the only startable one (sequential
              // routing — matches the server-side gate in startWorkOrder).
              const nextIdx = o.workOrders.findIndex(
                (w) => w.status !== "DONE" && w.status !== "CANCELLED",
              );
              return (
                <div key={o.id} className="card card-pad space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">
                      <span className="font-mono">{o.orderNumber}</span> · {o.bom.product.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                      {formatNumber(o.workOrders.filter((w) => w.status === "DONE").length)}/
                      {formatNumber(o.workOrders.length)} {ar ? "مرحلة مكتملة" : "stages done"}
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{ar ? "المرحلة" : "Stage"}</th>
                          <th>{ar ? "مركز العمل" : "Work center"}</th>
                          <th>{ar ? "الدقائق المخططة" : "Planned min"}</th>
                          <th>{ar ? "الحالة" : "Status"}</th>
                          {canManage ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {o.workOrders.map((w, i) => {
                          const ws = STATUS_LABEL[w.status === "PENDING" ? "DRAFT" : w.status] ?? {
                            ar: w.status,
                            en: w.status,
                          };
                          return (
                            <tr key={w.id}>
                              <td className="font-mono">{w.sequence}</td>
                              <td>{w.name}</td>
                              <td>{w.workCenter.name}</td>
                              <td className="font-mono">{formatNumber(Number(w.plannedMinutes))}</td>
                              <td>
                                <span className={STATUS_BADGE[w.status === "PENDING" ? "DRAFT" : w.status] ?? "badge-slate"}>
                                  {w.status === "PENDING" ? (ar ? "بالانتظار" : "Pending") : ar ? ws.ar : ws.en}
                                </span>
                              </td>
                              {canManage ? (
                                <td>
                                  {w.status === "PENDING" && i === nextIdx ? (
                                    <form action={startWorkOrder} className="inline-flex">
                                      <input type="hidden" name="id" value={w.id} />
                                      <button type="submit" className="btn-ghost text-sm">
                                        {ar ? "بدء المرحلة" : "Start stage"}
                                      </button>
                                    </form>
                                  ) : null}
                                  {w.status === "IN_PROGRESS" ? (
                                    <div className="flex items-center gap-2">
                                      <form action={completeWorkOrder} className="inline-flex items-center gap-2">
                                        <input type="hidden" name="id" value={w.id} />
                                        <input
                                          type="number"
                                          name="actualMinutes"
                                          min={0}
                                          placeholder={ar ? "دقائق فعلية" : "Actual min"}
                                          className="input"
                                          style={{ width: 110, paddingBlock: 4 }}
                                        />
                                        <button type="submit" className="btn-ghost text-sm">
                                          {ar ? "إنهاء" : "Done"}
                                        </button>
                                      </form>
                                      <form action={cancelWorkOrder} className="inline-flex">
                                        <input type="hidden" name="id" value={w.id} />
                                        <button type="submit" className="btn-ghost text-sm">
                                          {ar ? "إلغاء" : "Cancel"}
                                        </button>
                                      </form>
                                    </div>
                                  ) : null}
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
