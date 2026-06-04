import "server-only";
import { prisma } from "@/lib/db";
import { marketsAnalytics, type ExportAnalytics } from "@/lib/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderMarkets(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "الأسواق العالمية — قائمة المتابعة" : "Global Markets — Watchlist";
  const stocks = await prisma.marketStock.findMany({ orderBy: { region: "asc" } });
  const analytics = marketsAnalytics(stocks as any);
  const recordCount = stocks.length;
  const subtitle = ar
    ? `${stocks.length} سهم عبر ${new Set(stocks.map((s) => s.region)).size} منطقة`
    : `${stocks.length} stocks across ${new Set(stocks.map((s) => s.region)).size} regions`;
  const html = tableFromRows(
    ar
      ? ["رمز", "اسم", "بورصة", "منطقة", "آخر سعر", "عملة", "تغير %"]
      : ["Ticker", "Label", "Exchange", "Region", "Last", "Currency", "Change %"],
    stocks.map((s) => [
      { v: s.ticker, num: true },
      { v: ar && s.labelAr ? s.labelAr : s.label },
      { v: s.exchange },
      { v: s.region },
      { v: NUM(s.lastPrice, 2), num: true },
      { v: s.currency },
      { v: (s.changePct >= 0 ? "+" : "") + s.changePct.toFixed(2) + "%", num: true },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
