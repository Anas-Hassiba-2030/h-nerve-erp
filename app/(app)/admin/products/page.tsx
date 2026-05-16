// /admin/products — operational product catalog (Phase 3).
//
// The import endpoint upserts into Product by (tenantId, sku); this is
// the read-only operational view the rest of the ERP reasons about.
// Same placement rationale as /admin/imports: (app) route group for
// Topbar + Heritage Modern. Server component, no client fetching.
// Cross-linked with /admin/imports (SKU ↔ ?sku=, history expands here).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PackageSearch, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatDateTime, formatNumber, formatMoney2 } from "@/lib/utils";

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
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  const q = str(searchParams.q);
  const sku = str(searchParams.sku);
  const supplier = str(searchParams.supplier);
  const warehouse = str(searchParams.warehouse);

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (sku) where.sku = sku;
  if (supplier) where.supplier = supplier;
  if (warehouse) where.warehouse = warehouse;
  if (q) {
    // SQLite has no case-insensitive `mode` — case-sensitive contains.
    where.OR = [{ sku: { contains: q } }, { name: { contains: q } }];
  }

  // Two reads: KPI/pill aggregates over the WHOLE catalog (stable while
  // filtering), and the filtered list for the table.
  const [catalog, products] = await Promise.all([
    prismaUnscoped.product.findMany({
      where: { deletedAt: null },
      select: { quantity: true, supplier: true, warehouse: true },
    }),
    prismaUnscoped.product.findMany({
      where,
      orderBy: { lastImportedAt: "desc" },
      take: 500,
      include: {
        importRows: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { importLog: { select: { source: true } } },
        },
      },
    }),
  ]);

  const totalUnits = catalog.reduce((s, p) => s + p.quantity, 0);
  const lowStock = catalog.filter((p) => p.quantity < LOW_STOCK).length;
  const suppliers = [
    ...new Set(catalog.map((p) => p.supplier).filter(Boolean) as string[]),
  ].sort();
  const warehouses = [
    ...new Set(catalog.map((p) => p.warehouse).filter(Boolean) as string[]),
  ].sort();

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
    values: string[];
    active: string;
    paramKey: string;
  }) =>
    values.length === 0 ? null : (
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
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
            key={v}
            href={hrefWith(paramKey, v)}
            className={active === v ? "badge-emerald" : "badge-slate"}
          >
            {v}
          </Link>
        ))}
      </div>
    );

  return (
    <>
      <Topbar
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "كتالوج المنتجات" : "Product Catalog"}
        subtitle={
          ar
            ? "مصدر الحقيقة التشغيلي — يُحدَّث بالاستيراد عبر (tenantId, sku)"
            : "Operational source of truth — upserted by import on (tenantId, sku)"
        }
        metrics={[
          { label: ar ? "منتجات" : "Products", value: formatNumber(catalog.length), tone: "blue" },
          { label: ar ? "وحدات بالمخزون" : "Units in stock", value: formatNumber(totalUnits), tone: "violet" },
          { label: ar ? `مخزون منخفض (<${LOW_STOCK})` : `Low stock (<${LOW_STOCK})`, value: formatNumber(lowStock), tone: "amber" },
          { label: ar ? "موردون" : "Suppliers", value: formatNumber(suppliers.length), tone: "emerald" },
        ]}
      />

      {/* Search + filter pills */}
      <div className="card card-pad flex flex-col gap-3">
        <form method="GET" className="flex items-center gap-2">
          {sku ? <input type="hidden" name="sku" value={sku} /> : null}
          {supplier ? <input type="hidden" name="supplier" value={supplier} /> : null}
          {warehouse ? <input type="hidden" name="warehouse" value={warehouse} /> : null}
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 start-3"
              style={{ color: "var(--text-muted)" }}
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
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <PackageSearch className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {catalog.length === 0
              ? ar
                ? "لا توجد منتجات بعد"
                : "No products yet"
              : ar
                ? "لا نتائج مطابقة للبحث"
                : "No products match the filter"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
              className="card overflow-hidden"
              open={Boolean(sku)}
            >
              <summary
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                style={{ listStyle: "none" }}
              >
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  aria-hidden
                />
                <span
                  className="font-mono text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  {p.sku}
                </span>
                <span className="truncate text-sm" style={{ color: "var(--text)" }}>
                  {p.name}
                </span>
                <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={p.quantity < LOW_STOCK ? "badge-amber" : "badge-emerald"}
                  >
                    {ar ? "كمية" : "qty"} {formatNumber(p.quantity)}
                  </span>
                  <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                    {p.unitCost != null ? formatMoney2(Number(p.unitCost)) : dash}
                  </span>
                  {p.supplier ? (
                    <span className="badge-slate">{p.supplier}</span>
                  ) : null}
                  {p.warehouse ? (
                    <span className="badge-slate">{p.warehouse}</span>
                  ) : null}
                  <span style={{ color: "var(--text-muted)" }}>
                    {relTime(p.lastImportedAt, ar)}
                  </span>
                  <span className="badge-blue">
                    {ar ? "استيرادات" : "imports"} {p.importCount}
                  </span>
                </span>
              </summary>

              <div
                className="table-wrap"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <div
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  {ar ? "سجل الاستيراد لهذا المنتج" : "Import history for this product"}
                </div>
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr style={{ color: "var(--text-muted)" }}>
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
                        <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--text-muted)" }}>
                            {formatDateTime(r.createdAt, ar ? "ar" : "en")}
                          </td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--text)" }}>
                            {r.importLog?.source ?? dash}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {r.quantity != null ? formatNumber(r.quantity) : dash}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {r.unitCost != null ? formatMoney2(Number(r.unitCost)) : dash}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--text)" }}>
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
            </details>
          ))}
        </section>
      )}
    </>
  );
}
