// /admin/warehouses — physical stock locations (Phase 9). Promoted
// from the legacy Product.warehouse string. Same conventions as the
// rest of the admin family: (app) group, Heritage Modern, Topbar,
// auth-gated, server component, prismaUnscoped (no companyId here).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Warehouse as WarehouseIcon } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import {
  NewWarehouseForm,
  EditWarehouseForm,
  DeleteWarehouseButton,
} from "./WarehouseForms";

export const dynamic = "force-dynamic";

// Same threshold as /admin/products.
const LOW_STOCK = 50;

const TYPE_AR: Record<string, string> = {
  MAIN: "رئيسي",
  COLD: "مبرّد",
  DRY: "جاف",
  TRANSIT: "عبور",
};

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  const deep = str(searchParams.wh); // warehouse code → auto-expand

  const [totalWh, activeWh, totalSkus, lowStock, warehouses] =
    await Promise.all([
      prismaUnscoped.warehouse.count({ where: { deletedAt: null } }),
      prismaUnscoped.warehouse.count({
        where: { deletedAt: null, active: true },
      }),
      prismaUnscoped.product.count({ where: { deletedAt: null } }),
      prismaUnscoped.product.count({
        where: { deletedAt: null, quantity: { lt: LOW_STOCK } },
      }),
      prismaUnscoped.warehouse.findMany({
        where: { deletedAt: null },
        orderBy: { code: "asc" },
        take: 300,
        include: {
          // Filtered relation read; computed below. take is generous
          // for the expand list at the current single-tenant scale.
          products: {
            where: { deletedAt: null },
            select: {
              sku: true,
              name: true,
              quantity: true,
              lastImportedAt: true,
            },
            take: 300,
            orderBy: { sku: "asc" },
          },
        },
      }),
    ]);

  const tenantDefault =
    warehouses.length > 0
      ? [
          ...warehouses.reduce(
            (m, w) => m.set(w.tenantId, (m.get(w.tenantId) ?? 0) + 1),
            new Map<string, number>(),
          ),
        ].sort((a, b) => b[1] - a[1])[0][0]
      : "hourani-hotels";

  const dash = "—";
  const tLabel = (t: string) => (ar ? TYPE_AR[t] ?? t : t);

  return (
    <>
      <Topbar
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "المستودعات" : "Warehouses"}
        subtitle={
          ar
            ? "مواقع المخزون الفعلية — رُقّيت من سلسلة المستودع في المنتجات"
            : "Physical stock locations — promoted from the Product.warehouse string"
        }
        actions={<AdminFamilyNav current="/admin/warehouses" ar={ar} />}
        metrics={[
          {
            label: ar ? "مستودعات" : "Warehouses",
            value: formatNumber(totalWh),
            tone: "blue",
          },
          {
            label: ar ? "نشطة" : "Active",
            value: formatNumber(activeWh),
            tone: "emerald",
          },
          {
            label: ar ? "إجمالي الأصناف" : "Total SKUs",
            value: formatNumber(totalSkus),
            tone: "violet",
          },
          {
            label: ar ? `مخزون منخفض (<${LOW_STOCK})` : `Low stock (<${LOW_STOCK})`,
            value: formatNumber(lowStock),
            tone: "amber",
          },
        ]}
      />

      <div className="mt-3">
        <NewWarehouseForm tenantDefault={tenantDefault} ar={ar} />
      </div>

      {warehouses.length === 0 ? (
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <WarehouseIcon
            className="h-10 w-10"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {ar ? "لا مستودعات" : "No warehouses"}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {warehouses.map((w) => {
            const skuCount = w.products.length;
            const units = w.products.reduce((s, p) => s + p.quantity, 0);
            const low = w.products.filter(
              (p) => p.quantity < LOW_STOCK,
            ).length;
            return (
              <details
                key={w.id}
                className="card overflow-hidden"
                open={deep === w.code}
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
                    {w.code}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text)" }}>
                    {w.name}
                  </span>
                  {w.address ? (
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {w.address}
                    </span>
                  ) : null}
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="badge-slate">{tLabel(w.type)}</span>
                    <span
                      className={w.active ? "badge-emerald" : "badge-slate"}
                    >
                      {w.active
                        ? ar
                          ? "نشط"
                          : "active"
                        : ar
                          ? "غير نشط"
                          : "inactive"}
                    </span>
                    <span className="badge-violet">
                      {ar ? "أصناف" : "SKUs"} {formatNumber(skuCount)}
                    </span>
                    <span className="badge-blue">
                      {ar ? "وحدات" : "units"} {formatNumber(units)}
                    </span>
                    {low > 0 ? (
                      <span className="badge-amber">
                        {ar ? "منخفض" : "low"} {formatNumber(low)}
                      </span>
                    ) : null}
                  </span>
                </summary>

                <div
                  className="flex flex-col gap-4 px-4 py-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <EditWarehouseForm w={w} ar={ar} />

                  <div>
                    <div
                      className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {ar ? "المنتجات في هذا المستودع" : "Products at this warehouse"}
                    </div>
                    {w.products.length === 0 ? (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {dash}
                      </p>
                    ) : (
                      <div className="table-wrap">
                        <table className="w-full text-start text-xs">
                          <thead>
                            <tr style={{ color: "var(--text-muted)" }}>
                              <th className="px-3 py-2 text-start font-bold">
                                {ar ? "الصنف" : "SKU"}
                              </th>
                              <th className="px-3 py-2 text-start font-bold">
                                {ar ? "الاسم" : "Name"}
                              </th>
                              <th className="px-3 py-2 text-end font-bold">
                                {ar ? "الكمية" : "Qty"}
                              </th>
                              <th className="px-3 py-2 text-start font-bold">
                                {ar ? "آخر استيراد" : "Last imported"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.products.map((p) => (
                              <tr
                                key={p.sku}
                                style={{
                                  borderTop: "1px solid var(--border)",
                                }}
                              >
                                <td className="px-3 py-2 font-mono">
                                  <Link
                                    href={`/admin/products?sku=${encodeURIComponent(
                                      p.sku,
                                    )}`}
                                    className="underline decoration-dotted underline-offset-2"
                                    style={{ color: "var(--brand-deep)" }}
                                  >
                                    {p.sku}
                                  </Link>
                                </td>
                                <td
                                  className="px-3 py-2"
                                  style={{ color: "var(--text)" }}
                                >
                                  {p.name}
                                </td>
                                <td
                                  className="px-3 py-2 text-end font-mono"
                                  style={{
                                    color:
                                      p.quantity < LOW_STOCK
                                        ? "#b45309"
                                        : "var(--text)",
                                  }}
                                >
                                  {formatNumber(p.quantity)}
                                </td>
                                <td
                                  className="px-3 py-2 font-mono"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {formatDateTime(
                                    p.lastImportedAt,
                                    ar ? "ar" : "en",
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <DeleteWarehouseButton id={w.id} name={w.name} ar={ar} />
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </>
  );
}
