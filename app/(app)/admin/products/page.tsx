// /admin/products — operational product catalog (Phase 3).
//
// The import endpoint upserts into Product by (tenantId, sku, warehouseId); this is
// the read-only operational view the rest of the ERP reasons about.
// Same placement rationale as /admin/imports: (app) route group for
// Topbar + Heritage Modern. Server component, no client fetching.
// Cross-linked with /admin/imports (SKU ↔ ?sku=, history expands here).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PackageSearch, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import {
  formatDateTime,
  formatNumber,
  formatMoney2,
  MOVEMENT_TYPES_AR,
  MOVEMENT_TYPES_EN,
  movementBadge,
} from "@/lib/utils/utils";
import { AdjustStockForm } from "./AdjustStockForm";
import { ReorderPointForm } from "./ReorderPointForm";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";

import "../../daylight.css";

export const dynamic = "force-dynamic";

// "< 50 units" per the task; lifted to a const so it's configurable later.
const LOW_STOCK = 50;

function relTime(d: Date, ar: boolean): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return ar ? "الآن" : "just now";
  if (m < 60) return ar ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `قبل ${h} ساعة` : `${h}h ago`;
  const dd = Math.floor(h / 24);
  return ar ? `قبل ${dd} يوم` : `${dd}d ago`;
}

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const ar = getLocale() === "ar";
  // Standard (app) gate (mirrors /admin/imports): no session → /login,
  // then role-gate this cross-tenant operational surface.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const q = str(searchParams.q);
  const sku = str(searchParams.sku);
  const supplier = str(searchParams.supplier);
  const warehouse = str(searchParams.warehouse);

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (sku) where.sku = sku;
  if (supplier) where.supplierId = supplier; // supplier param is now a Supplier id
  if (warehouse) where.warehouseRef = { code: warehouse };
  if (q) {
    // SQLite has no case-insensitive `mode` — case-sensitive contains.
    where.OR = [{ sku: { contains: q } }, { name: { contains: q } }];
  }

  // Two reads: KPI/pill aggregates over the WHOLE catalog (stable while
  // filtering), and the filtered list for the table.
  const [catalog, supplierList, products] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { quantity: true, warehouseRef: { select: { code: true } } },
      take: 2000,
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.product.findMany({
      where,
      orderBy: { lastImportedAt: "desc" },
      take: 500,
      include: {
        importRows: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { importLog: { select: { source: true } } },
        },
        movements: {
          where: { deletedAt: null },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 100,
        },
        supplierRef: { select: { name: true } },
        warehouseRef: { select: { code: true } },
      },
    }),
  ]);

  const totalUnits = catalog.reduce((s, p) => s + p.quantity, 0);
  const lowStock = catalog.filter((p) => p.quantity < LOW_STOCK).length;
  // Supplier filter is now real entities (value = id, label = name);
  // warehouse filter is by Warehouse.code (Phase 9 — readable in the URL).
  const suppliers = supplierList.map((s) => ({ value: s.id, label: s.name }));
  const warehouses = [
    ...new Set(
      catalog.map((p) => p.warehouseRef?.code).filter(Boolean) as string[],
    ),
  ]
    .sort()
    .map((w) => ({ value: w, label: w }));

  const dash = "—";

  // Build an href preserving the other params, toggling one key.
  const hrefWith = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sku) p.set("sku", sku);
    if (supplier) p.set("supplier", supplier);
    if (warehouse) p.set("warehouse", warehouse);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  const Pills = ({
    label,
    values,
    active,
    paramKey,
  }: {
    label: string;
    values: { value: string; label: string }[];
    active: string;
    paramKey: string;
  }) =>
    values.length === 0 ? null : (
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--ink-muted)" }}
        >
          {label}
        </span>
        <Link
          href={hrefWith(paramKey, "")}
          className={active ? "badge-slate" : "badge-emerald"}
        >
          {ar ? "الكل" : "All"}
        </Link>
        {values.map((v) => (
          <Link
            key={v.value}
            href={hrefWith(paramKey, v.value)}
            className={active === v.value ? "badge-emerald" : "badge-slate"}
          >
            {v.label}
          </Link>
        ))}
      </div>
    );

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "كتالوج المنتجات" : "Product Catalog"}
        subtitle={
          ar
            ? "مصدر الحقيقة التشغيلي — يُحدَّث بالاستيراد عبر (tenantId, sku, warehouseId)"
            : "Operational source of truth — upserted by import on (tenantId, sku, warehouseId)"
        }
      />

      <AdminFamilyNav current="/admin/products" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "منتجات" : "Products"} value={formatNumber(catalog.length)} />
        <DaylightKpi label={ar ? "وحدات بالمخزون" : "Units in stock"} value={formatNumber(totalUnits)} />
        <DaylightKpi label={ar ? `مخزون منخفض (<${LOW_STOCK})` : `Low stock (<${LOW_STOCK})`} value={formatNumber(lowStock)} />
        <DaylightKpi label={ar ? "موردون" : "Suppliers"} value={formatNumber(suppliers.length)} />
      </DaylightKpiGrid>

      {/* Search + filter pills */}
      <div className="panel reveal flex flex-col gap-3">
        <form method="GET" className="flex items-center gap-2">
          {sku ? <input type="hidden" name="sku" value={sku} /> : null}
          {supplier ? <input type="hidden" name="supplier" value={supplier} /> : null}
          {warehouse ? <input type="hidden" name="warehouse" value={warehouse} /> : null}
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 start-3"
              style={{ color: "var(--ink-muted)" }}
              aria-hidden
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={ar ? "بحث بالـ SKU أو الاسم…" : "Search SKU or name…"}
              className="input w-full ps-9"
              aria-label={ar ? "بحث" : "Search"}
            />
          </div>
          <button type="submit" className="btn-secondary btn-sm">
            {ar ? "بحث" : "Search"}
          </button>
          {(q || sku || supplier || warehouse) && (
            <Link href="/admin/products" className="btn-ghost btn-sm">
              {ar ? "مسح" : "Clear"}
            </Link>
          )}
        </form>
        <Pills label={ar ? "المورّد" : "Supplier"} values={suppliers} active={supplier} paramKey="supplier" />
        <Pills label={ar ? "المستودع" : "Warehouse"} values={warehouses} active={warehouse} paramKey="warehouse" />
      </div>

      {products.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <PackageSearch className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {catalog.length === 0
              ? ar
                ? "لا توجد منتجات بعد"
                : "No products yet"
              : ar
                ? "لا نتائج مطابقة للبحث"
                : "No products match the filter"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {ar
              ? "تُنشأ المنتجات تلقائياً من عمليات الاستيراد عبر n8n."
              : "Products are created automatically from n8n imports."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {products.map((p) => (
            <details
              key={p.id}
              className="panel reveal overflow-hidden"
              open={Boolean(sku)}
            >
              <summary
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                style={{ listStyle: "none" }}
              >
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--ink-muted)" }}
                  aria-hidden
                />
                <span
                  className="font-mono text-sm font-extrabold"
                  style={{ color: "var(--ink)" }}
                >
                  {p.sku}
                </span>
                <span className="truncate text-sm" style={{ color: "var(--ink)" }}>
                  {p.name}
                </span>
                <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={
                      p.quantity < (p.reorderPoint ?? LOW_STOCK) / 2
                        ? "badge-red"
                        : p.quantity < (p.reorderPoint ?? LOW_STOCK)
                          ? "badge-amber"
                          : "badge-emerald"
                    }
                    title={
                      ar
                        ? `نقطة إعادة الطلب: ${p.reorderPoint ?? `${LOW_STOCK} (افتراضي)`}`
                        : `Reorder point: ${p.reorderPoint ?? `${LOW_STOCK} (default)`}`
                    }
                  >
                    {p.quantity < (p.reorderPoint ?? LOW_STOCK) ? "● " : ""}
                    {ar ? "كمية" : "qty"} {formatNumber(p.quantity)}
                  </span>
                  <span className="font-mono" style={{ color: "var(--ink-muted)" }}>
                    {p.unitCost != null ? formatMoney2(Number(p.unitCost)) : dash}
                  </span>
                  {p.supplierRef ? (
                    <span className="badge-slate">{p.supplierRef.name}</span>
                  ) : null}
                  {p.warehouseRef ? (
                    <span className="badge-slate">{p.warehouseRef.code}</span>
                  ) : null}
                  <span style={{ color: "var(--ink-muted)" }}>
                    {relTime(p.lastImportedAt, ar)}
                  </span>
                  <span className="badge-blue">
                    {ar ? "استيرادات" : "imports"} {p.importCount}
                  </span>
                </span>
              </summary>

              <div
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {ar ? "سجل الاستيراد لهذا المنتج" : "Import history for this product"}
                </div>
                <table className="dl-table">
                  <thead>
                    <tr style={{ color: "var(--ink-muted)" }}>
                      <th className="px-3 py-2 text-start font-bold">{ar ? "متى" : "When"}</th>
                      <th className="px-3 py-2 text-start font-bold">{ar ? "الدفعة" : "Batch"}</th>
                      <th className="px-3 py-2 text-end font-bold">{ar ? "الكمية" : "Qty"}</th>
                      <th className="px-3 py-2 text-end font-bold">{ar ? "تكلفة الوحدة (د.أ)" : "Unit cost (JOD)"}</th>
                      <th className="px-3 py-2 text-start font-bold">{ar ? "المورّد" : "Supplier"}</th>
                      <th className="px-3 py-2 text-start font-bold">{ar ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.importRows.map((r) => {
                      const ok = r.status === "ACCEPTED";
                      return (
                        <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--ink-muted)" }}>
                            {formatDateTime(r.createdAt, ar ? "ar" : "en")}
                          </td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--ink)" }}>
                            {r.importLog?.source ?? dash}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {r.quantity != null ? formatNumber(r.quantity) : dash}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {r.unitCost != null ? formatMoney2(Number(r.unitCost)) : dash}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--ink)" }}>
                            {r.supplier ?? dash}
                          </td>
                          <td className="px-3 py-2">
                            <span className={ok ? "badge-emerald" : "badge-red"}>
                              {ok ? (ar ? "مقبول" : "ACCEPTED") : ar ? "مرفوض" : "REJECTED"}
                            </span>
                            {!ok && r.error ? (
                              <span className="ms-2" style={{ color: "#b91c1c" }}>
                                {r.error}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phase 5 — live balance + movement ledger + manual adjust */}
              <div
                className="flex flex-col gap-3 px-4 py-3"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {ar ? "سجل الحركات" : "Movement history"}
                  </div>
                  <span
                    className="badge-emerald"
                    title={
                      ar
                        ? "الرصيد الحيّ = مجموع كل الحركات"
                        : "Live balance = SUM(delta)"
                    }
                  >
                    {ar ? "الصافي" : "Net"} = {formatNumber(p.quantity)}{" "}
                    {ar ? "وحدة" : "units"}
                  </span>
                </div>

                <AdjustStockForm productId={p.id} sku={p.sku} ar={ar} />
                <ReorderPointForm
                  productId={p.id}
                  current={p.reorderPoint}
                  ar={ar}
                />

                {p.movements.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {ar ? "لا حركات مسجّلة بعد." : "No movements recorded yet."}
                  </p>
                ) : (
                  <table className="dl-table">
                      <thead>
                        <tr style={{ color: "var(--ink-muted)" }}>
                          <th className="px-3 py-2 text-start font-bold">{ar ? "متى" : "When"}</th>
                          <th className="px-3 py-2 text-start font-bold">{ar ? "النوع" : "Type"}</th>
                          <th className="px-3 py-2 text-end font-bold">{ar ? "التغيّر" : "Delta"}</th>
                          <th className="px-3 py-2 text-start font-bold">{ar ? "السبب" : "Reason"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.movements.map((m) => {
                          const pos = m.delta > 0;
                          return (
                            <tr
                              key={m.id}
                              style={{ borderTop: "1px solid var(--line)" }}
                            >
                              <td
                                className="px-3 py-2 font-mono"
                                style={{ color: "var(--ink-muted)" }}
                              >
                                {formatDateTime(m.occurredAt, ar ? "ar" : "en")}
                              </td>
                              <td className="px-3 py-2">
                                <span className={movementBadge(m.type)}>
                                  {(ar ? MOVEMENT_TYPES_AR : MOVEMENT_TYPES_EN)[
                                    m.type
                                  ] ?? m.type}
                                </span>
                              </td>
                              <td
                                className="px-3 py-2 text-end font-mono font-bold"
                                style={{ color: pos ? "#15803d" : "#b91c1c" }}
                              >
                                {pos
                                  ? `+${formatNumber(m.delta)}`
                                  : formatNumber(m.delta)}
                              </td>
                              <td className="px-3 py-2" style={{ color: "var(--ink)" }}>
                                {m.reason}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                )}
              </div>
            </details>
          ))}
        </section>
      )}
    </DaylightShell>
  );
}
