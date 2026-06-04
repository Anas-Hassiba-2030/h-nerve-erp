"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/finance/period";

const PERIODS: Array<{ id: Period; ar: string; en: string }> = [
  { id: "24H", ar: "24س",  en: "24h" },
  { id: "7D",  ar: "7أ",   en: "7d" },
  { id: "30D", ar: "30ي",  en: "30d" },
  { id: "QTD", ar: "ربع",  en: "QTD" },
  { id: "YTD", ar: "سنة",  en: "YTD" },
];

// Updates the ?period= query param while preserving other params.
// Pure client navigation — no full page reload.
export function PeriodSelector({
  current = "30D",
  locale = "en",
}: {
  current?: Period;
  locale?: "ar" | "en";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ar = locale === "ar";

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="pill-group" role="tablist" aria-label="Period">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriod(p.id)}
          data-active={current === p.id}
          className="pill"
          aria-selected={current === p.id}
          role="tab"
          title={p.en}
        >
          {ar ? p.ar : p.en}
        </button>
      ))}
    </div>
  );
}

