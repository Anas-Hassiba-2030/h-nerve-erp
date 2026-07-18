import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckoutForm } from "./CheckoutForm";
import { openSession, closeSession, voidSale } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, { ar: string; en: string }> = {
  CASH: { ar: "نقدي", en: "Cash" },
  CARD: { ar: "بطاقة", en: "Card" },
  TRANSFER: { ar: "تحويل", en: "Transfer" },
};

export default async function PosPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const openSession_ = await prisma.cashSession.findFirst({
    where: { status: "OPEN", deletedAt: null },
    include: { treasury: true },
  });

  if (!openSession_) {
    const treasuries = await prisma.treasury.findMany({ where: { active: true, deletedAt: null } });
    return (
      <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
        <div className="max-w-md mx-auto py-8 px-4 space-y-6">
          <h1 className="text-xl font-bold">{ar ? "نقطة البيع" : "Point of Sale"}</h1>
          {treasuries.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={ar ? "لا يوجد صندوق نقدي" : "No cash treasury"}
              description={ar ? "أنشئ صندوقاً نقدياً في الخزينة أولاً." : "Create a cash treasury first."}
            />
          ) : (
            <form action={openSession} className="card card-pad space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الصندوق" : "Treasury"} *</label>
                <select name="treasuryId" className="select" required>
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "الرصيد الافتتاحي" : "Opening float"}
                </label>
                <input type="number" name="openingFloat" min={0} step="0.01" defaultValue={0} className="input" />
              </div>
              <button type="submit" className="btn btn-primary w-full">
                {ar ? "فتح الجلسة" : "Open session"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, quantity: { gt: 0 } },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.posSale.findMany({
      where: { sessionId: openSession_.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const cashTotal = sales
    .filter((s) => s.status === "COMPLETED" && s.paymentMethod === "CASH")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const salesTotal = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "نقطة البيع" : "Point of Sale"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${openSession_.treasury.name} · ${formatNumber(sales.length)} عملية · إجمالي ${formatMoney(salesTotal)}`
                : `${openSession_.treasury.name} · ${formatNumber(sales.length)} sales · total ${formatMoney(salesTotal)}`}
            </p>
          </div>
          {canManage ? (
            <form action={closeSession} className="flex items-center gap-2">
              <input type="hidden" name="sessionId" value={openSession_.id} />
              <input
                type="number"
                name="closingCash"
                min={0}
                step="0.01"
                placeholder={ar ? "النقد المعدود" : "Counted cash"}
                className="input"
                style={{ width: 140 }}
                required
              />
              <button type="submit" className="btn-ghost">
                {ar ? "إغلاق الجلسة" : "Close session"}
              </button>
            </form>
          ) : null}
        </div>

        <CheckoutForm
          sessionId={openSession_.id}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unitCost: p.unitCost != null ? Number(p.unitCost) : null,
          }))}
          ar={ar}
        />

        {sales.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "الدفع" : "Payment"}</th>
                  <th>{ar ? "الإجمالي" : "Total"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "الوقت" : "Time"}</th>
                  <th />
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const method = PAYMENT_LABEL[s.paymentMethod] ?? { ar: s.paymentMethod, en: s.paymentMethod };
                  return (
                    <tr key={s.id}>
                      <td className="font-mono">{s.saleNumber}</td>
                      <td>{ar ? method.ar : method.en}</td>
                      <td className="font-mono">{formatMoney(Number(s.total))}</td>
                      <td>
                        <span className={s.status === "VOID" ? "badge-red" : "badge-emerald"}>
                          {s.status === "VOID" ? (ar ? "ملغى" : "Void") : ar ? "مكتمل" : "Completed"}
                        </span>
                      </td>
                      <td>{formatDate(s.createdAt, ar ? "ar" : "en")}</td>
                      <td>
                        <Link href={`/pos/receipts/${s.id}`} className="btn-ghost text-sm">
                          {ar ? "الإيصال" : "Receipt"}
                        </Link>
                      </td>
                      {canManage ? (
                        <td>
                          {s.status === "COMPLETED" ? (
                            <form action={voidSale} className="flex gap-2">
                              <input type="hidden" name="id" value={s.id} />
                              <input
                                type="text"
                                name="reason"
                                placeholder={ar ? "سبب الإلغاء" : "Void reason"}
                                className="input"
                                style={{ width: 140 }}
                                required
                              />
                              <button type="submit" className="btn-ghost text-sm">
                                {ar ? "إلغاء" : "Void"}
                              </button>
                            </form>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
