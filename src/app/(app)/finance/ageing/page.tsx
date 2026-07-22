// /finance/ageing — AR/AP ageing report (docs/HOURANI-ERP-GAPS.md #3:
// "who owes me money, who do I owe, and how overdue"). Pure read: no
// new posting logic, buckets computed by lib/finance/ageing.ts off the
// EXISTING Invoice/PurchaseInvoice + Payment/SupplierPayment tables.
import { Hourglass } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildAgeingReport, AGEING_BUCKETS, type AgeingDocInput, type AgeingReport } from "@/lib/finance/ageing";
import { AgeingTabsClient } from "./AgeingTabsClient";
import "../../daylight.css";

export const dynamic = "force-dynamic";

function AgeingTable({ report, ar, partyLabel }: { report: AgeingReport; ar: boolean; partyLabel: string }) {
  if (report.rows.length === 0) {
    return (
      <EmptyState
        icon={Hourglass}
        title={ar ? "لا أرصدة مستحقة" : "Nothing outstanding"}
        description={
          ar ? "كل الفواتير مسدّدة بالكامل حتى اليوم." : "Every document here is fully settled as of today."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{partyLabel}</th>
              {AGEING_BUCKETS.map((b) => (
                <th key={b.key} style={{ textAlign: "end" }}>
                  {ar ? b.ar : b.en}
                </th>
              ))}
              <th style={{ textAlign: "end" }}>{ar ? "الإجمالي" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {report.byParty.map((p) => (
              <tr key={p.partyId}>
                <td>{p.partyName}</td>
                {AGEING_BUCKETS.map((b) => (
                  <td key={b.key} className="font-mono" style={{ textAlign: "end" }}>
                    {p.buckets[b.key] > 0 ? formatMoney(p.buckets[b.key]) : "—"}
                  </td>
                ))}
                <td className="font-mono" style={{ textAlign: "end", fontWeight: 700 }}>
                  {formatMoney(p.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ fontWeight: 700 }}>{ar ? "الإجمالي" : "Total"}</td>
              {AGEING_BUCKETS.map((b) => (
                <td key={b.key} className="font-mono" style={{ textAlign: "end", fontWeight: 700 }}>
                  {formatMoney(report.bucketTotals[b.key])}
                </td>
              ))}
              <td className="font-mono" style={{ textAlign: "end", fontWeight: 700 }}>
                {formatMoney(report.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{ar ? "الرقم" : "Number"}</th>
              <th>{partyLabel}</th>
              <th>{ar ? "تاريخ الاستحقاق" : "Due date"}</th>
              <th style={{ textAlign: "end" }}>{ar ? "أيام التأخر" : "Days overdue"}</th>
              <th style={{ textAlign: "end" }}>{ar ? "المستحق" : "Outstanding"}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">{r.number}</td>
                <td>{r.partyName}</td>
                <td>{formatDate(r.dueDate ?? r.issueDate, ar ? "ar" : "en")}</td>
                <td className="font-mono" style={{ textAlign: "end" }}>
                  {r.daysOverdue > 0 ? formatNumber(r.daysOverdue) : ar ? "غير مستحقة" : "not due"}
                </td>
                <td className="font-mono" style={{ textAlign: "end" }}>
                  {formatMoney(r.outstanding, r.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AgeingPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const asOf = new Date();

  const [invoices, purchaseInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
      include: { customerRef: true, payments: { select: { amount: true } } },
      orderBy: { dueDate: "asc" },
      take: 500,
    }),
    prisma.purchaseInvoice.findMany({
      where: { deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
      include: { supplierRef: true, payments: { select: { amount: true } } },
      orderBy: { dueDate: "asc" },
      take: 500,
    }),
  ]);

  const arDocs: AgeingDocInput[] = invoices.map((inv) => ({
    id: inv.id,
    number: inv.invoiceNumber,
    partyId: inv.customerId,
    partyName: inv.customerRef.name,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    total: Number(inv.total),
    paid: inv.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    currency: inv.currency,
  }));

  const apDocs: AgeingDocInput[] = purchaseInvoices.map((bill) => ({
    id: bill.id,
    number: bill.purchaseInvoiceNumber,
    partyId: bill.supplierId,
    partyName: bill.supplierRef.name,
    status: bill.status,
    issueDate: bill.issueDate,
    dueDate: bill.dueDate,
    total: Number(bill.total),
    paid: bill.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    currency: bill.currency,
  }));

  const arReport = buildAgeingReport(arDocs, asOf);
  const apReport = buildAgeingReport(apDocs, asOf);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{ar ? "أعمار الذمم" : "AR/AP Ageing"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? `كما في ${formatDate(asOf, "ar")} — ذمم مدينة ${formatMoney(arReport.grandTotal)} · ذمم دائنة ${formatMoney(apReport.grandTotal)}`
              : `As of ${formatDate(asOf, "en")} — receivables ${formatMoney(arReport.grandTotal)} · payables ${formatMoney(apReport.grandTotal)}`}
          </p>
        </div>

        <AgeingTabsClient
          labels={{
            receivables: ar ? `مدينون (${formatNumber(arReport.rows.length)})` : `Receivables (${formatNumber(arReport.rows.length)})`,
            payables: ar ? `دائنون (${formatNumber(apReport.rows.length)})` : `Payables (${formatNumber(apReport.rows.length)})`,
          }}
          receivables={<AgeingTable report={arReport} ar={ar} partyLabel={ar ? "العميل" : "Customer"} />}
          payables={<AgeingTable report={apReport} ar={ar} partyLabel={ar ? "المورّد" : "Supplier"} />}
        />
      </div>
    </div>
  );
}
