// /admin/journal — the general journal (Phase 8). Posted double-entry
// JournalEntries, immutable. Same conventions as the admin family:
// (app) group, Heritage Modern, Topbar, auth-gated, prisma,
// server component. Money via formatMoney2 (2dp, no symbol).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { formatMoney2, formatNumber, formatDateTime } from "@/lib/utils/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";

import "../../daylight.css";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";
const dec = (d: Prisma.Decimal | null | undefined) => Number(d ?? 0);

export default async function JournalPage({ searchParams }: { searchParams: SP }) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const periodSel = str(searchParams.period); // "YYYY-MM"
  const refPrefix = str(searchParams.ref); // "PO-" | "SO-" | "ADJ:"
  const jeDeep = str(searchParams.je);

  const periods = await prisma.financialPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const openCount = periods.filter((p) => p.status === "OPEN").length;
  const fmtP = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const active =
    periods.find((p) => fmtP(p.year, p.month) === periodSel) ?? periods[0] ?? null;

  const where: Prisma.JournalEntryWhereInput = { status: "POSTED" };
  if (active) where.periodId = active.id;
  if (refPrefix) where.reference = { startsWith: refPrefix };

  const [entries, sums] = await Promise.all([
    active
      ? prisma.journalEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 500,
          include: {
            lines: { include: { account: { select: { code: true, name: true } } } },
          },
        })
      : Promise.resolve([]),
    active
      ? prisma.journalLine.aggregate({
          _sum: { debit: true, credit: true },
          where: { entry: { status: "POSTED", periodId: active.id } },
        })
      : Promise.resolve({ _sum: { debit: null, credit: null } }),
  ]);

  const totDebit = dec(sums._sum.debit);
  const totCredit = dec(sums._sum.credit);
  const diff = Math.round((totDebit - totCredit) * 100) / 100;
  const balanced = Math.abs(diff) < 0.005;

  const dash = "—";
  const refHref = (r: string | null) => {
    if (!r) return null;
    if (r.startsWith("PO-")) return `/admin/purchase-orders?po=${encodeURIComponent(r)}`;
    if (r.startsWith("SO-")) return `/admin/sales-orders?so=${encodeURIComponent(r)}`;
    return null;
  };

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المحاسبة" : "Accounting"}
        title={ar ? "دفتر اليومية" : "General Journal"}
        subtitle={
          ar
            ? "قيود مزدوجة ثابتة — مدين = دائن لكل قيد"
            : "Immutable double-entry — debits = credits per entry"
        }
      />

      <AdminFamilyNav current="/admin/journal" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "قيود الفترة" : "Entries (period)"} value={formatNumber(entries.length)} />
        <DaylightKpi label={ar ? "إجمالي المدين" : "Total debits"} value={formatMoney2(totDebit)} />
        <DaylightKpi label={ar ? "إجمالي الدائن" : "Total credits"} value={formatMoney2(totCredit)} />
        <DaylightKpi label={ar ? "فترات مفتوحة" : "Periods open"} value={formatNumber(openCount)} />
      </DaylightKpiGrid>

      <div className="panel reveal mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
              {ar ? "الفترة" : "Period"}
            </span>
            {periods.length === 0 ? (
              <span className="badge-slate">{ar ? "لا فترات بعد" : "no periods yet"}</span>
            ) : (
              periods.map((p) => {
                const k = fmtP(p.year, p.month);
                const on = active && active.id === p.id;
                return (
                  <Link
                    key={p.id}
                    href={`/admin/journal?period=${k}${refPrefix ? `&ref=${encodeURIComponent(refPrefix)}` : ""}`}
                    className={on ? "badge-emerald" : "badge-slate"}
                  >
                    {k} {p.status === "CLOSED" ? "🔒" : ""}
                  </Link>
                );
              })
            )}
          </div>
          {/* Verify-balance indicator — recomputed every render across all
              POSTED entries in the period (always current). */}
          <span
            className={balanced ? "badge-emerald" : "badge-red"}
            title={ar ? "مجموع المدين − مجموع الدائن" : "Σ debits − Σ credits"}
          >
            {balanced
              ? ar ? "متوازن ✓" : "Balanced ✓"
              : ar ? `غير متوازن بمقدار ${formatMoney2(diff)}` : `Out of balance by ${formatMoney2(diff)}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
            {ar ? "المرجع" : "Reference"}
          </span>
          {[
            ["", ar ? "الكل" : "All"],
            ["PO-", "PO-"],
            ["SO-", "SO-"],
            ["ADJ:", "ADJ:"],
          ].map(([val, label]) => (
            <Link
              key={val || "all"}
              href={`/admin/journal?${active ? `period=${fmtP(active.year, active.month)}` : ""}${val ? `&ref=${encodeURIComponent(val)}` : ""}`}
              className={refPrefix === val ? "badge-emerald" : "badge-slate"}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <BookOpenCheck className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {ar ? "لا قيود في هذه الفترة" : "No journal entries in this period"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {ar
              ? "تُنشأ القيود تلقائياً عند استلام أوامر الشراء وتنفيذ أوامر البيع."
              : "Entries are auto-posted on PO receipt and SO fulfillment."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {entries.map((e) => {
            const total = e.lines.reduce((s, l) => s + dec(l.debit), 0);
            const href = refHref(e.reference);
            return (
              <details key={e.id} className="panel reveal overflow-hidden" open={jeDeep === e.id}>
                <summary
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  style={{ listStyle: "none" }}
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink-muted)" }} aria-hidden />
                  <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {formatDateTime(e.postedAt ?? e.createdAt, ar ? "ar" : "en")}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {e.description}
                  </span>
                  {e.reference ? (
                    href ? (
                      <Link href={href} className="badge-blue">{e.reference}</Link>
                    ) : (
                      <span className="badge-slate">{e.reference}</span>
                    )
                  ) : null}
                  {e.reversesId ? (
                    <span className="badge-amber">{ar ? "عكسي" : "reversal"}</span>
                  ) : null}
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span style={{ color: "var(--ink-muted)" }}>
                      {ar ? "بنود" : "lines"} <b style={{ color: "var(--ink)" }}>{e.lines.length}</b>
                    </span>
                    <span className="font-mono font-extrabold" style={{ color: "var(--ink)" }}>
                      {formatMoney2(total)}
                    </span>
                  </span>
                </summary>
                <div style={{ borderTop: "1px solid var(--line)" }}>
                  <table className="dl-table">
                    <thead>
                      <tr style={{ color: "var(--ink-muted)" }}>
                        <th className="px-3 py-2 text-start font-bold">{ar ? "الحساب" : "Account"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "مدين" : "Debit"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "دائن" : "Credit"}</th>
                        <th className="px-3 py-2 text-start font-bold">{ar ? "بيان" : "Memo"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.lines.map((l) => (
                        <tr key={l.id} style={{ borderTop: "1px solid var(--line)" }}>
                          <td className="px-3 py-2">
                            <span className="font-mono">{l.account.code}</span> · {l.account.name}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {dec(l.debit) ? formatMoney2(dec(l.debit)) : dash}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">
                            {dec(l.credit) ? formatMoney2(dec(l.credit)) : dash}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--ink-muted)" }}>
                            {l.memo ?? dash}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </DaylightShell>
  );
}
