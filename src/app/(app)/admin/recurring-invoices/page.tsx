// /admin/recurring-invoices — docs/HOURANI-ERP-GAPS.md #11 ⚪. Monthly
// fixed-fee templates (incubator programme fees, etc.) that post a real
// Invoice through the existing AR/Revenue engine when due. No wrangler
// cron trigger is wired (same precedent as /api/brain/cron) — an
// external scheduler must hit /api/cron/recurring-invoices with the
// bearer secret, or use "Run due now" below.
import { Repeat } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { createRecurringInvoice, toggleRecurringInvoice, runRecurringInvoicesNow } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function RecurringInvoicesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [templates, customers] = await Promise.all([
    prisma.recurringInvoiceTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { nextRunDate: "asc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/recurring-invoices" ar={ar} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الفواتير الدورية" : "Recurring Invoices"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? "رسوم ثابتة شهرية (رسوم برامج الحاضنة مثلاً) — تُصدر فاتورة حقيقية عند الاستحقاق."
                : "Fixed monthly fees (e.g. incubator programme fees) — posts a real invoice when due."}
            </p>
          </div>
          {canManage && templates.length > 0 ? (
            <form action={runRecurringInvoicesNow}>
              <button type="submit" className="btn btn-primary">{ar ? "تشغيل المستحق الآن" : "Run due now"}</button>
            </form>
          ) : null}
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">{ar ? "فاتورة دورية جديدة" : "New recurring invoice"}</summary>
            <form action={createRecurringInvoice} className="grid gap-4 sm:grid-cols-2 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "العميل" : "Customer"} *</label>
                <select name="customerId" className="select" required defaultValue="">
                  <option value="" disabled>—</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "يوم الشهر (1-28)" : "Day of month (1-28)"} *</label>
                <input type="number" name="dayOfMonth" className="input font-mono" required min={1} max={28} defaultValue={1} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">{ar ? "الوصف" : "Description"} *</label>
                <input name="description" className="input" required maxLength={200} placeholder={ar ? "رسوم برنامج الحاضنة" : "Incubator programme fee"} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المبلغ (د.أ)" : "Amount (JOD)"} *</label>
                <input type="number" step="0.01" name="amount" className="input font-mono" required min={0.01} />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-2">{ar ? "إنشاء" : "Create"}</button>
            </form>
          </details>
        ) : null}

        {templates.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title={ar ? "لا فواتير دورية بعد" : "No recurring invoices yet"}
            description={ar ? "أنشئ فاتورة دورية أعلاه لرسم شهري ثابت." : "Create one above for a fixed monthly charge."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "العميل" : "Customer"}</th>
                  <th>{ar ? "الوصف" : "Description"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "المبلغ" : "Amount"}</th>
                  <th>{ar ? "الاستحقاق التالي" : "Next run"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.customer.name}</td>
                    <td>{t.description}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(Number(t.amount))}</td>
                    <td className="font-mono">{formatDate(t.nextRunDate, ar ? "ar" : "en")}</td>
                    <td>
                      <span className={t.active ? "badge-emerald" : "badge-red"}>
                        {t.active ? (ar ? "نشط" : "Active") : (ar ? "متوقف" : "Paused")}
                      </span>
                    </td>
                    {canManage ? (
                      <td style={{ textAlign: "end" }}>
                        <form action={toggleRecurringInvoice}>
                          <input type="hidden" name="id" value={t.id} />
                          <button type="submit" className="btn btn-ghost" style={{ paddingBlock: 2, fontSize: 12 }}>
                            {t.active ? (ar ? "إيقاف" : "Pause") : (ar ? "تفعيل" : "Activate")}
                          </button>
                        </form>
                      </td>
                    ) : null}
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
