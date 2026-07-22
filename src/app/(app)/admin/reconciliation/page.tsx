// /admin/reconciliation — bank reconciliation (docs/HOURANI-ERP-GAPS.md
// #1 🔴). List statements + a form to add one by pasting bank lines.
// Matching detail lives at /admin/reconciliation/[id].
import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { createBankStatement } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const [statements, treasuries] = await Promise.all([
    prisma.bankStatement.findMany({
      where: { deletedAt: null },
      orderBy: { statementDate: "desc" },
      include: { treasury: true, _count: { select: { lines: true } }, lines: { select: { status: true } } },
      take: 100,
    }),
    prisma.treasury.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/reconciliation" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "التسوية البنكية" : "Bank Reconciliation"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "طابق حركات الكشف البنكي بدفعات العملاء والموردين المسجّلة."
              : "Match bank statement lines against recorded customer and supplier payments."}
          </p>
        </div>

        {canManage ? (
          <details className="card card-pad">
            <summary className="font-medium cursor-pointer">
              {ar ? "إضافة كشف حساب جديد" : "Add a new statement"}
            </summary>
            <form action={createBankStatement} className="space-y-4 mt-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الخزينة" : "Treasury"} *</label>
                  <select name="treasuryId" className="select" required>
                    <option value="">{ar ? "اختر خزينة" : "Choose a treasury"}</option>
                    {treasuries.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الكشف" : "Statement date"}</label>
                  <input type="date" name="statementDate" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الرصيد الافتتاحي" : "Starting balance"}</label>
                  <input type="number" step="0.01" name="startingBalance" className="input font-mono" defaultValue={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{ar ? "الرصيد الختامي" : "Ending balance"}</label>
                  <input type="number" step="0.01" name="endingBalance" className="input font-mono" defaultValue={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "سطور الكشف" : "Statement lines"}
                </label>
                <textarea
                  name="lines"
                  className="input font-mono"
                  rows={6}
                  placeholder={"2026-07-10, Wire transfer PAY-000042, PAY-000042, 500.00\n2026-07-11, Supplier withdrawal, PO-991, -1250.00"}
                />
                <p className="mt-1" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  {ar
                    ? "سطر لكل حركة: التاريخ، الوصف، المرجع (اختياري)، المبلغ. مبلغ موجب = إيداع، سالب = سحب."
                    : "One line per transaction: date, description, reference (optional), amount. Positive = deposit, negative = withdrawal."}
                </p>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "إنشاء كشف" : "Create statement"}
              </button>
            </form>
          </details>
        ) : null}

        {statements.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={ar ? "لا كشوفات بعد" : "No statements yet"}
            description={
              ar
                ? "أضف كشف حساب بنكي أعلاه لبدء التسوية."
                : "Add a bank statement above to start reconciling."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الخزينة" : "Treasury"}</th>
                  <th>{ar ? "التاريخ" : "Date"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "الرصيد الختامي" : "Ending balance"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "السطور" : "Lines"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "غير مطابقة" : "Unmatched"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => {
                  const unmatched = s.lines.filter((l) => l.status === "UNMATCHED").length;
                  return (
                    <tr key={s.id}>
                      <td>{s.treasury.name}</td>
                      <td>{formatDate(s.statementDate, ar ? "ar" : "en")}</td>
                      <td className="font-mono" style={{ textAlign: "end" }}>
                        {formatMoney(Number(s.endingBalance), s.treasury.currency)}
                      </td>
                      <td className="font-mono" style={{ textAlign: "end" }}>{formatNumber(s._count.lines)}</td>
                      <td className="font-mono" style={{ textAlign: "end" }}>
                        {unmatched > 0 ? <span className="badge-amber">{formatNumber(unmatched)}</span> : <span className="badge-emerald">0</span>}
                      </td>
                      <td>
                        <Link href={`/admin/reconciliation/${s.id}`} className="btn-ghost text-sm">
                          {ar ? "فتح" : "Open"}
                        </Link>
                      </td>
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
