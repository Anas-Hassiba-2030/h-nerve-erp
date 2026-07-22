// /admin/lots — lot / batch traceability with expiry (FEFO).
//
// The console answers three questions a perishables operator asks daily:
//   1. what has already expired and is sitting on my shelf as a loss?
//   2. what expires soon enough that I should move it now?
//   3. if I issue N units, which batches actually leave the building?
//
// Pure math lives in lib/inventory/lots.ts; this page only queries and renders.

import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { bucketByExpiry, daysUntilExpiry, type LotRow } from "@/lib/inventory/lots";
import { receiveLot, consumeFefo, setLotStatus, writeOffLot } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const WARN_DAYS = 14;

export default async function LotsPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");
  const now = new Date();

  const [lots, products] = await Promise.all([
    prisma.stockLot.findMany({
      where: { deletedAt: null },
      orderBy: [{ expiryDate: "asc" }, { lotNumber: "asc" }],
      include: {
        product: { select: { id: true, sku: true, name: true, unitCost: true, deletedAt: true } },
      },
      take: 400,
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, shelfLifeDays: true },
      take: 500,
    }),
  ]);

  const live = lots.filter((l) => !l.product.deletedAt);
  const rows: LotRow[] = live.map((l) => ({
    id: l.id,
    lotNumber: l.lotNumber,
    expiryDate: l.expiryDate,
    quantity: l.quantity,
    status: l.status,
  }));
  const buckets = bucketByExpiry(rows, now, WARN_DAYS);
  const byId = new Map(live.map((l) => [l.id, l]));

  // Money at risk, priced per product rather than with one blended cost.
  const money = (ids: LotRow[]) =>
    ids.reduce((total, r) => {
      const full = byId.get(r.id);
      const cost = full?.product.unitCost ? Number(full.product.unitCost) : 0;
      return total + r.quantity * cost;
    }, 0);
  const expiredValue = money(buckets.expired);
  const expiringValue = money(buckets.expiring);

  const quarantined = live.filter((l) => l.status === "QUARANTINE");

  function StatusBadge({ status }: { status: string }) {
    if (status === "QUARANTINE") return <span className="badge-amber">{ar ? "حجر" : "Quarantine"}</span>;
    if (status === "EXPIRED") return <span className="badge-red">{ar ? "منتهية" : "Expired"}</span>;
    if (status === "CONSUMED") return <span className="badge-gray">{ar ? "مستهلكة" : "Consumed"}</span>;
    return <span className="badge-green">{ar ? "نشطة" : "Active"}</span>;
  }

  function LotTable({ rowsIn, showAge }: { rowsIn: LotRow[]; showAge: boolean }) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{ar ? "المنتج" : "Product"}</th>
              <th>{ar ? "رقم الدفعة" : "Lot"}</th>
              <th>{ar ? "الكمية" : "Qty"}</th>
              <th>{ar ? "الانتهاء" : "Expiry"}</th>
              {showAge ? <th>{ar ? "الأيام المتبقية" : "Days left"}</th> : null}
              <th>{ar ? "الحالة" : "Status"}</th>
              {canManage ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rowsIn.map((r) => {
              const full = byId.get(r.id);
              if (!full) return null;
              const left = daysUntilExpiry(r, now);
              return (
                <tr key={r.id}>
                  <td>
                    {full.product.name}{" "}
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                      {full.product.sku}
                    </span>
                  </td>
                  <td className="font-mono">{r.lotNumber}</td>
                  <td className="font-mono">{formatNumber(r.quantity)}</td>
                  <td>{r.expiryDate ? formatDate(r.expiryDate) : <span style={{ color: "var(--ink-muted)" }}>—</span>}</td>
                  {showAge ? (
                    <td className="font-mono">{left === null ? "—" : formatNumber(left)}</td>
                  ) : null}
                  <td><StatusBadge status={r.status} /></td>
                  {canManage ? (
                    <td>
                      <div className="flex gap-2">
                        {r.status === "QUARANTINE" ? (
                          <form action={setLotStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="ACTIVE" />
                            <button type="submit" className="btn-ghost" style={{ fontSize: 12 }}>
                              {ar ? "إفراج" : "Release"}
                            </button>
                          </form>
                        ) : (
                          <form action={setLotStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="QUARANTINE" />
                            <button type="submit" className="btn-ghost" style={{ fontSize: 12 }}>
                              {ar ? "حجر" : "Hold"}
                            </button>
                          </form>
                        )}
                        <form action={writeOffLot}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="btn-ghost" style={{ fontSize: 12 }}>
                            {ar ? "شطب" : "Write off"}
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الدفعات والصلاحية" : "Lots & Expiry"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(live.length)} دفعة · ${formatNumber(buckets.expired.length)} منتهية · ${formatNumber(buckets.expiring.length)} تنتهي خلال ${WARN_DAYS} يوماً`
                : `${formatNumber(live.length)} lots · ${formatNumber(buckets.expired.length)} expired · ${formatNumber(buckets.expiring.length)} expiring within ${WARN_DAYS} days`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/movements" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "الحركات" : "Movements"}
            </Link>
          </div>
        </div>

        <AdminFamilyNav current="/admin/lots" ar={ar} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card card-pad">
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{ar ? "قيمة منتهية" : "Expired value"}</div>
            <div className="text-xl font-bold font-mono">{formatNumber(Math.round(expiredValue))}</div>
          </div>
          <div className="card card-pad">
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
              {ar ? `قيمة معرّضة (${WARN_DAYS} يوماً)` : `At risk (${WARN_DAYS} days)`}
            </div>
            <div className="text-xl font-bold font-mono">{formatNumber(Math.round(expiringValue))}</div>
          </div>
          <div className="card card-pad">
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{ar ? "تحت الحجر" : "In quarantine"}</div>
            <div className="text-xl font-bold font-mono">{formatNumber(quarantined.length)}</div>
          </div>
        </div>

        {live.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={ar ? "لا توجد دفعات بعد" : "No lots yet"}
            description={
              ar
                ? "استلم أول دفعة لتفعيل تتبّع الصلاحية والصرف بالأقدم انتهاءً على هذا المنتج."
                : "Receive the first lot to switch this product onto expiry tracking and first-expired-first-out issuing."
            }
          />
        ) : (
          <>
            {buckets.expired.length > 0 ? (
              <div className="card card-pad space-y-3">
                <div className="text-sm font-bold">{ar ? "منتهية الصلاحية — خسارة قائمة" : "Expired — a loss already on the shelf"}</div>
                <LotTable rowsIn={buckets.expired} showAge={false} />
              </div>
            ) : null}

            {buckets.expiring.length > 0 ? (
              <div className="card card-pad space-y-3">
                <div>
                  <div className="text-sm font-bold">{ar ? "تنتهي قريباً" : "Expiring soon"}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                    {ar
                      ? `دفعات تنتهي خلال ${WARN_DAYS} يوماً — حرّكها قبل أن تصبح خسارة.`
                      : `Lots expiring within ${WARN_DAYS} days — move them before they become a write-off.`}
                  </div>
                </div>
                <LotTable rowsIn={buckets.expiring} showAge />
              </div>
            ) : null}

            <div className="card card-pad space-y-3">
              <div className="text-sm font-bold">{ar ? "كل الدفعات السليمة" : "Healthy lots"}</div>
              <LotTable rowsIn={buckets.ok} showAge />
            </div>
          </>
        )}

        {canManage ? (
          <>
            <form action={receiveLot} className="card card-pad space-y-4" noValidate>
              <div>
                <div className="text-sm font-bold">{ar ? "استلام دفعة" : "Receive a lot"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                  {ar
                    ? "اترك تاريخ الانتهاء فارغاً ليُحتسب من مدة الصلاحية المسجّلة على المنتج."
                    : "Leave the expiry blank to derive it from the product's recorded shelf life."}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "المنتج" : "Product"} *</label>
                  <select name="productId" className="select" required>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                        {p.shelfLifeDays ? ` — ${p.shelfLifeDays}d` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "رقم الدفعة" : "Lot number"} *</label>
                  <input name="lotNumber" className="input" required maxLength={80} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الكمية" : "Quantity"} *</label>
                  <input name="quantity" type="number" min={1} step={1} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الإنتاج" : "Produced on"}</label>
                  <input name="producedAt" type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الانتهاء" : "Expiry"}</label>
                  <input name="expiryDate" type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "مرجع دفعة المورّد" : "Supplier lot ref"}</label>
                  <input name="supplierLotRef" className="input" maxLength={120} />
                </div>
              </div>
              <label className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <input type="checkbox" name="quarantine" />
                {ar ? "استلام تحت الحجر (بانتظار فحص الجودة)" : "Receive into quarantine (awaiting QC)"}
              </label>
              <button type="submit" className="btn btn-primary">{ar ? "استلام" : "Receive"}</button>
            </form>

            <form action={consumeFefo} className="card card-pad space-y-4" noValidate>
              <div>
                <div className="text-sm font-bold">{ar ? "صرف بالأقدم انتهاءً (FEFO)" : "Issue first-expired-first-out (FEFO)"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                  {ar
                    ? "يختار النظام الدفعات الأقرب انتهاءً أولاً. إن لم تكفِ الكمية لا يُصرف شيء."
                    : "The system picks the soonest-expiring lots first. If the lots cannot cover the quantity, nothing is issued."}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
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
                  <label className="block text-sm font-medium mb-1">{ar ? "الكمية" : "Quantity"} *</label>
                  <input name="quantity" type="number" min={1} step={1} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "السبب" : "Reason"}</label>
                  <input name="reason" className="input" maxLength={200} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">{ar ? "صرف" : "Issue"}</button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
