// /admin/fx — docs/HOURANI-ERP-GAPS.md #4 🔴 (Multi-currency + FX
// revaluation). Enter exchange rates against JOD; every non-JOD invoice
// stamps its rate at issue time (invoicing.ts) and posts the JOD
// equivalent to the ledger. "Run revaluation" re-reads the current rate
// for every open foreign-currency invoice and posts the JOD delta to a
// single FX Gain/Loss account (7900), advancing each invoice's baseline.
import { DollarSign } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { addExchangeRate, runRevaluationNow } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function FxPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");
  const tenantId = (await getActiveTenantSlug()) ?? "hourani-hotels";

  const [rates, openForeignInvoices] = await Promise.all([
    prisma.exchangeRate.findMany({ where: { tenantId }, orderBy: [{ currency: "asc" }, { asOf: "desc" }] }),
    prisma.invoice.count({
      where: { tenantId, deletedAt: null, currency: { not: "JOD" }, status: { notIn: ["DRAFT", "CANCELLED", "PAID"] } },
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/fx" ar={ar} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">{ar ? "أسعار الصرف" : "Exchange Rates"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? "قيمة الدينار الأردني مقابل وحدة واحدة من العملة الأجنبية. يُستخدم عند إصدار الفواتير وإعادة التقييم الدوري."
                : "JOD value of 1 unit of the foreign currency — used to stamp invoices and for period-end revaluation."}
            </p>
          </div>
          {canManage ? (
            <form action={runRevaluationNow}>
              <button type="submit" className="btn btn-primary" disabled={openForeignInvoices === 0}>
                {ar ? "تشغيل إعادة التقييم" : "Run revaluation"}
              </button>
            </form>
          ) : null}
        </div>

        {openForeignInvoices > 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? `${openForeignInvoices} فاتورة مفتوحة بعملة أجنبية.`
              : `${openForeignInvoices} open foreign-currency invoice${openForeignInvoices === 1 ? "" : "s"}.`}
          </p>
        ) : null}

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "سعر صرف جديد" : "New exchange rate"}</summary>
            <form action={addExchangeRate} className="grid gap-4 sm:grid-cols-3 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "العملة" : "Currency"} *</label>
                <input name="currency" className="input font-mono" required maxLength={8} placeholder="USD" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "السعر (د.أ لكل وحدة)" : "Rate (JOD per unit)"} *</label>
                <input type="number" step="0.0001" name="rate" className="input font-mono" required min={0.0001} placeholder="0.7090" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "التاريخ" : "As of"}</label>
                <input type="date" name="asOf" className="input" />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-3">{ar ? "حفظ" : "Save"}</button>
            </form>
          </details>
        ) : null}

        {rates.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={ar ? "لا أسعار صرف بعد" : "No exchange rates yet"}
            description={ar ? "أضف سعرًا أعلاه — الفواتير بالدينار لا تحتاج سعرًا." : "Add one above — JOD invoices never need a rate."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "العملة" : "Currency"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "السعر" : "Rate"}</th>
                  <th>{ar ? "التاريخ" : "As of"}</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono">{r.currency}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{Number(r.rate).toFixed(4)}</td>
                    <td className="font-mono">{formatDate(r.asOf, ar ? "ar" : "en")}</td>
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
