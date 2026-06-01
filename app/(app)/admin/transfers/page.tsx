// /admin/transfers — warehouse-to-warehouse stock transfer log
// (Phase 9). A transfer is a paired TRANSFER_OUT + TRANSFER_IN sharing
// a transferRef; this surface collapses the pair into one row. Same
// conventions as the rest of the admin family ((app) group, Heritage
// Modern, Topbar, auth-gated, prisma).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { NewTransferForm } from "./TransferForm";

import "../../daylight.css";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const fSku = str(searchParams.sku);
  const fWh = str(searchParams.wh).toUpperCase();
  const fDate = str(searchParams.date); // YYYY-MM-DD

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Optional day-window filter.
  let dayGte: Date | null = null;
  let dayLt: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fDate)) {
    const d = new Date(`${fDate}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      dayGte = d;
      dayLt = new Date(d.getTime() + 86_400_000);
    }
  }

  const [warehouses, productRows, outLegs, todayAgg, activeGroups] =
    await Promise.all([
      prisma.warehouse.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          active: true,
          deletedAt: true,
        },
        orderBy: { code: "asc" },
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          sku: true,
          quantity: true,
          warehouseRef: { select: { code: true } },
        },
        orderBy: { sku: "asc" },
        take: 500,
      }),
      prisma.inventoryMovement.findMany({
        where: {
          type: "TRANSFER_OUT",
          deletedAt: null,
          transferRef: { not: null },
          ...(fSku ? { product: { sku: fSku } } : {}),
          ...(dayGte && dayLt
            ? { occurredAt: { gte: dayGte, lt: dayLt } }
            : {}),
        },
        include: { product: { select: { sku: true } } },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 300,
      }),
      prisma.inventoryMovement.aggregate({
        _count: { _all: true },
        _sum: { delta: true },
        where: {
          type: "TRANSFER_OUT",
          deletedAt: null,
          occurredAt: { gte: todayStart },
        },
      }),
      prisma.inventoryMovement.groupBy({
        by: ["warehouseId"],
        where: {
          type: { in: ["TRANSFER_OUT", "TRANSFER_IN"] },
          deletedAt: null,
          warehouseId: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

  const whMap = new Map(
    warehouses.map((w) => [w.id, { code: w.code, name: w.name }]),
  );

  // Resolve the TRANSFER_IN sibling (destination) for each leg.
  const refs = [
    ...new Set(outLegs.map((l) => l.transferRef as string)),
  ];
  const inLegs = refs.length
    ? await prisma.inventoryMovement.findMany({
        where: {
          transferRef: { in: refs },
          type: "TRANSFER_IN",
          deletedAt: null,
        },
        select: { transferRef: true, warehouseId: true },
      })
    : [];
  const inByRef = new Map(
    inLegs.map((m) => [m.transferRef as string, m.warehouseId]),
  );

  const rows = outLegs
    .map((o) => {
      const ref = o.transferRef as string;
      const from = o.warehouseId ? whMap.get(o.warehouseId) : undefined;
      const toId = inByRef.get(ref);
      const to = toId ? whMap.get(toId) : undefined;
      return {
        ref,
        when: o.occurredAt,
        sku: o.product.sku,
        qty: Math.abs(o.delta),
        from,
        to,
        reason: o.reason,
      };
    })
    .filter(
      (r) =>
        !fWh || r.from?.code === fWh || r.to?.code === fWh,
    );

  const transfersToday = todayAgg._count._all;
  const unitsToday = Math.abs(todayAgg._sum.delta ?? 0);
  const mostActive =
    activeGroups.length > 0
      ? activeGroups.sort((a, b) => b._count._all - a._count._all)[0]
      : null;
  const mostActiveCode =
    mostActive && mostActive.warehouseId
      ? whMap.get(mostActive.warehouseId)?.code ?? "—"
      : "—";

  const products = productRows.map((p) => ({
    id: p.id,
    label: `${p.sku} @ ${p.warehouseRef?.code ?? "—"} · ${ar ? "كمية" : "qty"} ${formatNumber(p.quantity)}`,
  }));
  const whOptions = warehouses
    .filter((w) => w.active && !w.deletedAt)
    .map((w) => ({ id: w.id, label: `${w.code} — ${w.name}` }));

  const dash = "—";

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "التحويلات" : "Transfers"}
        subtitle={
          ar
            ? "نقل المخزون بين المستودعات — حركتان مزدوجتان لكل تحويل"
            : "Warehouse-to-warehouse stock moves — a paired movement per transfer"
        }
        actions={<AdminFamilyNav current="/admin/transfers" ar={ar} />}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "تحويلات اليوم" : "Transfers today"} value={formatNumber(transfersToday)} />
        <DaylightKpi label={ar ? "وحدات نُقلت اليوم" : "Units moved today"} value={formatNumber(unitsToday)} />
        <DaylightKpi label={ar ? "الأكثر نشاطاً" : "Most active wh"} value={mostActiveCode} />
      </DaylightKpiGrid>

      <div className="mt-3">
        <NewTransferForm products={products} warehouses={whOptions} ar={ar} />
      </div>

      <div className="panel reveal mt-3">
        <form
          method="GET"
          className="flex flex-wrap items-end gap-2 text-[11px] font-bold"
        >
          <label className="flex flex-col gap-1">
            {ar ? "الصنف" : "SKU"}
            <input
              name="sku"
              defaultValue={fSku}
              className="input text-xs"
              placeholder="DAIRY-001"
            />
          </label>
          <label className="flex flex-col gap-1">
            {ar ? "مستودع (رمز)" : "Warehouse (code)"}
            <input
              name="wh"
              defaultValue={fWh}
              className="input text-xs"
              placeholder="AMM-A"
            />
          </label>
          <label className="flex flex-col gap-1">
            {ar ? "التاريخ" : "Date"}
            <input
              name="date"
              type="date"
              defaultValue={fDate}
              className="input text-xs"
            />
          </label>
          <button type="submit" className="btn-secondary btn-sm">
            {ar ? "تصفية" : "Filter"}
          </button>
          {(fSku || fWh || fDate) && (
            <Link href="/admin/transfers" className="btn-ghost btn-sm">
              {ar ? "مسح" : "Clear"}
            </Link>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <ArrowRightLeft
            className="h-10 w-10"
            style={{ color: "var(--ink-muted)" }}
          />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {ar ? "لا تحويلات" : "No transfers"}
          </p>
        </div>
      ) : (
        <div className="panel reveal mt-3 overflow-hidden">
            <table className="dl-table">
              <thead>
                <tr style={{ color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "متى" : "When"}
                  </th>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "من" : "From"}
                  </th>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "إلى" : "To"}
                  </th>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "الصنف" : "SKU"}
                  </th>
                  <th className="px-3 py-2 text-end font-bold">
                    {ar ? "الكمية" : "Qty"}
                  </th>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "السبب" : "Reason"}
                  </th>
                  <th className="px-3 py-2 text-start font-bold">
                    {ar ? "المرجع" : "Ref"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.ref}
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <td
                      className="px-3 py-2 font-mono"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {formatDateTime(r.when, ar ? "ar" : "en")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge-slate">
                        {r.from?.code ?? dash}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge-emerald">
                        {r.to?.code ?? dash}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <Link
                        href={`/admin/products?sku=${encodeURIComponent(r.sku)}`}
                        className="underline decoration-dotted underline-offset-2"
                        style={{ color: "var(--brand-deep)" }}
                      >
                        {r.sku}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-end font-mono font-bold">
                      {formatNumber(r.qty)}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--ink)" }}
                    >
                      {r.reason}
                    </td>
                    <td
                      className="px-3 py-2 font-mono"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {r.ref}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </DaylightShell>
  );
}
