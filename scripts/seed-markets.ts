// scripts/seed-markets.ts — Phase V3-P11.
// Idempotent: seeds MENA + global indices + commodities + FX + 5
// Hourani-relevant Tadawul tickers. Static realistic values + a
// 7-point sparkline series so the /markets cards render with
// meaningful charts instead of flat lines.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function walk(seed: number, len = 7, vol = 0.018): number[] {
  // Deterministic random walk per ticker so the sparkline is stable
  // across reseeds. Returns `len` prices anchored around 1.0 — caller
  // multiplies by the last price.
  let x = seed;
  const next = () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return (x % 10000) / 10000; // 0..1
  };
  const out: number[] = [];
  let p = 1;
  for (let i = 0; i < len; i++) {
    out.push(p);
    const r = (next() - 0.5) * 2 * vol;
    p = p * (1 + r);
  }
  return out;
}

type T = {
  ticker: string;
  label: string;
  labelAr: string;
  exchange: string;
  currency: string;
  lastPrice: number;
  changePct: number;
  region: string;
  seed: number;
  vol?: number;
};

const TICKERS: T[] = [
  // Regional indices
  { ticker: "TASI",   label: "Tadawul All Share Index", labelAr: "مؤشر تداول",       exchange: "TADAWUL", currency: "SAR", lastPrice: 11842.5, changePct: 0.62,  region: "MENA", seed: 12001, vol: 0.012 },
  { ticker: "ADX",    label: "Abu Dhabi Sec. Exchange", labelAr: "مؤشر أبوظبي",       exchange: "ADX",     currency: "AED", lastPrice: 9620.1,  changePct: -0.18, region: "MENA", seed: 12002, vol: 0.010 },
  { ticker: "DFM",    label: "Dubai Financial Market",  labelAr: "مؤشر دبي",          exchange: "DFM",     currency: "AED", lastPrice: 4280.7,  changePct: 0.41,  region: "MENA", seed: 12003, vol: 0.011 },
  { ticker: "EGX30",  label: "EGX 30",                  labelAr: "مؤشر مصر",          exchange: "EGX",     currency: "EGP", lastPrice: 30412.8, changePct: 1.24,  region: "MENA", seed: 12004, vol: 0.018 },
  // Commodities + FX
  { ticker: "BRENT",  label: "Brent Crude",             labelAr: "خام برنت",          exchange: "ICE",     currency: "USD", lastPrice: 79.42,   changePct: 0.94,  region: "EU",   seed: 12005, vol: 0.020 },
  { ticker: "XAU",    label: "Gold (USD/oz)",           labelAr: "ذهب",                exchange: "COMEX",   currency: "USD", lastPrice: 2380.6,  changePct: 0.31,  region: "US",   seed: 12006, vol: 0.008 },
  { ticker: "USDJOD", label: "USD / JOD",               labelAr: "دولار/دينار أردني", exchange: "FX",      currency: "JOD", lastPrice: 0.709,   changePct: 0.00,  region: "MENA", seed: 12007, vol: 0.001 },
  // Tadawul stocks
  { ticker: "2280",   label: "Almarai",                 labelAr: "المراعي",            exchange: "TADAWUL", currency: "SAR", lastPrice: 53.20, changePct: 0.95, region: "MENA", seed: 12010 },
  { ticker: "7010",   label: "Saudi Telecom",           labelAr: "الاتصالات السعودية", exchange: "TADAWUL", currency: "SAR", lastPrice: 38.95, changePct: -0.41, region: "MENA", seed: 12011 },
  { ticker: "2222",   label: "Saudi Aramco",            labelAr: "أرامكو",             exchange: "TADAWUL", currency: "SAR", lastPrice: 28.10, changePct: 0.18, region: "MENA", seed: 12012, vol: 0.006 },
  { ticker: "1010",   label: "Riyad Bank",              labelAr: "بنك الرياض",         exchange: "TADAWUL", currency: "SAR", lastPrice: 30.75, changePct: 1.15, region: "MENA", seed: 12013 },
  { ticker: "2050",   label: "Savola Group",            labelAr: "صافولا",             exchange: "TADAWUL", currency: "SAR", lastPrice: 34.05, changePct: -0.62, region: "MENA", seed: 12014 },
];

async function main() {
  let written = 0;
  for (const t of TICKERS) {
    const history = walk(t.seed, 7, t.vol ?? 0.014).map((m) => +(m * t.lastPrice).toFixed(2));
    await prisma.marketStock.upsert({
      where: { ticker: t.ticker },
      create: {
        ticker: t.ticker,
        label: t.label,
        labelAr: t.labelAr,
        exchange: t.exchange,
        currency: t.currency,
        lastPrice: t.lastPrice,
        changePct: t.changePct,
        region: t.region,
        history: JSON.stringify(history),
      },
      update: {
        label: t.label,
        labelAr: t.labelAr,
        exchange: t.exchange,
        currency: t.currency,
        lastPrice: t.lastPrice,
        changePct: t.changePct,
        region: t.region,
        history: JSON.stringify(history),
      },
    });
    written++;
  }
  console.log(`MarketStock seeded: ${written}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
