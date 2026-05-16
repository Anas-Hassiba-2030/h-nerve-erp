// /workspace/finance — company-scoped P&L + transaction ledger.

import { redirect } from "next/navigation";
import { HeritageSection } from "@/components/heritage";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { getAsOf, formatAsOfLabel } from "@/lib/timemachine";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkspaceFinancePage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";

  // Time-Machine aware — when the user has scrubbed back, the whole
  // P&L + ledger reconstructs the company's books as of that date.
  const { asOf, isTraveling } = getAsOf();
  const txns = await prisma.transaction.findMany({
    where: asOf ? { occurredAt: { lte: asOf } } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 1200,
  });

  const rev = txns
    .filter((t) => t.kind === "REVENUE")
    .reduce((a, t) => a + t.amount, 0);
  const exp = txns
    .filter((t) => t.kind === "EXPENSE")
    .reduce((a, t) => a + t.amount, 0);
  const net = rev - exp;
  const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <St label={ar ? "الإيرادات" : "Revenue"} v={formatMoney(rev)} />
        <St label={ar ? "المصاريف" : "Expenses"} v={formatMoney(exp)} />
        <St label={ar ? "الصافي" : "Net"} v={formatMoney(net)} accent={net < 0} />
        <St label={ar ? "الهامش" : "Margin"} v={`${margin}%`} />
      </section>

      <HeritageSection
        eyebrow={
          isTraveling && asOf
            ? ar
              ? `الحالة كما في ${formatAsOfLabel(asOf, "ar")}`
              : `State as of ${formatAsOfLabel(asOf, "en")}`
            : ar
              ? "مفلتر لهذه الشركة فقط"
              : "Filtered to this company only"
        }
        title={ar ? "القيادة المالية" : "Financial command"}
      >
        <WorkspaceFinancials ar={ar} txns={txns.map((t) => ({ kind: t.kind, amount: t.amount, occurredAt: t.occurredAt }))} />
      </HeritageSection>

      <HeritageSection title={ar ? "سجل الحركات" : "Transaction ledger"}>
        <div className="ws-ledger">
          <div className="ws-ledger-head">
            <span>{ar ? "البيان" : "Description"}</span>
            <span>{ar ? "النوع" : "Kind"}</span>
            <span className="ws-ledger-num">{ar ? "المبلغ" : "Amount"}</span>
            <span className="ws-ledger-num">{ar ? "التاريخ" : "Date"}</span>
          </div>
          <ul>
            {txns.slice(0, 40).map((t) => (
              <li key={t.id} className="ws-ledger-row" data-kind={t.kind}>
                <span className="ws-ledger-desc">
                  {(t as any).description ?? (t as any).note ?? (ar ? "حركة" : "Transaction")}
                </span>
                <span className="ws-ledger-kind">{t.kind}</span>
                <span
                  className="ws-ledger-num ws-mono"
                  style={{
                    color:
                      t.kind === "REVENUE"
                        ? "var(--heri-teal)"
                        : t.kind === "EXPENSE"
                          ? "var(--heri-terracotta)"
                          : "var(--heri-ink)",
                  }}
                >
                  {t.kind === "EXPENSE" ? "−" : "+"}
                  {formatMoney(t.amount)}
                </span>
                <span className="ws-ledger-num ws-mono">
                  {new Intl.DateTimeFormat(
                    ar ? "ar-JO-u-nu-latn" : "en-US",
                    { day: "numeric", month: "short", year: "2-digit" },
                  ).format(new Date(t.occurredAt))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </HeritageSection>
    </div>
  );
}

function St({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="ws-stat">
      <div className="ws-stat-label">{label}</div>
      <div
        className="ws-stat-value"
        style={accent ? { color: "var(--heri-terracotta)" } : undefined}
      >
        {v}
      </div>
    </div>
  );
}
