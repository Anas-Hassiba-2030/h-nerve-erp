// /admin/suppliers — Supplier entities (Phase 7). Promoted from the
// legacy Product/PO supplier strings. Same conventions as the rest of
// the admin family: (app) group, Heritage Modern, Topbar, auth-gated,
// server component, prismaUnscoped (no companyId on these models).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Factory } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatNumber } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { orderStatusBadge, ORDER_STATUS_AR, ORDER_STATUS_EN } from "@/lib/utils";
import { NewSupplierForm, EditSupplierForm, DeleteSupplierButton } from "./SupplierForms";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

export default async function SuppliersPage({ searchParams }: { searchParams: SP }) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) redirect("/dashboard");

  const q = str(searchParams.q);
  const deep = str(searchParams.supplier); // supplier id → auto-expand

  const where: Prisma.SupplierWhereInput = { deletedAt: null };
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];

  const [allCount, activeCount, prodLinked, poLinked, suppliers] =
    await Promise.all([
      prismaUnscoped.supplier.count(),
      prismaUnscoped.supplier.count({ where: { deletedAt: null } }),
      prismaUnscoped.product.count({ where: { supplierId: { not: null }, deletedAt: null } }),
      prismaUnscoped.purchaseOrder.count({ where: { supplierId: { not: null }, deletedAt: null } }),
      prismaUnscoped.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        take: 300,
        include: {
          _count: { select: { products: true, purchaseOrders: true } },
          products: { select: { sku: true, name: true }, take: 50, orderBy: { sku: "asc" } },
          purchaseOrders: {
            select: { id: true, poNumber: true, status: true },
            take: 50,
            orderBy: { orderedAt: "desc" },
          },
        },
      }),
    ]);

  const tenantDefault =
    suppliers.length > 0
      ? [...suppliers.reduce((m, s) => m.set(s.tenantId, (m.get(s.tenantId) ?? 0) + 1), new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])[0][0]
      : "hourani-hotels";
  const dash = "—";
  const oLabel = (s: string) => (ar ? ORDER_STATUS_AR : ORDER_STATUS_EN)[s] ?? s;

  return (
    <>
      <Topbar
        eyebrow={ar ? "العلاقات" : "Relationships"}
        title={ar ? "المورّدون" : "Suppliers"}
        subtitle={
          ar
            ? "كيانات حقيقية — رُقّيت من سلاسل المورّد في المنتجات وأوامر الشراء"
            : "Real entities — promoted from the Product/PO supplier strings"
        }
        actions={<AdminFamilyNav current="/admin/suppliers" ar={ar} />}
        metrics={[
          { label: ar ? "الإجمالي" : "Total", value: formatNumber(allCount), tone: "blue" },
          { label: ar ? "نشط" : "Active", value: formatNumber(activeCount), tone: "emerald" },
          { label: ar ? "منتجات مرتبطة" : "Products linked", value: formatNumber(prodLinked), tone: "violet" },
          { label: ar ? "أوامر شراء مرتبطة" : "POs linked", value: formatNumber(poLinked), tone: "amber" },
        ]}
      />

      <div className="mt-3">
        <NewSupplierForm tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="card card-pad mt-3">
        <form method="GET" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={ar ? "بحث بالاسم أو البريد…" : "Search name or email…"}
            className="input w-full text-xs"
            aria-label={ar ? "بحث" : "Search"}
          />
          <button type="submit" className="btn-secondary btn-sm">{ar ? "بحث" : "Search"}</button>
          {q ? <Link href="/admin/suppliers" className="btn-ghost btn-sm">{ar ? "مسح" : "Clear"}</Link> : null}
        </form>
      </div>

      {suppliers.length === 0 ? (
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <Factory className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {ar ? "لا مورّدين" : "No suppliers"}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {suppliers.map((s) => (
            <details key={s.id} className="card overflow-hidden" open={deep === s.id}>
              <summary
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                style={{ listStyle: "none" }}
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden />
                <span className="text-sm font-extrabold" style={{ color: "var(--text)" }}>{s.name}</span>
                {s.email ? <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.email}</span> : null}
                {s.phone ? <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{s.phone}</span> : null}
                <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                  {s.paymentTerms ? <span className="badge-slate">{s.paymentTerms}</span> : null}
                  <span className="badge-violet">{ar ? "منتجات" : "products"} {s._count.products}</span>
                  <span className="badge-amber">{ar ? "أوامر" : "POs"} {s._count.purchaseOrders}</span>
                </span>
              </summary>

              <div className="flex flex-col gap-4 px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                <EditSupplierForm supplier={s} ar={ar} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {ar ? "المنتجات المرتبطة" : "Linked products"}
                    </div>
                    {s.products.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{dash}</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-xs">
                        {s.products.map((p) => (
                          <li key={p.sku}>
                            <Link href={`/admin/products?sku=${encodeURIComponent(p.sku)}`} className="underline decoration-dotted underline-offset-2" style={{ color: "var(--brand-deep)" }}>
                              <span className="font-mono">{p.sku}</span> — {p.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {ar ? "أوامر الشراء" : "Purchase orders"}
                    </div>
                    {s.purchaseOrders.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{dash}</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-xs">
                        {s.purchaseOrders.map((po) => (
                          <li key={po.id} className="flex items-center gap-2">
                            <Link href={`/admin/purchase-orders?po=${encodeURIComponent(po.poNumber)}`} className="font-mono underline decoration-dotted underline-offset-2" style={{ color: "var(--brand-deep)" }}>
                              {po.poNumber}
                            </Link>
                            <span className={orderStatusBadge(po.status)}>{oLabel(po.status)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <DeleteSupplierButton id={s.id} name={s.name} ar={ar} />
                </div>
              </div>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
