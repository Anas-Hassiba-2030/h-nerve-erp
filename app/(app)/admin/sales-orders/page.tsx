// /admin/sales-orders — fulfillment (Phase 6).
//
// SO lifecycle DRAFT → CONFIRMED → PARTIAL → FULFILLED → CANCELLED;
// confirm runs a soft stock check, fulfillment writes SOLD (negative)
// ledger movements. Same conventions as /admin/purchase-orders.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Receipt as ReceiptIcon } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import {
  formatDateTime,
  formatNumber,
  formatMoney2,
  ORDER_STATUS_AR,
  ORDER_STATUS_EN,
  orderStatusBadge,
} from "@/lib/utils";
import {
  NewSOForm,
  ConfirmSOButton,
  FulfillForm,
  CancelSOButton,
} from "./SalesOrderForms";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

function relTime(d: Date, ar: boolean): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return ar ? "الآن" : "just now";
  if (m < 60) return ar ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `قبل ${h} ساعة` : `${h}h ago`;
  const dd = Math.floor(h / 24);
  return ar ? `قبل ${dd} يوم` : `${dd}d ago`;
}

export default async function SalesOrdersPage({
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

  const statusF = str(searchParams.status);
  const customerF = str(searchParams.customer);
  const soDeep = str(searchParams.so);

  const where: Prisma.SalesOrderWhereInput = { deletedAt: null };
  if (statusF) where.status = statusF;
  if (customerF) where.customerId = customerF; // customerF is now a Customer id

  const [allSos, products, customerList, sos] = await Promise.all([
    prismaUnscoped.salesOrder.findMany({
      where: { deletedAt: null },
      select: { status: true, updatedAt: true },
    }),
    prismaUnscoped.product.findMany({
      where: { deletedAt: null },
      select: { id: true, sku: true, name: true, quantity: true, tenantId: true },
      orderBy: { sku: "asc" },
    }),
    prismaUnscoped.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prismaUnscoped.salesOrder.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      take: 300,
      include: {
        lines: {
          include: {
            product: { select: { sku: true, name: true, quantity: true } },
          },
        },
        customerRef: { select: { name: true, email: true, phone: true } },
      },
    }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const kTotal = allSos.length;
  const kOpen = allSos.filter((s) => ["DRAFT", "CONFIRMED"].includes(s.status)).length;
  const kPending = allSos.filter((s) => s.status === "PARTIAL").length;
  const kDone = allSos.filter(
    (s) => s.status === "FULFILLED" && s.updatedAt >= monthStart,
  ).length;

  const customers = customerList; // {id,name}[] — real entities now
  const tenantDefault =
    products.length > 0
      ? [...products.reduce((m, p) => m.set(p.tenantId, (m.get(p.tenantId) ?? 0) + 1), new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])[0][0]
      : "default";

  const dash = "—";
  const oLabel = (s: string) => (ar ? ORDER_STATUS_AR : ORDER_STATUS_EN)[s] ?? s;
  const STATUSES = ["DRAFT", "CONFIRMED", "PARTIAL", "FULFILLED", "CANCELLED"];

  const hrefWith = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (statusF) p.set("status", statusF);
    if (customerF) p.set("customer", customerF);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    return s ? `/admin/sales-orders?${s}` : "/admin/sales-orders";
  };

  return (
    <>
      <Topbar
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "أوامر البيع" : "Sales Orders"}
        subtitle={
          ar
            ? "بيع للعملاء — التنفيذ يكتب حركات SOLD (سالبة) في السجل"
            : "Sales to customers — fulfillment writes SOLD (negative) ledger movements"
        }
        actions={<AdminFamilyNav current="/admin/sales-orders" ar={ar} />}
        metrics={[
          { label: ar ? "إجمالي الأوامر" : "Total SOs", value: formatNumber(kTotal), tone: "blue" },
          { label: ar ? "مفتوحة" : "Open", value: formatNumber(kOpen), tone: "violet" },
          { label: ar ? "بانتظار التنفيذ" : "Pending fulfillment", value: formatNumber(kPending), tone: "amber" },
          { label: ar ? "نُفِّذت هذا الشهر" : "Fulfilled this month", value: formatNumber(kDone), tone: "emerald" },
        ]}
      />

      <div className="mt-3">
        <NewSOForm products={products} customers={customers} tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="card card-pad mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {ar ? "الحالة" : "Status"}
          </span>
          <Link href={hrefWith("status", "")} className={statusF ? "badge-slate" : "badge-emerald"}>
            {ar ? "الكل" : "All"}
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={hrefWith("status", s)} className={statusF === s ? "badge-emerald" : "badge-slate"}>
              {oLabel(s)}
            </Link>
          ))}
        </div>
        {customers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {ar ? "العميل" : "Customer"}
            </span>
            <Link href={hrefWith("customer", "")} className={customerF ? "badge-slate" : "badge-emerald"}>
              {ar ? "الكل" : "All"}
            </Link>
            {customers.map((c) => (
              <Link key={c.id} href={hrefWith("customer", c.id)} className={customerF === c.id ? "badge-emerald" : "badge-slate"}>
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {sos.length === 0 ? (
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <ReceiptIcon className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {allSos.length === 0
              ? ar ? "لا توجد أوامر بيع بعد" : "No sales orders yet"
              : ar ? "لا نتائج مطابقة" : "No SOs match the filter"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {ar ? "أنشئ أمر بيع من النموذج أعلاه." : "Create one from the form above."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {sos.map((so) => {
            const canCancel = so.status !== "CANCELLED";
            return (
              <details
                key={so.id}
                className="card overflow-hidden"
                open={soDeep === so.soNumber}
              >
                <summary
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  style={{ listStyle: "none" }}
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden />
                  <span className="font-mono text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    {so.soNumber}
                  </span>
                  <span className="badge-slate">{so.customerRef?.name ?? "—"}</span>
                  <span className={orderStatusBadge(so.status)}>{oLabel(so.status)}</span>
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span style={{ color: "var(--text-muted)" }}>
                      {ar ? "بنود" : "lines"}{" "}
                      <b style={{ color: "var(--text)" }}>{formatNumber(so.lines.length)}</b>
                    </span>
                    <span className="font-mono" style={{ color: "var(--text-muted)" }} title={formatDateTime(so.orderedAt, ar ? "ar" : "en")}>
                      {relTime(so.orderedAt, ar)}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {ar ? "مطلوب" : "req"}{" "}
                      {so.requiredBy ? formatDateTime(so.requiredBy, ar ? "ar" : "en") : dash}
                    </span>
                  </span>
                </summary>

                <div className="table-wrap" style={{ borderTop: "1px solid var(--border)" }}>
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="px-3 py-2 text-start font-bold">SKU</th>
                        <th className="px-3 py-2 text-start font-bold">{ar ? "المنتج" : "Product"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "المطلوب" : "Ordered"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "المُنفَّذ" : "Fulfilled"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "سعر الوحدة" : "Unit price"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "المتوفر" : "Available"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {so.lines.map((l) => {
                        const short = l.product.quantity < l.quantity - l.fulfilledQty;
                        return (
                          <tr key={l.id} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="px-3 py-2 font-mono">{l.product.sku}</td>
                            <td className="px-3 py-2" style={{ color: "var(--text)" }}>{l.product.name}</td>
                            <td className="px-3 py-2 text-end font-mono">{formatNumber(l.quantity)}</td>
                            <td className="px-3 py-2 text-end font-mono">{formatNumber(l.fulfilledQty)}</td>
                            <td className="px-3 py-2 text-end font-mono">
                              {l.unitPrice != null ? formatMoney2(Number(l.unitPrice)) : dash}
                            </td>
                            <td className="px-3 py-2 text-end font-mono">
                              <span className={short ? "badge-amber" : ""} style={short ? undefined : { color: "var(--text-muted)" }}>
                                {formatNumber(l.product.quantity)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      {so.customerRef?.name ?? "—"}
                    </span>
                    {so.customerRef?.email ? <span>✉ {so.customerRef.email}</span> : null}
                    {so.customerRef?.phone ? <span className="font-mono">☎ {so.customerRef.phone}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {so.status === "DRAFT" ? <ConfirmSOButton soId={so.id} ar={ar} /> : null}
                    {canCancel ? <CancelSOButton soId={so.id} ar={ar} /> : null}
                    <Link href={`/admin/movements?q=${encodeURIComponent(so.soNumber)}`} className="btn-ghost btn-sm">
                      {ar ? "حركات هذا الأمر" : "Movements for this SO"}
                    </Link>
                  </div>
                  {["CONFIRMED", "PARTIAL"].includes(so.status) ? (
                    <FulfillForm
                      soId={so.id}
                      ar={ar}
                      lines={so.lines.map((l) => ({
                        lineId: l.id,
                        label: `${l.product.sku} — ${l.product.name}`,
                        ordered: l.quantity,
                        fulfilled: l.fulfilledQty,
                      }))}
                    />
                  ) : null}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </>
  );
}
