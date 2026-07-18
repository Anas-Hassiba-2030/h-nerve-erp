import { ScrollText, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { saveSupplierProfile, generateEInvoice } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  READY: "badge-emerald",
  SUBMITTED: "badge-amber",
  CLEARED: "badge-emerald",
  REJECTED: "badge-red",
};

export default async function EInvoicingPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [profile, invoices] = await Promise.all([
    prisma.eInvoiceSupplierProfile.findFirst({ where: { deletedAt: null } }),
    prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
      orderBy: { issueDate: "desc" },
      include: { eInvoice: true, customerRef: true },
      take: 100,
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{ar ? "الفوترة الإلكترونية (الأردن — جوفوترة)" : "E-Invoicing (Jordan — JoFotara)"}</h1>
          <div className="mt-2 flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "rgba(239,68,68,.08)", color: "#b91c1c" }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {ar
                ? "هذا نموذج أولي غير معتمد رسمياً. لا يتم إرسال أي شيء إلى دائرة ضريبة الدخل والمبيعات (ISTD) — راجع docs/compliance/JOFOTARA.md قبل الاعتماد عليه للامتثال الفعلي."
                : "This is an UNCERTIFIED v1 scaffold — nothing here is submitted to Jordan's ISTD. See docs/compliance/JOFOTARA.md before relying on it for real compliance."}
            </span>
          </div>
        </div>

        {!profile ? (
          canManage ? (
            <form action={saveSupplierProfile} className="card card-pad space-y-4">
              <h2 className="font-semibold">{ar ? "الملف الضريبي للمنشأة" : "Supplier tax profile"}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "اسم البائع" : "Seller name"} *</label>
                  <input name="sellerName" className="input" required maxLength={200} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الرقم الضريبي (TIN)" : "Tax registration number (TIN)"} *</label>
                  <input name="taxRegistrationNumber" className="input" required maxLength={20} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "رقم النشاط" : "Activity number"} *</label>
                  <input name="activityNumber" className="input" required maxLength={40} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "تسلسل مصدر الدخل" : "Income source sequence"} *</label>
                  <input name="incomeSourceSequence" className="input" required maxLength={40} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                {ar ? "حفظ" : "Save"}
              </button>
            </form>
          ) : (
            <EmptyState
              icon={ScrollText}
              title={ar ? "لم يُهيأ الملف الضريبي بعد" : "Tax profile not configured yet"}
              description={ar ? "اطلب من المدير تهيئة الملف الضريبي." : "Ask a manager to configure the tax profile."}
            />
          )
        ) : (
          <>
            <div className="card card-pad text-sm" style={{ color: "var(--ink-muted)" }}>
              {profile.sellerName} · TIN {profile.taxRegistrationNumber} · {ar ? "النشاط" : "activity"} {profile.activityNumber}
            </div>

            {invoices.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title={ar ? "لا توجد فواتير صادرة بعد" : "No issued invoices yet"}
                description={ar ? "الفواتير الصادرة (غير المسودة) تظهر هنا." : "Issued (non-draft) invoices appear here."}
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar ? "الرقم" : "Number"}</th>
                      <th>{ar ? "العميل" : "Customer"}</th>
                      <th>{ar ? "الإجمالي" : "Total"}</th>
                      <th>{ar ? "التاريخ" : "Date"}</th>
                      <th>{ar ? "حالة الفاتورة الإلكترونية" : "E-invoice status"}</th>
                      {canManage ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-mono">{inv.invoiceNumber}</td>
                        <td>{inv.customerRef.name}</td>
                        <td className="font-mono">{formatMoney(Number(inv.total))}</td>
                        <td>{formatDate(inv.issueDate, ar ? "ar" : "en")}</td>
                        <td>
                          {inv.eInvoice ? (
                            <span className={STATUS_BADGE[inv.eInvoice.status] ?? "badge-slate"}>{inv.eInvoice.status}</span>
                          ) : (
                            <span className="badge-slate">{ar ? "غير منشأة" : "Not generated"}</span>
                          )}
                        </td>
                        {canManage ? (
                          <td>
                            <form action={generateEInvoice}>
                              <input type="hidden" name="invoiceId" value={inv.id} />
                              <button type="submit" className="btn-ghost text-sm">
                                {inv.eInvoice ? (ar ? "إعادة إنشاء" : "Regenerate") : ar ? "إنشاء" : "Generate"}
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
          </>
        )}
      </div>
    </div>
  );
}
