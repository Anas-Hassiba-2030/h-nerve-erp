// /admin/movements — the inventory ledger (Phase 5).
//
// Append-only audit of every stock change. Product.quantity is a
// denormalized cache = SUM(delta) over non-soft-deleted rows; this page
// is the human-readable trail behind that number. Same placement
// rationale as /admin/imports & /admin/products: (app) route group for
// Topbar + Heritage Modern, server component, no client fetching.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import {
  formatDateTime,
  formatNumber,
  MOVEMENT_TYPES_AR,
  MOVEMENT_TYPES_EN,
  movementBadge,
} from "@/lib/utils/utils";
import { MOVEMENT_TYPES } from "@/lib/finance/inventory";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";

import "../../daylight.css";

export const dynamic = "force-dynamic";

// Same local relative-time helper /admin/products uses — kept page-local
// for consistency with that sibling (minute/hour/day, bilingual).
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

// Date-range presets → a lower bound on occurredAt (null = all time).
const RANGES = ["today", "7d", "30d", "all"] as const;
type Range = (typeof RANGES)[number];
function rangeStart(range: Range): Date | null {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") return new Date(now.getTime() - 7 * 86400_000);
  if (range === "30d") return new Date(now.getTime() - 30 * 86400_000);
  return null;
}

export default async function MovementsAdminPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const ar = getLocale() === "ar";
  // Standard (app) gate (mirrors /admin/imports & /admin/products).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const q = str(searchParams.q);
  const typeFilter = str(searchParams.type);
  const rawRange = str(searchParams.range);
  const range: Range = (RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "all";
  const whFilter = str(searchParams.wh).toUpperCase();

  // Phase 9: movements carry a scalar warehouseId (no relation) —
  // resolve code↔id here for the column, the pills and the filter.
  const allWarehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  const whMap = new Map(allWarehouses.map((w) => [w.id, w.code]));
  const whCodes = [...new Set(allWarehouses.map((w) => w.code))];

  const where: Prisma.InventoryMovementWhereInput = { deletedAt: null };
  if (whFilter) {
    where.warehouseId = {
      in: allWarehouses.filter((w) => w.code === whFilter).map((w) => w.id),
    };
  }
  if (typeFilter && (MOVEMENT_TYPES as readonly string[]).includes(typeFilter)) {
    where.type = typeFilter;
  }
  const since = rangeStart(range);
  if (since) where.occurredAt = { gte: since };
  if (q) {
    // SQLite has no case-insensitive `mode` — case-sensitive contains
    // (same note as /admin/products). productId is matched exactly.
    where.OR = [
      { productId: q },
      { reason: { contains: q } },
      { product: { sku: { contains: q } } },
    ];
  }

  // KPI window = today, independent of the table filters (stable chips).
  const todayStart = rangeStart("today")!;

  const [rows, totalAll, todayCount, todayNet, todayByType] = await Promise.all(
    [
      prisma.inventoryMovement.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 300,
        include: { product: { select: { sku: true, name: true } } },
      }),
      prisma.inventoryMovement.count({ where: { deletedAt: null } }),
      prisma.inventoryMovement.count({
        where: { deletedAt: null, occurredAt: { gte: todayStart } },
      }),
      prisma.inventoryMovement.aggregate({
        _sum: { delta: true },
        where: { deletedAt: null, occurredAt: { gte: todayStart } },
      }),
      prisma.inventoryMovement.groupBy({
        by: ["type"],
        where: { deletedAt: null, occurredAt: { gte: todayStart } },
        _count: { type: true },
      }),
    ],
  );

  const netToday = todayNet._sum.delta ?? 0;
  const topType =
    todayByType.length > 0
      ? todayByType.reduce((a, b) =>
          b._count.type > a._count.type ? b : a,
        ).type
      : null;
  const movLabel = (t: string) =>
    (ar ? MOVEMENT_TYPES_AR : MOVEMENT_TYPES_EN)[t] ?? t;

  const dash = "—";
  const signed = (n: number) => (n > 0 ? `+${formatNumber(n)}` : formatNumber(n));

  // href preserving the other params, toggling one key (like /admin/products).
  const hrefWith = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (typeFilter) p.set("type", typeFilter);
    if (range !== "all") p.set("range", range);
    if (whFilter) p.set("wh", whFilter);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    return s ? `/admin/movements?${s}` : "/admin/movements";
  };

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "سجل حركات المخزون" : "Inventory Ledger"}
        subtitle={
          ar
            ? "كل تغيّر في المخزون = سطر ثابت. الكمية المعروضة = مجموع الحركات"
            : "Every stock change is one immutable row — quantity = SUM(delta)"
        }
      />

      <AdminFamilyNav current="/admin/movements" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الحركات" : "Total movements"} value={formatNumber(totalAll)} />
        <DaylightKpi label={ar ? "حركات اليوم" : "Movements today"} value={formatNumber(todayCount)} />
        <DaylightKpi label={ar ? "صافي تغيّر اليوم" : "Net change today"} value={signed(netToday)} />
        <DaylightKpi label={ar ? "أكثر نوع اليوم" : "Top type today"} value={topType ? movLabel(topType) : dash} />
      </DaylightKpiGrid>

      {/* Search + filter pills */}
      <div className="panel reveal flex flex-col gap-3">
        <form method="GET" className="flex items-center gap-2">
          {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
          {range !== "all" ? <input type="hidden" name="range" value={range} /> : null}
          {whFilter ? <input type="hidden" name="wh" value={whFilter} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={ar ? "بحث: SKU أو السبب أو معرّف المنتج…" : "Search SKU, reason, or productId…"}
            className="input w-full"
            aria-label={ar ? "بحث" : "Search"}
          />
          <button type="submit" className="btn-secondary btn-sm">
            {ar ? "بحث" : "Search"}
          </button>
          {(q || typeFilter || range !== "all" || whFilter) && (
            <Link href="/admin/movements" className="btn-ghost btn-sm">
              {ar ? "مسح" : "Clear"}
            </Link>
          )}
        </form>

        {/* Date-range pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar ? "المدة" : "Range"}
          </span>
          {(
            [
              ["today", ar ? "اليوم" : "Today"],
              ["7d", ar ? "٧ أيام" : "7 days"],
              ["30d", ar ? "٣٠ يوم" : "30 days"],
              ["all", ar ? "الكل" : "All time"],
            ] as [Range, string][]
          ).map(([key, label]) => (
            <Link
              key={key}
              href={hrefWith("range", key === "all" ? "" : key)}
              className={range === key ? "badge-emerald" : "badge-slate"}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar ? "النوع" : "Type"}
          </span>
          <Link
            href={hrefWith("type", "")}
            className={typeFilter ? "badge-slate" : "badge-emerald"}
          >
            {ar ? "الكل" : "All"}
          </Link>
          {MOVEMENT_TYPES.map((t) => (
            <Link
              key={t}
              href={hrefWith("type", t)}
              className={typeFilter === t ? "badge-emerald" : "badge-slate"}
            >
              {movLabel(t)}
            </Link>
          ))}
        </div>

        {/* Warehouse pills (Phase 9) */}
        {whCodes.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar ? "المستودع" : "Warehouse"}
            </span>
            <Link
              href={hrefWith("wh", "")}
              className={whFilter ? "badge-slate" : "badge-emerald"}
            >
              {ar ? "الكل" : "All"}
            </Link>
            {whCodes.map((c) => (
              <Link
                key={c}
                href={hrefWith("wh", c)}
                className={whFilter === c ? "badge-emerald" : "badge-slate"}
              >
                {c}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <ArrowLeftRight className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {totalAll === 0
              ? ar
                ? "لا توجد حركات بعد"
                : "No movements yet"
              : ar
                ? "لا نتائج مطابقة للمرشّحات"
                : "No movements match the filters"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {ar
              ? "تُسجَّل الحركات تلقائياً مع كل استيراد، أو يدوياً عبر «تسوية المخزون»."
              : "Movements are recorded automatically on import, or manually via Adjust stock."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {rows.map((mv) => {
            const positive = mv.delta > 0;
            return (
              <details key={mv.id} className="panel reveal overflow-hidden">
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
                    className="font-mono text-[11px]"
                    style={{ color: "var(--ink-muted)" }}
                    title={formatDateTime(mv.occurredAt, ar ? "ar" : "en")}
                  >
                    {relTime(mv.occurredAt, ar)}
                  </span>
                  <span className={movementBadge(mv.type)}>{movLabel(mv.type)}</span>
                  {mv.warehouseId ? (
                    <span
                      className="badge-slate"
                      title={ar ? "المستودع" : "Warehouse"}
                    >
                      {whMap.get(mv.warehouseId) ?? "—"}
                    </span>
                  ) : null}
                  <Link
                    href={`/admin/products?sku=${encodeURIComponent(mv.product.sku)}`}
                    className="font-mono text-sm font-extrabold underline decoration-dotted underline-offset-2"
                    style={{ color: "var(--brand-deep)" }}
                    title={ar ? "عرض في الكتالوج" : "View in catalog"}
                  >
                    {mv.product.sku}
                  </Link>
                  <span className="truncate text-sm" style={{ color: "var(--ink)" }}>
                    {mv.product.name}
                  </span>
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className="font-mono text-sm font-extrabold"
                      style={{ color: positive ? "#15803d" : "#b91c1c" }}
                    >
                      {signed(mv.delta)}
                    </span>
                    <span className="truncate" style={{ color: "var(--ink-muted)" }}>
                      {mv.reason}
                    </span>
                  </span>
                </summary>

                <div
                  className="grid gap-x-6 gap-y-2 px-4 py-3 text-xs sm:grid-cols-2"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <Detail label={ar ? "وقع في" : "Occurred at"}>
                    {formatDateTime(mv.occurredAt, ar ? "ar" : "en")}
                  </Detail>
                  <Detail label={ar ? "سُجِّل في" : "Recorded at"}>
                    {formatDateTime(mv.createdAt, ar ? "ar" : "en")}
                  </Detail>
                  <Detail label={ar ? "النوع" : "Type"}>
                    <span className={movementBadge(mv.type)}>{movLabel(mv.type)}</span>
                  </Detail>
                  <Detail label={ar ? "التغيّر" : "Delta"}>
                    <span
                      className="font-mono font-bold"
                      style={{ color: positive ? "#15803d" : "#b91c1c" }}
                    >
                      {signed(mv.delta)}
                    </span>
                  </Detail>
                  <Detail label={ar ? "المنتج" : "Product"}>
                    <Link
                      href={`/admin/products?sku=${encodeURIComponent(mv.product.sku)}`}
                      className="underline decoration-dotted underline-offset-2"
                      style={{ color: "var(--brand-deep)" }}
                    >
                      {mv.product.sku} · {mv.product.name}
                    </Link>
                  </Detail>
                  <Detail label={ar ? "المستأجر" : "Tenant"}>
                    <span className="badge-slate">{mv.tenantId}</span>
                  </Detail>
                  <Detail label={ar ? "المستودع" : "Warehouse"}>
                    {mv.warehouseId ? (
                      <Link
                        href={`/admin/warehouses?wh=${encodeURIComponent(
                          whMap.get(mv.warehouseId) ?? "",
                        )}`}
                        className="badge-slate"
                      >
                        {whMap.get(mv.warehouseId) ?? "—"}
                      </Link>
                    ) : (
                      dash
                    )}
                  </Detail>
                  <Detail label={ar ? "السبب" : "Reason"} wide>
                    {mv.reason}
                  </Detail>
                  {mv.note ? (
                    <Detail label={ar ? "ملاحظة" : "Note"} wide>
                      {mv.note}
                    </Detail>
                  ) : null}
                  <Detail label={ar ? "المصدر" : "Source"}>
                    {mv.sourceImportLogId ? (
                      <Link
                        href="/admin/imports"
                        className="badge-blue"
                        title={`ImportLog ${mv.sourceImportLogId}`}
                      >
                        {ar ? "استيراد" : "import"}
                      </Link>
                    ) : (
                      dash
                    )}
                  </Detail>
                  <Detail label={ar ? "مرجع المستند" : "Document ref"}>
                    {mv.documentRef ? (
                      mv.documentRef.startsWith("PO-") ? (
                        <Link
                          href={`/admin/purchase-orders?po=${encodeURIComponent(mv.documentRef)}`}
                          className="underline decoration-dotted underline-offset-2"
                          style={{ color: "var(--brand-deep)" }}
                          title={ar ? "فتح أمر الشراء" : "Open purchase order"}
                        >
                          {mv.documentRef}
                        </Link>
                      ) : mv.documentRef.startsWith("SO-") ? (
                        <Link
                          href={`/admin/sales-orders?so=${encodeURIComponent(mv.documentRef)}`}
                          className="underline decoration-dotted underline-offset-2"
                          style={{ color: "var(--brand-deep)" }}
                          title={ar ? "فتح أمر البيع" : "Open sales order"}
                        >
                          {mv.documentRef}
                        </Link>
                      ) : mv.documentRef.startsWith("TRF-") ? (
                        <Link
                          href="/admin/transfers"
                          className="underline decoration-dotted underline-offset-2"
                          style={{ color: "var(--brand-deep)" }}
                          title={ar ? "فتح التحويلات" : "Open transfers"}
                        >
                          {mv.documentRef}
                        </Link>
                      ) : (
                        mv.documentRef
                      )
                    ) : (
                      dash
                    )}
                  </Detail>
                  <Detail label={ar ? "سجّلها" : "Recorded by"}>
                    {mv.userId ?? dash}
                  </Detail>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </DaylightShell>
  );
}

function Detail({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <span
        className="me-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--ink-muted)" }}
      >
        {label}
      </span>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
