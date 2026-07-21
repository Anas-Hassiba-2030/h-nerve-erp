import Link from "next/link";
import { ArrowLeft, CalendarRange, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { explodeIndirectDemand, rollForwardMps, generatePeriods } from "@/lib/supply/mps";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { saveMpsForecast, deleteMpsForecast, draftMpsReplenishmentPO } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function MpsPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  // Rolling 3-month window, anchored on "today" — every visit re-opens
  // period 1 with the REAL current on-hand, exactly like Odoo's MPS grid.
  const periods = generatePeriods(new Date(), 3);

  const [forecasts, products, reorderRuleProductIds] = await Promise.all([
    prisma.mpsForecast.findMany({
      where: { deletedAt: null, period: { in: periods } },
      orderBy: [{ productId: "asc" }, { period: "asc" }],
      include: { product: { select: { id: true, sku: true, name: true, quantity: true, deletedAt: true, supplierId: true } } },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
      take: 500,
    }),
    prisma.reorderRule.findMany({ where: { deletedAt: null }, select: { productId: true } }),
  ]);

  const liveForecasts = forecasts.filter((f) => !f.product.deletedAt);
  const productIds = [...new Set(liveForecasts.map((f) => f.productId))];
  const reorderedProductIds = new Set(reorderRuleProductIds.map((r) => r.productId));

  const [bomLines, allParentDemands] = await Promise.all([
    productIds.length
      ? prisma.bomLine.findMany({
          where: { componentProductId: { in: productIds }, bom: { deletedAt: null } },
          select: { componentProductId: true, quantity: true, bom: { select: { productId: true, outputQty: true } } },
        })
      : Promise.resolve([]),
    prisma.mpsForecast.findMany({
      where: { deletedAt: null, period: { in: periods } },
      select: { productId: true, period: true, forecastedDemand: true },
    }),
  ]);

  const schedulesByProduct = productIds.map((productId) => {
    const rows = liveForecasts.filter((f) => f.productId === productId);
    const product = rows[0].product;
    const indirect = explodeIndirectDemand(
      productId,
      bomLines
        .filter((l) => l.componentProductId === productId)
        .map((l) => ({ parentProductId: l.bom.productId, componentProductId: productId, qtyPerUnit: l.quantity / Math.max(1, l.bom.outputQty) })),
      allParentDemands,
    );
    const byPeriod = new Map(rows.map((r) => [r.period, r]));
    const periodRows = periods.map((p) => {
      const f = byPeriod.get(p);
      return {
        period: p,
        forecastId: f?.id ?? null,
        forecastedDemand: f?.forecastedDemand ?? 0,
        indirectDemand: indirect.get(p) ?? 0,
        safetyStockTarget: f?.safetyStockTarget ?? 0,
        minToReplenish: f?.minToReplenish ?? 0,
        maxToReplenish: f?.maxToReplenish ?? 0,
      };
    });
    const schedule = rollForwardMps(periodRows, product.quantity).map((row, i) => ({
      ...row,
      forecastId: periodRows[i].forecastId,
    }));
    return { product, schedule };
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "جدول الإنتاج الرئيسي (MPS)" : "Master Production Schedule (MPS)"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(schedulesByProduct.length)} منتج مُدار · نافذة متجددة 3 أشهر (${periods.join(" / ")})`
                : `${formatNumber(schedulesByProduct.length)} product(s) managed · rolling 3-month window (${periods.join(" / ")})`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/replenishment" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "إعادة التزويد" : "Replenishment"}
            </Link>
          </div>
        </div>

        <AdminFamilyNav current="/admin/mps" ar={ar} />

        <div className="card card-pad" style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
          {ar
            ? "الطلب غير المباشر يُحتسب من BOM أحادي المستوى فقط (طلب المنتجات الأم اليدوي، وليس اقتراحها المحسوب) — لا تكرار حلقي. منتج واحد يُدار إما بـ MPS أو بقاعدة إعادة طلب، وليس الاثنين معاً."
            : "Indirect demand is single-level BOM explosion only (parent products' own MANUAL forecast, never their computed suggestion) — no recursive netting. A product is managed by EITHER MPS or a reorder rule, never both."}
        </div>

        {schedulesByProduct.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={ar ? "لا توقعات إنتاج بعد" : "No production forecasts yet"}
            description={
              ar
                ? "أضف توقع طلب لمنتج وفترة أدناه — سيحسب النظام التزويد المقترح مع تدوير الفترات."
                : "Add a demand forecast for a product/period below — the system computes suggested replenishment with period rollforward."
            }
          />
        ) : (
          <div className="space-y-4">
            {schedulesByProduct.map(({ product, schedule }) => (
              <div key={product.id} className="card card-pad space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-bold">
                    {product.name}{" "}
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                      {product.sku}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    {ar ? "المتوفر الآن" : "On hand now"}: <span className="font-mono font-bold">{formatNumber(product.quantity)}</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{ar ? "الفترة" : "Period"}</th>
                        <th>{ar ? "الافتتاحي" : "Opening"}</th>
                        <th>{ar ? "الطلب المباشر" : "Direct demand"}</th>
                        <th>{ar ? "الطلب غير المباشر" : "Indirect demand"}</th>
                        <th>{ar ? "إجمالي الطلب" : "Total demand"}</th>
                        <th>{ar ? "التزويد المقترح" : "Suggested replenishment"}</th>
                        <th>{ar ? "الختامي المتوقع" : "Forecasted ending"}</th>
                        {canManage ? <th /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr key={row.period}>
                          <td className="font-mono">{row.period}</td>
                          <td className="font-mono">{formatNumber(row.openingStock)}</td>
                          <td className="font-mono">{formatNumber(row.forecastedDemand)}</td>
                          <td className="font-mono">{formatNumber(row.indirectDemand)}</td>
                          <td className="font-mono font-bold">{formatNumber(row.totalDemand)}</td>
                          <td className="font-mono font-bold">
                            {row.suggestedReplenishment > 0 ? formatNumber(row.suggestedReplenishment) : "—"}
                          </td>
                          <td className="font-mono" style={row.forecastedStock < 0 ? { color: "var(--danger, #b42318)" } : undefined}>
                            {formatNumber(row.forecastedStock)}
                          </td>
                          {canManage ? (
                            <td className="flex gap-2">
                              {row.suggestedReplenishment > 0 ? (
                                <form action={draftMpsReplenishmentPO}>
                                  <input type="hidden" name="productId" value={product.id} />
                                  <input type="hidden" name="period" value={row.period} />
                                  <button type="submit" className="btn-ghost text-sm" title={ar ? "تزويد" : "Replenish"}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </form>
                              ) : null}
                              {row.forecastId ? (
                                <form action={deleteMpsForecast}>
                                  <input type="hidden" name="id" value={row.forecastId} />
                                  <button type="submit" className="btn-ghost text-sm">
                                    {ar ? "حذف" : "Delete"}
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
              </div>
            ))}
          </div>
        )}

        {canManage ? (
          <form action={saveMpsForecast} className="card card-pad space-y-4" noValidate>
            <div className="text-sm font-bold">
              {ar ? "توقع طلب (إنشاء أو تعديل)" : "Demand forecast (create or update)"}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">{ar ? "المنتج" : "Product"} *</label>
                <select name="productId" className="select" required>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={reorderedProductIds.has(p.id)}>
                      {p.name} ({p.sku}){reorderedProductIds.has(p.id) ? (ar ? " — له قاعدة إعادة طلب" : " — has a reorder rule") : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الفترة" : "Period"} *</label>
                <select name="period" className="select" required>
                  {periods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الطلب المتوقع" : "Forecasted demand"}</label>
                <input type="number" name="forecastedDemand" min={0} defaultValue={0} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "مخزون الأمان" : "Safety stock"}</label>
                <input type="number" name="safetyStockTarget" min={0} defaultValue={0} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "أدنى تزويد" : "Min replenish"}</label>
                <input type="number" name="minToReplenish" min={0} defaultValue={0} className="input" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "أقصى تزويد (0=بلا حد)" : "Max replenish (0=no cap)"}</label>
                <input type="number" name="maxToReplenish" min={0} defaultValue={0} className="input" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                {ar ? "حفظ التوقع" : "Save forecast"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
