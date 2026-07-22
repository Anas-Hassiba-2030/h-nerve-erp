// /admin/quality — QMS (docs/HOURANI-ERP-GAPS.md #6 🟠). Checkpoints
// with optional numeric thresholds + a check ledger. A FAILED check
// auto-quarantines its lot (lib/quality/quality.ts) — this is what
// gives StockLot.status="QUARANTINE" (shipped in #324) an actual reason
// to exist beyond a manual toggle.
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatDateTime, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { createCheckPoint, recordCheck } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
  RECEIPT: { ar: "عند الاستلام", en: "On receipt" },
  PRODUCTION: { ar: "أثناء الإنتاج", en: "During production" },
  TRANSFER: { ar: "عند التحويل", en: "On transfer" },
};

export default async function QualityPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [checkPoints, products, lots, recentChecks] = await Promise.all([
    prisma.qualityCheckPoint.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { sku: "asc" }, take: 300, select: { id: true, sku: true, name: true } }),
    prisma.stockLot.findMany({
      where: { deletedAt: null, status: { not: "CONSUMED" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, lotNumber: true, status: true, product: { select: { sku: true } } },
    }),
    prisma.qualityCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 50,
      include: { checkPoint: true, product: { select: { sku: true, name: true } }, lot: { select: { lotNumber: true } } },
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/quality" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "إدارة الجودة" : "Quality Management"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "نقاط فحص بحدود رقمية اختيارية — الفشل يوقف الدفعة تلقائياً."
              : "Checkpoints with optional numeric thresholds — a failure auto-quarantines the lot."}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "نقطة فحص جديدة" : "New checkpoint"}</summary>
            <form action={createCheckPoint} className="grid gap-4 sm:grid-cols-2 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
                <input name="name" className="input" required maxLength={120} placeholder={ar ? "درجة الحموضة pH" : "pH level"} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المرحلة" : "Stage"} *</label>
                <select name="stage" className="select" required defaultValue="RECEIPT">
                  {Object.entries(STAGE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {ar ? v.ar : v.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "منتج محدد (اختياري)" : "Specific product (optional)"}</label>
                <select name="productId" className="select" defaultValue="">
                  <option value="">{ar ? "عام لكل المنتجات" : "General (any product)"}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الوحدة" : "Unit"}</label>
                <input name="unit" className="input" maxLength={20} placeholder="pH / °C / %" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحد الأدنى" : "Min value"}</label>
                <input type="number" step="0.01" name="minValue" className="input font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحد الأقصى" : "Max value"}</label>
                <input type="number" step="0.01" name="maxValue" className="input font-mono" />
              </div>
              <p className="sm:col-span-2" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                {ar
                  ? "اترك الحدين فارغين لجعل الفحص نجاح/فشل يدوي (مثل الفحص البصري)."
                  : "Leave both blank to make this a manual pass/fail check (e.g. visual inspection)."}
              </p>
              <button type="submit" className="btn btn-primary sm:col-span-2">
                {ar ? "إضافة" : "Add"}
              </button>
            </form>
          </details>
        ) : null}

        {canManage && checkPoints.length > 0 ? (
          <div className="card card-pad space-y-4">
            <h2 className="font-medium">{ar ? "تسجيل نتيجة فحص" : "Record a check result"}</h2>
            <form action={recordCheck} className="grid gap-4 sm:grid-cols-2" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "نقطة الفحص" : "Checkpoint"} *</label>
                <select name="checkPointId" className="select" required defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {checkPoints.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} ({ar ? STAGE_LABEL[cp.stage]?.ar : STAGE_LABEL[cp.stage]?.en})
                      {cp.minValue !== null || cp.maxValue !== null
                        ? ` [${cp.minValue ?? "−∞"}–${cp.maxValue ?? "∞"}${cp.unit ? " " + cp.unit : ""}]`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المنتج" : "Product"} *</label>
                <select name="productId" className="select" required defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الدفعة (اختياري)" : "Lot (optional)"}</label>
                <select name="lotId" className="select" defaultValue="">
                  <option value="">{ar ? "بلا دفعة" : "No lot"}</option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.product.sku} · {l.lotNumber} ({l.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "القيمة المقاسة" : "Measured value"}</label>
                <input type="number" step="0.01" name="measuredValue" className="input font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحكم اليدوي (إن لم توجد حدود)" : "Manual verdict (if no thresholds)"}</label>
                <select name="verdict" className="select" defaultValue="">
                  <option value="">—</option>
                  <option value="PASS">{ar ? "نجاح" : "Pass"}</option>
                  <option value="FAIL">{ar ? "فشل" : "Fail"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
                <input name="note" className="input" maxLength={300} />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-2">
                {ar ? "تسجيل النتيجة" : "Record result"}
              </button>
            </form>
          </div>
        ) : null}

        {checkPoints.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={ar ? "لا نقاط فحص بعد" : "No checkpoints yet"}
            description={ar ? "أضف نقطة فحص أعلاه لبدء تسجيل نتائج الجودة." : "Add a checkpoint above to start recording QC results."}
          />
        ) : recentChecks.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={ar ? "لا نتائج فحص بعد" : "No check results yet"}
            description={ar ? "سجّل أول نتيجة فحص أعلاه." : "Record your first check result above."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الوقت" : "Time"}</th>
                  <th>{ar ? "نقطة الفحص" : "Checkpoint"}</th>
                  <th>{ar ? "المنتج" : "Product"}</th>
                  <th>{ar ? "الدفعة" : "Lot"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "القيمة" : "Value"}</th>
                  <th>{ar ? "النتيجة" : "Result"}</th>
                </tr>
              </thead>
              <tbody>
                {recentChecks.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDateTime(c.checkedAt, ar ? "ar" : "en")}</td>
                    <td>{c.checkPoint.name}</td>
                    <td>{c.product.sku}</td>
                    <td className="font-mono">{c.lot?.lotNumber ?? "—"}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>
                      {c.measuredValue !== null ? formatNumber(Number(c.measuredValue)) : "—"}
                    </td>
                    <td>
                      <span className={c.passed ? "badge-emerald" : "badge-red"}>
                        {c.passed ? (ar ? "نجاح" : "PASS") : (ar ? "فشل" : "FAIL")}
                      </span>
                    </td>
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
