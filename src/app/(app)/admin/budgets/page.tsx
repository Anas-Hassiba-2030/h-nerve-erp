// /admin/budgets — budgeting/forecasting (docs/HOURANI-ERP-GAPS.md #10 ⚪).
// Set an annual budget per ledger account; /statements shows the
// budget-vs-actual column on the income statement for the selected year.
import { Target } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { setBudget, deleteBudget } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");
  const currentYear = new Date().getFullYear();

  const [budgets, accounts] = await Promise.all([
    prisma.budget.findMany({ orderBy: [{ year: "desc" }, { accountCode: "asc" }] }),
    prisma.ledgerAccount.findMany({
      where: { type: { in: ["REVENUE", "EXPENSE"] } },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/budgets" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "الموازنة" : "Budgeting"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "ميزانية سنوية لكل حساب — تظهر مقابل الفعلي في قائمة الدخل."
              : "Annual budget per account — shown against actuals on the income statement."}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad" open>
            <summary className="font-medium cursor-pointer">{ar ? "تعيين ميزانية" : "Set a budget"}</summary>
            <form action={setBudget} className="grid gap-4 sm:grid-cols-3 mt-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الحساب" : "Account"} *</label>
                <select name="accountCode" className="select" required defaultValue="">
                  <option value="" disabled>—</option>
                  {accounts.map((a) => (
                    <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "السنة" : "Year"} *</label>
                <input type="number" name="year" className="input font-mono" required defaultValue={currentYear} min={2000} max={2100} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "المبلغ (د.أ)" : "Amount (JOD)"} *</label>
                <input type="number" step="0.01" name="amount" className="input font-mono" required min={0} />
              </div>
              <button type="submit" className="btn btn-primary sm:col-span-3">{ar ? "حفظ" : "Save"}</button>
            </form>
          </details>
        ) : null}

        {budgets.length === 0 ? (
          <EmptyState
            icon={Target}
            title={ar ? "لا ميزانيات بعد" : "No budgets yet"}
            description={ar ? "عيّن ميزانية أعلاه لكل حساب إيراد أو مصروف." : "Set a budget above for each revenue or expense account."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "السنة" : "Year"}</th>
                  <th>{ar ? "الحساب" : "Account"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "الميزانية" : "Budget"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => {
                  const account = accounts.find((a) => a.code === b.accountCode);
                  return (
                    <tr key={b.id}>
                      <td className="font-mono">{b.year}</td>
                      <td>
                        <span className="font-mono" style={{ marginInlineEnd: 8, color: "var(--ink-muted)" }}>{b.accountCode}</span>
                        {account?.name ?? b.accountCode}
                      </td>
                      <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(Number(b.amount))}</td>
                      {canManage ? (
                        <td style={{ textAlign: "end" }}>
                          <form action={deleteBudget}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" className="btn btn-ghost" style={{ paddingBlock: 2, fontSize: 12 }}>
                              {ar ? "حذف" : "Remove"}
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
