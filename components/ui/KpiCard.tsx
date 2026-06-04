import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { AnimatedNumber } from "./AnimatedNumber";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "emerald",
  hint,
  // If a numericValue is provided alongside `value`, the card will count up
  // animatedly to that number while keeping the formatted string fallback.
  numericValue,
  prefix,
  suffix,
  decimals = 0,
  currency,
}: {
  label: string;
  value: string;
  delta?: { value: string; up: boolean };
  icon?: LucideIcon;
  tone?: "emerald" | "amber" | "blue" | "violet" | "slate" | "red" | "sky" | "indigo";
  hint?: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  currency?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    red: "bg-red-50 text-red-700 ring-red-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  };

  return (
    <div className="kpi sparkle">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">
            {numericValue != null ? (
              <AnimatedNumber
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
                currency={currency}
              />
            ) : (
              value
            )}
          </div>
          {delta ? (
            <div className={delta.up ? "kpi-delta-up" : "kpi-delta-down"}>
              {delta.up ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {delta.value}
            </div>
          ) : hint ? (
            <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 anim-pop",
              tones[tone]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
