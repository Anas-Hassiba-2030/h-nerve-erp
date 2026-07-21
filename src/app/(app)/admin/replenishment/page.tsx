import Link from "next/link";
import { ArrowLeft, PackageSearch, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { suggestOrderQty } from "@/lib/supply/replenishment";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import {
  saveReorderRule, toggleReorderRule, deleteReorderRule, draftReplenishmentPOs,
} from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function ReplenishmentPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [rules, products] = await Promise.all([
    prisma.reorderRule.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, quantity: true, deletedAt: true,
            supplierRef: { select: { name: true } },
          },
        },
      },
      take: 300,
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
      take: 500,
    }),
  ]);

  const liveRules = rules.filter((r) => !r.product.deletedAt);
  const needs = liveRules
    .filter((r) => r.active)
    .map((r) => ({
      rule: r,
      orderQty: suggestOrderQty({
        onHand: r.product.quantity,
        minQty: r.minQty,
        maxQty: r.maxQty,
        qtyMultiple: r.qtyMultiple,
      }),
    }))
    .filter((n) => n.orderQty > 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "إعادة التزويد" : "Replenishment"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(liveRules.length)} قاعدة إعادة طلب · ${formatNumber(needs.length)} منتج تحت الحد الأدنى`
                : `${formatNumber(liveRules.length)} reorder rules · ${formatNumber(needs.length)} products below minimum`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/purchase-orders" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "أوامر الشراء" : "Purchase orders"}
            </Link>
          </div>
        </div>

        <AdminFamilyNav current="/admin/replenishment" ar={ar} />

        <div className="card card-pad space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-bold">
                {ar ? "النواقص الحالية" : "Current needs"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                {ar
                  ? "منتجات هبط مخزونها تحت الحد الأدنى — الكمية المقترحة تعيده إلى الحد الأقصى (مقرّبة لمضاعف الطلب)."
                  : "Products whose stock fell below the rule minimum — the suggested quantity restores the maximum (snapped to the order multiple)."}
              </div>
            </div>
            {canManage && needs.length > 0 ? (
              <form action={draftReplenishmentPOs}>
                <button type="submit" className="btn btn-primary">
                  <RefreshCw className="h-4 w-4" />
                  {ar ? "إنشاء مسودات أوامر الشراء" : "Draft purchase orders"}
                </button>
              </form>
            ) : null}
          </div>

          {needs.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? "لا نقص حالياً — كل المنتجات المراقبة فوق حدّها الأدنى."
                : "Nothing to order — every monitored product is above its minimum."}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? "المنتج" : "Product"}</th>
                    <th>{ar ? "المورّد" : "Supplier"}</th>
                    <th>{ar ? "المتوفر" : "On hand"}</th>
                    <th>{ar ? "الحد الأدنى" : "Min"}</th>
                    <th>{ar ? "الحد الأقصى" : "Max"}</th>
                    <th>{ar ? "الكمية المقترحة" : "Suggested qty"}</th>
                  </tr>
                </thead>
                <tbody>
                  {needs.map(({ rule, orderQty }) => (
                    <tr key={rule.id}>
                      <td>
                        {rule.product.name}{" "}
                        <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                          {rule.product.sku}
                        </span>
                      </td>
                      <td>
                        {rule.product.supplierRef?.name ?? (
                          <span className="badge-amber">{ar ? "بلا مورّد" : "No supplier"}</span>
                        )}
                      </td>
                      <td className="font-mono">{formatNumber(rule.product.quantity)}</td>
                      <td className="font-mono">{formatNumber(rule.minQty)}</td>
                      <td className="font-mono">{formatNumber(rule.maxQty)}</td>
                      <td className="font-mono font-bold">{formatNumber(orderQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManage ? (
          <form action={saveReorderRule} className="card card-pad space-y-4" noValidate>
            <div className="text-sm font-bold">
              {ar ? "قاعدة إعادة طلب (إنشاء أو تعديل)" : "Reorder rule (create or update)"}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المنتج" : "Product"} *</label>
                <select name="productId" className="select" required>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحد الأدنى" : "Min qty"}</label>
                <input type="number" name="minQty" min={0} defaultValue={10} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحد الأقصى" : "Max qty"}</label>
                <input type="number" name="maxQty" min={1} defaultValue={50} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "مضاعف الطلب" : "Order multiple"}
                </label>
                <input type="number" name="qtyMultiple" min={1} defaultValue={1} className="input" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                {ar ? "حفظ القاعدة" : "Save rule"}
              </button>
            </div>
          </form>
        ) : null}

        {liveRules.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={ar ? "لا قواعد إعادة طلب بعد" : "No reorder rules yet"}
            description={
              ar
                ? "حدّد حداً أدنى وأقصى لكل منتج حرج — وسيقترح النظام أوامر الشراء تلقائياً عندما يهبط المخزون."
                : "Set a min/max per critical product — the system then suggests purchase orders whenever stock drops."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "المنتج" : "Product"}</th>
                  <th>{ar ? "المتوفر" : "On hand"}</th>
                  <th>{ar ? "أدنى / أقصى" : "Min / max"}</th>
                  <th>{ar ? "المضاعف" : "Multiple"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {liveRules.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.product.name}{" "}
                      <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                        {r.product.sku}
                      </span>
                    </td>
                    <td className="font-mono">{formatNumber(r.product.quantity)}</td>
                    <td className="font-mono">
                      {formatNumber(r.minQty)} / {formatNumber(r.maxQty)}
                    </td>
                    <td className="font-mono">{formatNumber(r.qtyMultiple)}</td>
                    <td>
                      <span className={r.active ? "badge-emerald" : "badge-slate"}>
                        {r.active ? (ar ? "فعّالة" : "Active") : ar ? "موقوفة" : "Paused"}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="flex gap-2">
                        <form action={toggleReorderRule}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="btn-ghost text-sm">
                            {r.active ? (ar ? "إيقاف" : "Pause") : ar ? "تفعيل" : "Resume"}
                          </button>
                        </form>
                        <form action={deleteReorderRule}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="btn-ghost text-sm">
                            {ar ? "حذف" : "Delete"}
                          </button>
                        </form>
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
