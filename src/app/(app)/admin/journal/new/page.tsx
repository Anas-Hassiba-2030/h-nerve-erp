// /admin/journal/new — manual journal entry. A fixed set of line rows
// (see actions.ts MAX_ROWS comment for why not a dynamic add-row form).
// Each row can tag a CostCenter (docs/HOURANI-ERP-GAPS.md #2) so the
// dimension-filtered P&L at /statements has something real to filter.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { postManualJournalEntry } from "../actions";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

const ROWS = 8;

export default async function NewJournalEntryPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const [accounts, costCenters] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.costCenter.findMany({ where: { deletedAt: null, active: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Link href="/admin/journal" className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "اليومية" : "Journal"}
        </Link>

        <h1 className="text-xl font-bold">{ar ? "قيد يدوي جديد" : "New manual journal entry"}</h1>

        <form action={postManualJournalEntry} className="card card-pad space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "الوصف" : "Description"} *</label>
              <input name="description" className="input" required maxLength={200} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "التاريخ" : "Date"}</label>
              <input type="date" name="date" className="input" />
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الحساب" : "Account"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "مدين" : "Debit"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "دائن" : "Credit"}</th>
                  <th>{ar ? "مركز التكلفة" : "Cost centre"}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROWS }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <select name={`accountCode_${i}`} className="select" defaultValue="">
                        <option value="">—</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="number" step="0.01" name={`debit_${i}`} className="input font-mono" style={{ textAlign: "end" }} />
                    </td>
                    <td>
                      <input type="number" step="0.01" name={`credit_${i}`} className="input font-mono" style={{ textAlign: "end" }} />
                    </td>
                    <td>
                      <select name={`costCenterId_${i}`} className="select" defaultValue="">
                        <option value="">{ar ? "بلا" : "None"}</option>
                        {costCenters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            {ar
              ? "يجب أن يتساوى إجمالي المدين مع إجمالي الدائن قبل الترحيل."
              : "Total debits must equal total credits before this can post."}
          </p>

          <button type="submit" className="btn btn-primary">
            {ar ? "ترحيل القيد" : "Post entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
