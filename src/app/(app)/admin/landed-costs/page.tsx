// /admin/landed-costs — docs/HOURANI-ERP-GAPS.md #8 🟠. Spread freight/
// customs/clearing across a purchase order's received lines so the next
// sale's COGS reflects the real landed cost, not just the invoice price.
import { Ship } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { createLandedCost } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function LandedCostsPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [landedCosts, purchaseOrders, treasuries] = await Promise.all([
    prisma.landedCost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { purchaseOrder: { select: { poNumber: true } }, lines: { select: { allocatedAmount: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null, status: { in: ["RECEIVED", "PARTIAL"] } },
      orderBy: { orderedAt: "desc" },
      take: 100,
      select: { id: true, poNumber: true },
    }),
    prisma.treasury.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/landed-costs" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "التكاليف اللاحقة" : "Landed Costs"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "وزّع الشحن والجمارك والتخليص على أصناف أمر شراء مستلم — يرفع تكلفة البضاعة الفعلية."
              : "Spread freight, customs, and clearing across a received order's lines — raises the real cost of goods."}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "توزيع تكلفة جديدة" : "New landed cost"}</summary>
            <form action={createLandedCost} className="grid gap-4 sm:grid-cols-2 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "أمر الشراء" : "Purchase order"} *</label>
                <select name="purchaseOrderId" className="select" required defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الخزينة (المدفوع منها)" : "Paid from treasury"} *</label>
                <select name="treasuryId" className="select" required defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المبلغ الإجمالي" : "Total amount"} *</label>
                <input type="number" step="0.01" name="totalAmount" className="input font-mono" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "طريقة التوزيع" : "Allocation method"}</label>
                <select name="allocationMethod" className="select" defaultValue="BY_VALUE">
                  <option value="BY_VALUE">{ar ? "حسب القيمة" : "By value"}</option>
                  <option value="BY_QUANTITY">{ar ? "حسب الكمية" : "By quantity"}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">{ar ? "الوصف" : "Description"} *</label>
                <input name="description" className="input" required maxLength={200} placeholder={ar ? "شحن وتخليص جمركي" : "Freight and customs clearing"} />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-2">
                {ar ? "توزيع وترحيل" : "Allocate and post"}
              </button>
            </form>
          </details>
        ) : null}

        {landedCosts.length === 0 ? (
          <EmptyState
            icon={Ship}
            title={ar ? "لا تكاليف لاحقة بعد" : "No landed costs yet"}
            description={ar ? "وزّع تكلفة أعلاه على أمر شراء مستلم." : "Allocate one above onto a received purchase order."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "أمر الشراء" : "Purchase order"}</th>
                  <th>{ar ? "الوصف" : "Description"}</th>
                  <th>{ar ? "الطريقة" : "Method"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "المبلغ" : "Amount"}</th>
                  <th>{ar ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {landedCosts.map((lc) => (
                  <tr key={lc.id}>
                    <td className="font-mono">{lc.purchaseOrder.poNumber}</td>
                    <td>{lc.description}</td>
                    <td>{lc.allocationMethod === "BY_VALUE" ? (ar ? "حسب القيمة" : "By value") : ar ? "حسب الكمية" : "By quantity"}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(Number(lc.totalAmount))}</td>
                    <td>{formatDate(lc.createdAt, ar ? "ar" : "en")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
