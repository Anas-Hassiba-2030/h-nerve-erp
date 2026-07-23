// Compact financial visualization — revenue vs expense bars per month + net
// line, with totals and margin %. Designed to read in <2 seconds.

import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/utils/utils";

export function FinancialPulse({
  revenueTrend,
  expenseTrend,
  monthLabels,
  locale = "en",
}: {
  revenueTrend: number[];
  expenseTrend: number[];
  monthLabels: string[];
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const totalRev = revenueTrend.reduce((a, b) => a + b, 0);
  const totalExp = expenseTrend.reduce((a, b) => a + b, 0);
  const net = totalRev - totalExp;
  const margin = totalRev > 0 ? (net / totalRev) * 100 : 0;
  const max = Math.max(1, ...revenueTrend, ...expenseTrend);

  // Latest month delta vs previous
  const last = revenueTrend[revenueTrend.length - 1] ?? 0;
  const prev = revenueTrend[revenueTrend.length - 2] ?? 0;
  const momChange = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  return (
    <div>
      {/* Top stats row */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label={ar ? "إيرادات" : "Revenue"} value={formatMoney(totalRev)} color="#10b981" />
        <Stat label={ar ? "مصاريف" : "Expense"} value={formatMoney(totalExp)} color="#ef4444" />
        <Stat
          label={ar ? "صافي" : "Net"}
          value={formatMoney(net)}
          color={net >= 0 ? "#0a8e54" : "#dc2626"}
          extra={
            <span className={net >= 0 ? "text-emerald-700" : "text-red-600"}>
              {margin.toFixed(1)}%
            </span>
          }
        />
      </div>

      {/* Mini paired bar chart */}
      <div className="flex h-24 items-end gap-1.5">
        {revenueTrend.map((rev, i) => {
          const exp = expenseTrend[i] ?? 0;
          const revPct = (rev / max) * 100;
          const expPct = (exp / max) * 100;
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-0.5"
              title={`${monthLabels[i]}: rev ${formatMoney(rev)}, exp ${formatMoney(exp)}`}
            >
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t-sm transition group-hover:opacity-80"
                  style={{
                    height: `${revPct}%`,
                    background:
                      "linear-gradient(to top, #0a8e54 0%, #10b981 100%)",
                    transform: "scaleY(0)",
                    transformOrigin: "bottom",
                    animation: "bar-grow .9s cubic-bezier(.21,.92,.32,1) forwards",
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
                <div
                  className="w-1/2 rounded-t-sm transition group-hover:opacity-80"
                  style={{
                    height: `${expPct}%`,
                    background:
                      "linear-gradient(to top, #b91c1c 0%, #ef4444 100%)",
                    transform: "scaleY(0)",
                    transformOrigin: "bottom",
                    animation: "bar-grow .9s cubic-bezier(.21,.92,.32,1) forwards",
                    animationDelay: `${i * 0.04 + 0.05}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[12px]" style={{ color: "var(--text-muted)" }}>
        {monthLabels.map((l, i) =>
          i === 0 || i === monthLabels.length - 1 || i === Math.floor(monthLabels.length / 2) ? (
            <span key={i} className="font-mono">{l}</span>
          ) : (
            <span key={i} className="opacity-30">·</span>
          )
        )}
      </div>

      {/* MoM indicator */}
      <div className="mt-2 flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <Wallet className="h-3 w-3" />
          {ar ? "مقارنة بالشهر السابق" : "Month over month"}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 font-bold ${
            momChange >= 0 ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {momChange >= 0 ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {momChange >= 0 ? "+" : ""}
          {momChange.toFixed(1)}%
        </span>
      </div>

      <style>{`@keyframes bar-grow { to { transform: scaleY(1) } }`}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  extra,
}: {
  label: string;
  value: string;
  color: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-2"
      style={{
        background: `color-mix(in srgb, ${color} 6%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 14%, var(--border))`,
      }}
    >
      <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-black tabular-nums" style={{ color: "var(--text)" }}>
        {value}
        {extra ? <span className="text-[12px] font-bold">{extra}</span> : null}
      </div>
    </div>
  );
}
