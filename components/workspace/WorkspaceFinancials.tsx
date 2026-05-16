// WorkspaceFinancials — the financial command section. Mirrors the
// dashboard's math exactly (kind === "REVENUE" / "EXPENSE", 30d window,
// previous-period delta, 12-month monthly trend) so the figures here AGREE
// with /dashboard and /finance. Heritage Modern hairline treatment.

import { Sparkline } from "@/components/Sparkline";
import { HeritagePill } from "@/components/heritage";
import { formatMoney, formatPercent, formatNumber } from "@/lib/utils";

export type FinanceTxn = {
  kind: string;
  amount: number;
  occurredAt: Date;
};

export function WorkspaceFinancials({
  ar,
  txns,
}: {
  ar: boolean;
  txns: FinanceTxn[];
}) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const monthMs = 30 * dayMs;
  const start = new Date(now.getTime() - 30 * dayMs);
  const prevStart = new Date(now.getTime() - 60 * dayMs);

  const sum = (kind: string, from: Date, to: Date) =>
    txns
      .filter(
        (t) =>
          t.kind === kind &&
          t.occurredAt >= from &&
          t.occurredAt < to,
      )
      .reduce((a, t) => a + t.amount, 0);

  const revenue = sum("REVENUE", start, now);
  const expense = sum("EXPENSE", start, now);
  const transfer = sum("TRANSFER", start, now);
  const net = revenue - expense;
  const margin = revenue > 0 ? net / revenue : 0;

  const revPrev = sum("REVENUE", prevStart, start);
  const expPrev = sum("EXPENSE", prevStart, start);
  const netPrev = revPrev - expPrev;

  const revDelta = revPrev > 0 ? (revenue - revPrev) / revPrev : 0;
  const expDelta = expPrev > 0 ? (expense - expPrev) / expPrev : 0;
  const netDelta =
    netPrev !== 0 ? (net - netPrev) / Math.abs(netPrev) : 0;

  // 12-month monthly trend (revenue + expense)
  const revenueTrend: number[] = [];
  const expenseTrend: number[] = [];
  const monthLabels: string[] = [];
  const fmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    month: "short",
  });
  for (let i = 11; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * monthMs);
    const to = new Date(now.getTime() - i * monthMs);
    revenueTrend.push(sum("REVENUE", from, to));
    expenseTrend.push(sum("EXPENSE", from, to));
    monthLabels.push(fmt.format(to));
  }
  const maxBar = Math.max(1, ...revenueTrend, ...expenseTrend);

  const cards: Array<{
    label: string;
    value: string;
    delta: number | null;
    higherIsBetter: boolean;
    hint: string;
  }> = [
    {
      label: ar ? "إيراد 30 يوم" : "Revenue 30d",
      value: formatMoney(revenue),
      delta: revPrev > 0 ? revDelta : null,
      higherIsBetter: true,
      hint: ar ? `سابقاً ${formatMoney(revPrev)}` : `Prev ${formatMoney(revPrev)}`,
    },
    {
      label: ar ? "مصاريف 30 يوم" : "Expenses 30d",
      value: formatMoney(expense),
      delta: expPrev > 0 ? expDelta : null,
      higherIsBetter: false,
      hint: ar ? `سابقاً ${formatMoney(expPrev)}` : `Prev ${formatMoney(expPrev)}`,
    },
    {
      label: ar ? "صافي 30 يوم" : "Net 30d",
      value: formatMoney(net),
      delta: netPrev !== 0 ? netDelta : null,
      higherIsBetter: true,
      hint: ar
        ? `هامش ${formatPercent(margin, 1)}`
        : `${formatPercent(margin, 1)} margin`,
    },
    {
      label: ar ? "تحويلات داخلية 30ي" : "Transfers 30d",
      value: formatMoney(transfer),
      delta: null,
      higherIsBetter: true,
      hint: ar ? "آخر 30 يوم" : "last 30 days",
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI quartet — Heritage hairline tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const good =
            c.delta == null
              ? null
              : c.higherIsBetter
                ? c.delta >= 0
                : c.delta <= 0;
          return (
            <div
              key={c.label}
              className="px-4 py-3.5"
              style={{
                background: "var(--heri-cream)",
                border: "1px solid var(--heri-rule)",
              }}
            >
              <div className="heri-eyebrow">{c.label}</div>
              <div
                className="font-display mt-1.5"
                style={{
                  fontSize: "clamp(20px, 1.8vw, 26px)",
                  fontWeight: 600,
                  color: "var(--heri-ink)",
                  letterSpacing: "-0.01em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.value}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {c.delta != null ? (
                  <HeritagePill tone={good ? "success" : "critical"}>
                    {c.delta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(c.delta), 0)}
                  </HeritagePill>
                ) : null}
                <span
                  className="heri-number-mono"
                  style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                >
                  {c.hint}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend — sparkline pair + 12 monthly bars */}
      <div
        className="px-5 py-5"
        style={{
          background: "var(--heri-cream)",
          border: "1px solid var(--heri-rule)",
        }}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="heri-eyebrow">
              {ar ? "اتجاه 12 شهراً — شهرياً" : "12-month trend — monthly"}
            </div>
            <div className="mt-2 flex items-center gap-5">
              <Legend
                color="var(--heri-teal)"
                label={ar ? "إيراد" : "Revenue"}
              />
              <Legend
                color="var(--heri-terracotta)"
                label={ar ? "مصاريف" : "Expenses"}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end">
              <div
                className="heri-number-mono"
                style={{ fontSize: 10, color: "var(--heri-ink-3)" }}
              >
                {ar ? "إيراد" : "REVENUE"}
              </div>
              <Sparkline data={revenueTrend} width={120} height={34} positive />
            </div>
            <div className="text-end">
              <div
                className="heri-number-mono"
                style={{ fontSize: 10, color: "var(--heri-ink-3)" }}
              >
                {ar ? "مصاريف" : "EXPENSE"}
              </div>
              <Sparkline
                data={expenseTrend}
                width={120}
                height={34}
                positive={false}
              />
            </div>
          </div>
        </div>

        <div className="flex items-end gap-1.5" style={{ height: 110 }}>
          {monthLabels.map((mlabel, i) => {
            const rH = (revenueTrend[i] / maxBar) * 90;
            const eH = (expenseTrend[i] / maxBar) * 90;
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                style={{ minWidth: 0 }}
                title={`${mlabel} — ${ar ? "إيراد" : "rev"} ${formatNumber(
                  revenueTrend[i],
                )} · ${ar ? "مصاريف" : "exp"} ${formatNumber(expenseTrend[i])}`}
              >
                <div className="flex w-full items-end justify-center gap-[3px]">
                  <span
                    style={{
                      width: 6,
                      height: Math.max(2, rH),
                      background: "var(--heri-teal)",
                      borderRadius: 1,
                      transition: "height .6s ease",
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: Math.max(2, eH),
                      background: "var(--heri-terracotta)",
                      borderRadius: 1,
                      opacity: 0.75,
                      transition: "height .6s ease",
                    }}
                  />
                </div>
                <span
                  className="heri-number-mono truncate"
                  style={{
                    fontSize: 8.5,
                    color: "var(--heri-ink-3)",
                    maxWidth: "100%",
                  }}
                >
                  {mlabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ fontSize: 11, color: "var(--heri-ink-2)" }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
