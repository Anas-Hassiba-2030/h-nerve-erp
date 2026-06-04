// /admin/purchase-orders — procurement (Phase 6).
//
// PO lifecycle DRAFT → SENT → PARTIAL → RECEIVED → CANCELLED; only
// receipts write RECEIVED ledger movements (lib/orders.ts → Phase-5
// inventory helpers). Same conventions as the rest of the admin family:
// (app) group, Heritage Modern, Topbar, auth-gated, server component.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import {
  formatDateTime,
  formatNumber,
  formatMoney2,
  localizeUnit,
  ORDER_STATUS_AR,
  ORDER_STATUS_EN,
  orderStatusBadge,
} from "@/lib/utils/utils";
import {
  NewPOForm,
  MarkSentButton,
  ReceiveForm,
  CancelPOButton,
} from "./PurchaseOrderForms";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";

import "../../daylight.css";

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

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const statusF = str(searchParams.status);
  const supplierF = str(searchParams.supplier);
  const poDeep = str(searchParams.po);

  const where: Prisma.PurchaseOrderWhereInput = { deletedAt: null };
  if (statusF) where.status = statusF;
  if (supplierF) where.supplierId = supplierF; // supplierF is now a Supplier id

  const [allPos, products, supplierList, pos] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      select: { status: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, sku: true, name: true, quantity: true, tenantId: true },
      orderBy: { sku: "asc" },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      take: 300,
      include: {
        lines: { include: { product: { select: { sku: true, name: true } } } },
        supplierRef: { select: { name: true, email: true, phone: true } },
        // Phase NS-1 — bridge POs carry no lines; product/qty/date read
        // through the SupplyForecast that drafted them.
        sourceForecast: {
          select: { id: true, productLabel: true, productLabelEn: true, predictedDemand: true, unit: true, periodEnd: true },
        },
      },
    }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const kTotal = allPos.length;
  const kOpen = allPos.filter((p) => ["DRAFT", "SENT"].includes(p.status)).length;
  const kPending = allPos.filter((p) => p.status === "PARTIAL").length;
  const kDone = allPos.filter(
    (p) => p.status === "RECEIVED" && p.updatedAt >= monthStart,
  ).length;

  const suppliers = supplierList; // {id,name}[] — real entities now
  // Dominant product tenant → New-PO default (opaque string, editable).
  const tenantDefault =
    products.length > 0
      ? [...products.reduce((m, p) => m.set(p.tenantId, (m.get(p.tenantId) ?? 0) + 1), new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])[0][0]
      : "default";

  const dash = "—";
  const oLabel = (s: string) => (ar ? ORDER_STATUS_AR : ORDER_STATUS_EN)[s] ?? s;
  const STATUSES = ["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"];

  const hrefWith = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (statusF) p.set("status", statusF);
    if (supplierF) p.set("supplier", supplierF);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    return s ? `/admin/purchase-orders?${s}` : "/admin/purchase-orders";
  };

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "أوامر الشراء" : "Purchase Orders"}
        subtitle={
          ar
            ? "شراء من المورّدين — الاستلام يكتب حركات RECEIVED في السجل"
            : "Procurement from suppliers — receipts write RECEIVED ledger movements"
        }
      />

      <AdminFamilyNav current="/admin/purchase-orders" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الأوامر" : "Total POs"} value={formatNumber(kTotal)} />
        <DaylightKpi label={ar ? "مفتوحة" : "Open"} value={formatNumber(kOpen)} />
        <DaylightKpi label={ar ? "بانتظار الاستلام" : "Pending receipt"} value={formatNumber(kPending)} />
        <DaylightKpi label={ar ? "اكتملت هذا الشهر" : "Completed this month"} value={formatNumber(kDone)} />
      </DaylightKpiGrid>

      <div className="mt-3">
        <NewPOForm products={products} suppliers={suppliers} tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="panel reveal mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
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
        {suppliers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
              {ar ? "المورّد" : "Supplier"}
            </span>
            <Link href={hrefWith("supplier", "")} className={supplierF ? "badge-slate" : "badge-emerald"}>
              {ar ? "الكل" : "All"}
            </Link>
            {suppliers.map((s) => (
              <Link key={s.id} href={hrefWith("supplier", s.id)} className={supplierF === s.id ? "badge-emerald" : "badge-slate"}>
                {s.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {pos.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingCart className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {allPos.length === 0
              ? ar ? "لا توجد أوامر شراء بعد" : "No purchase orders yet"
              : ar ? "لا نتائج مطابقة" : "No POs match the filter"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {ar ? "أنشئ أمر شراء من النموذج أعلاه." : "Create one from the form above."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {pos.map((po) => {
            const linesCount = po.lines.length;
            const canCancel = po.status !== "CANCELLED";
            return (
              <details
                key={po.id}
                className="panel reveal overflow-hidden"
                open={poDeep === po.poNumber}
              >
                <summary
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  style={{ listStyle: "none" }}
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink-muted)" }} aria-hidden />
                  <span className="font-mono text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                    {po.poNumber}
                  </span>
                  <span className="badge-slate">{po.supplierRef?.name ?? "—"}</span>
                  <span className={orderStatusBadge(po.status)}>{oLabel(po.status)}</span>
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span style={{ color: "var(--ink-muted)" }}>
                      {ar ? "بنود" : "lines"}{" "}
                      <b style={{ color: "var(--ink)" }}>{formatNumber(linesCount)}</b>
                    </span>
                    <span className="font-mono" style={{ color: "var(--ink-muted)" }} title={formatDateTime(po.orderedAt, ar ? "ar" : "en")}>
                      {relTime(po.orderedAt, ar)}
                    </span>
                    <span style={{ color: "var(--ink-muted)" }}>
                      {ar ? "متوقع" : "exp"}{" "}
                      {po.expectedAt ? formatDateTime(po.expectedAt, ar ? "ar" : "en") : dash}
                    </span>
                  </span>
                </summary>

                {/* Phase NS-1 — bridge PO provenance banner. Shows when
                    this PO was drafted from an approved SupplyForecast. */}
                {po.sourceForecast ? (
                  <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[11px]"
                    style={{ borderTop: "1px solid var(--line)", background: "var(--brand-soft)" }}
                  >
                    <span className="font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
                      {ar ? "من تنبؤ" : "From forecast"}
                    </span>
                    <span style={{ color: "var(--ink)" }}>
                      {ar ? po.sourceForecast.productLabel : (po.sourceForecast.productLabelEn || po.sourceForecast.productLabel)} — {formatNumber(po.sourceForecast.predictedDemand)} {localizeUnit(po.sourceForecast.unit, ar)}
                    </span>
                    <span style={{ color: "var(--ink-muted)" }}>
                      {ar ? "للفترة" : "for"} {formatDateTime(po.sourceForecast.periodEnd, ar ? "ar" : "en")}
                    </span>
                    <Link href="/supply-chain" className="ms-auto" style={{ color: "var(--brand)", fontWeight: 700 }}>
                      {ar ? "التنبؤ الأصلي ←" : "Originating forecast →"}
                    </Link>
                  </div>
                ) : null}

                {linesCount > 0 ? (
                  <div style={{ borderTop: "1px solid var(--line)" }}>
                    <table className="dl-table">
                      <thead>
                        <tr style={{ color: "var(--ink-muted)" }}>
                          <th className="px-3 py-2 text-start font-bold">SKU</th>
                          <th className="px-3 py-2 text-start font-bold">{ar ? "المنتج" : "Product"}</th>
                          <th className="px-3 py-2 text-end font-bold">{ar ? "المطلوب" : "Ordered"}</th>
                          <th className="px-3 py-2 text-end font-bold">{ar ? "المُستلَم" : "Received"}</th>
                          <th className="px-3 py-2 text-end font-bold">{ar ? "تكلفة الوحدة" : "Unit cost"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.lines.map((l) => (
                          <tr key={l.id} style={{ borderTop: "1px solid var(--line)" }}>
                            <td className="px-3 py-2 font-mono">{l.product.sku}</td>
                            <td className="px-3 py-2" style={{ color: "var(--ink)" }}>{l.product.name}</td>
                            <td className="px-3 py-2 text-end font-mono">{formatNumber(l.quantity)}</td>
                            <td className="px-3 py-2 text-end font-mono">{formatNumber(l.receivedQty)}</td>
                            <td className="px-3 py-2 text-end font-mono">
                              {l.unitCost != null ? formatMoney2(Number(l.unitCost)) : dash}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    <span className="font-bold" style={{ color: "var(--ink)" }}>
                      {po.supplierRef?.name ?? "—"}
                    </span>
                    {po.supplierRef?.email ? <span>✉ {po.supplierRef.email}</span> : null}
                    {po.supplierRef?.phone ? <span className="font-mono">☎ {po.supplierRef.phone}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {po.status === "DRAFT" ? <MarkSentButton poId={po.id} ar={ar} /> : null}
                    {canCancel ? <CancelPOButton poId={po.id} ar={ar} /> : null}
                    <Link href={`/admin/movements?q=${encodeURIComponent(po.poNumber)}`} className="btn-ghost btn-sm">
                      {ar ? "حركات هذا الأمر" : "Movements for this PO"}
                    </Link>
                  </div>
                  {["SENT", "PARTIAL"].includes(po.status) ? (
                    <ReceiveForm
                      poId={po.id}
                      ar={ar}
                      lines={po.lines.map((l) => ({
                        lineId: l.id,
                        label: `${l.product.sku} — ${l.product.name}`,
                        ordered: l.quantity,
                        received: l.receivedQty,
                      }))}
                    />
                  ) : null}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </DaylightShell>
  );
}
