// /admin/reconciliation/[id] — one bank statement's lines, with
// candidate suggestions computed live via lib/finance/reconciliation.ts
// (matchLine) so an unmatched line always shows its best current
// candidate, not just whatever auto-match proposed at creation time.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wand2 } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { matchLine, type PaymentCandidate } from "@/lib/finance/reconciliation";
import { runAutoMatch, confirmMatch, unmatchLine, ignoreLine } from "../actions";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  UNMATCHED: "badge-amber",
  MATCHED: "badge-emerald",
  IGNORED: "badge-slate",
};

export default async function ReconciliationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const statement = await prisma.bankStatement.findUnique({
    where: { id },
    include: {
      treasury: true,
      lines: {
        orderBy: { date: "asc" },
        include: { matchedPayment: true, matchedSupplierPayment: true },
      },
    },
  });
  if (!statement) notFound();

  const [payments, supplierPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { treasuryId: statement.treasuryId, bankStatementLine: null },
      select: { id: true, paidAt: true, amount: true, paymentNumber: true, note: true },
    }),
    prisma.supplierPayment.findMany({
      where: { treasuryId: statement.treasuryId, bankStatementLine: null },
      select: { id: true, paidAt: true, amount: true, paymentNumber: true, note: true },
    }),
  ]);
  const candidates: PaymentCandidate[] = [
    ...payments.map((p) => ({ id: p.id, kind: "PAYMENT" as const, date: p.paidAt, amount: Number(p.amount), number: p.paymentNumber, note: p.note })),
    ...supplierPayments.map((p) => ({ id: p.id, kind: "SUPPLIER_PAYMENT" as const, date: p.paidAt, amount: Number(p.amount), number: p.paymentNumber, note: p.note })),
  ];
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Link href="/admin/reconciliation" className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" />
          {ar ? "كل الكشوفات" : "All statements"}
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {statement.treasury.name} — {formatDate(statement.statementDate, ar ? "ar" : "en")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? "الرصيد الختامي" : "Ending balance"}: {formatMoney(Number(statement.endingBalance), statement.treasury.currency)}
            </p>
          </div>
          {canManage ? (
            <form action={runAutoMatch}>
              <input type="hidden" name="statementId" value={statement.id} />
              <button type="submit" className="btn btn-primary">
                <Wand2 className="h-4 w-4" />
                {ar ? "مطابقة تلقائية" : "Auto-match"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "الوصف" : "Description"}</th>
                <th>{ar ? "المرجع" : "Reference"}</th>
                <th style={{ textAlign: "end" }}>{ar ? "المبلغ" : "Amount"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "المطابقة" : "Match"}</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {statement.lines.map((line) => {
                // The matched payment's own `bankStatementLine` reverse relation is
                // now non-null (it's THIS line), so it was excluded from the
                // `candidates` query above — read it straight off the include
                // instead of looking it up in candidateById.
                const matchedNumber = line.matchedPayment?.paymentNumber ?? line.matchedSupplierPayment?.paymentNumber ?? null;
                const suggestion =
                  line.status === "UNMATCHED"
                    ? matchLine(
                        { id: line.id, date: line.date, description: line.description, reference: line.reference, amount: Number(line.amount) },
                        candidates,
                      )
                    : null;
                const suggestedCandidate = suggestion?.candidateId ? candidateById.get(suggestion.candidateId) : null;

                return (
                  <tr key={line.id}>
                    <td>{formatDate(line.date, ar ? "ar" : "en")}</td>
                    <td>{line.description}</td>
                    <td className="font-mono">{line.reference ?? "—"}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>
                      {formatMoney(Number(line.amount), statement.treasury.currency)}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[line.status] ?? "badge-slate"}>
                        {ar
                          ? { UNMATCHED: "غير مطابقة", MATCHED: "مطابقة", IGNORED: "متجاهلة" }[line.status]
                          : line.status}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {matchedNumber ? (
                        `${line.matchedPaymentId ? "PAY" : "SPAY"} ${matchedNumber}`
                      ) : suggestedCandidate ? (
                        <span style={{ color: "var(--ink-muted)" }}>
                          {ar ? "مقترح" : "suggested"}: {suggestedCandidate.number} ({suggestion!.confidence})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {canManage ? (
                      <td className="flex gap-2">
                        {line.status === "UNMATCHED" && suggestedCandidate ? (
                          <form action={confirmMatch}>
                            <input type="hidden" name="lineId" value={line.id} />
                            <input type="hidden" name="candidateId" value={suggestedCandidate.id} />
                            <input type="hidden" name="candidateKind" value={suggestedCandidate.kind} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "تأكيد" : "Confirm"}
                            </button>
                          </form>
                        ) : null}
                        {line.status === "MATCHED" ? (
                          <form action={unmatchLine}>
                            <input type="hidden" name="lineId" value={line.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "إلغاء المطابقة" : "Unmatch"}
                            </button>
                          </form>
                        ) : null}
                        {line.status === "UNMATCHED" ? (
                          <form action={ignoreLine}>
                            <input type="hidden" name="lineId" value={line.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "تجاهل" : "Ignore"}
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
      </div>
    </div>
  );
}
