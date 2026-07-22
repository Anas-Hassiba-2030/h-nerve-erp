// /maintenance — docs/HOURANI-ERP-GAPS.md #5 🟠. FixedAsset (Phase 27)
// and WorkCenter (manufacturing) already exist; this adds the order
// that links them, and starting one takes its work centre offline
// (lib/maintenance/maintenance.ts + actions.ts).
import { Wrench } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDateTime } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { createMaintenanceOrder, startMaintenanceOrder, completeMaintenanceOrder, cancelMaintenanceOrder } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "badge-slate",
  IN_PROGRESS: "badge-amber",
  DONE: "badge-emerald",
  CANCELLED: "badge-red",
};
const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  SCHEDULED: { ar: "مجدول", en: "Scheduled" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  DONE: { ar: "منجز", en: "Done" },
  CANCELLED: { ar: "ملغى", en: "Cancelled" },
};
const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  CORRECTIVE: { ar: "تصحيحية", en: "Corrective" },
  PREVENTIVE: { ar: "وقائية", en: "Preventive" },
};

export default async function MaintenancePage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [orders, assets, workCenters] = await Promise.all([
    prisma.maintenanceOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { asset: { select: { name: true } }, workCenter: { select: { name: true, active: true } } },
    }),
    prisma.fixedAsset.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.workCenter.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
  ]);

  const openCount = orders.filter((o) => o.status === "SCHEDULED" || o.status === "IN_PROGRESS").length;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{ar ? "الصيانة" : "Maintenance"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar ? `${openCount} أمر مفتوح` : `${openCount} open order(s)`}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "أمر صيانة جديد" : "New maintenance order"}</summary>
            <form action={createMaintenanceOrder} className="grid gap-4 sm:grid-cols-2 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "النوع" : "Type"}</label>
                <select name="type" className="select" defaultValue="CORRECTIVE">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {ar ? v.ar : v.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "التاريخ المجدول" : "Scheduled date"}</label>
                <input type="date" name="scheduledAt" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الأصل الثابت" : "Fixed asset"}</label>
                <select name="assetId" className="select" defaultValue="">
                  <option value="">—</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "مركز العمل" : "Work centre"}</label>
                <select name="workCenterId" className="select" defaultValue="">
                  <option value="">—</option>
                  {workCenters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.active ? "" : ar ? "(غير متاح)" : "(offline)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">{ar ? "الوصف" : "Description"} *</label>
                <input name="description" className="input" required maxLength={300} />
              </div>
              <p className="sm:col-span-2" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                {ar ? "اختر أصلاً ثابتاً أو مركز عمل، وليس كليهما." : "Choose a fixed asset OR a work centre, not both."}
              </p>
              <button type="submit" className="btn btn-primary sm:col-span-2">
                {ar ? "إنشاء" : "Create"}
              </button>
            </form>
          </details>
        ) : null}

        {orders.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={ar ? "لا أوامر صيانة بعد" : "No maintenance orders yet"}
            description={ar ? "أنشئ أمر صيانة أعلاه." : "Create a maintenance order above."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الوصف" : "Description"}</th>
                  <th>{ar ? "النوع" : "Type"}</th>
                  <th>{ar ? "الأصل / المركز" : "Asset / Centre"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "التكلفة" : "Cost"}</th>
                  <th>{ar ? "آخر تحديث" : "Updated"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.description}</td>
                    <td>{ar ? TYPE_LABEL[o.type]?.ar : TYPE_LABEL[o.type]?.en}</td>
                    <td>{o.asset?.name ?? o.workCenter?.name ?? "—"}</td>
                    <td>
                      <span className={STATUS_BADGE[o.status] ?? "badge-slate"}>
                        {ar ? STATUS_LABEL[o.status]?.ar : STATUS_LABEL[o.status]?.en}
                      </span>
                    </td>
                    <td className="font-mono" style={{ textAlign: "end" }}>
                      {o.cost !== null ? formatMoney(Number(o.cost)) : "—"}
                    </td>
                    <td>{formatDateTime(o.completedAt ?? o.startedAt ?? o.createdAt, ar ? "ar" : "en")}</td>
                    {canManage ? (
                      <td className="flex gap-2">
                        {o.status === "SCHEDULED" ? (
                          <form action={startMaintenanceOrder}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "بدء" : "Start"}
                            </button>
                          </form>
                        ) : null}
                        {o.status === "IN_PROGRESS" ? (
                          <form action={completeMaintenanceOrder} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={o.id} />
                            <input type="number" step="0.01" name="cost" className="input font-mono" style={{ width: 90 }} placeholder={ar ? "التكلفة" : "cost"} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "إنجاز" : "Complete"}
                            </button>
                          </form>
                        ) : null}
                        {["SCHEDULED", "IN_PROGRESS"].includes(o.status) ? (
                          <form action={cancelMaintenanceOrder}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "إلغاء" : "Cancel"}
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
