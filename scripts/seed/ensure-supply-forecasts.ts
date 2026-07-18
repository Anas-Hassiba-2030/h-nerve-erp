// scripts/seed/ensure-supply-forecasts.ts
//
// SUPPLY-FORECASTS TOP-UP — runs on every deploy (railway.toml), independent
// of seed-if-empty.ts. Production may have companies (so seed-if-empty skips)
// but ZERO supply forecasts — leaves /supply-chain showing "No forecasts yet."
//
// This inserts ~6 realistic cross-company forecasts ONLY when the
// SupplyForecast table is empty, so it:
//   • fills the /supply-chain dashboard on a DB that pre-dates the forecast
//     seed, and
//   • never touches a DB that already has forecasts (user-created or seeded).
//
// Idempotent and non-blocking — a hiccup can never fail the deploy.
//
//   npx tsx scripts/seed/ensure-supply-forecasts.ts

import { makePrismaClient } from "../_prisma";
import { PrismaClient } from "@prisma/client";

function dayOffset(days: number, hour = 8): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const prisma = makePrismaClient();
  try {
    const existing = await prisma.supplyForecast.count();
    if (existing > 0) {
      console.log(`[ensure-supply-forecasts] ${existing} forecast(s) already present — skipping.`);
      return;
    }

    // Need at least two companies to form a source → target bridge.
    const companies = await prisma.company.findMany({
      select: { id: true, code: true, sector: true },
    });
    if (companies.length < 2) {
      console.log("[ensure-supply-forecasts] need ≥2 companies — skipping (run seed-if-empty.ts first).");
      return;
    }

    // Prefer the canonical Hourani group codes when present, fall back to any
    // company so this works for fresh tenants too.
    const byCode = new Map(companies.map((c) => [c.code, c]));
    const bySector = (s: string) => companies.find((c) => c.sector === s);
    const hospitality = byCode.get("ARENA") ?? bySector("HOSPITALITY") ?? companies[0];
    const dairy       = byCode.get("MAHA")  ?? bySector("DAIRY")       ?? companies[1] ?? companies[0];
    const agri        = byCode.get("LORAN") ?? bySector("AGRICULTURE") ?? companies[1] ?? companies[0];
    const education   = byCode.get("AAU")   ?? bySector("EDUCATION")   ?? companies[0];

    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

    const seeds = [
      {
        sourceCompanyId: hospitality.id, targetCompanyId: dairy.id,
        category: "DAIRY",
        productLabel: "حليب + لبنة لإفطارات النزلاء",
        productLabelEn: "Milk + labneh for guest breakfasts",
        unit: "لتر", predictedDemand: 1850, confidence: 0.91,
        periodStart: dayOffset(2), periodEnd: dayOffset(9),
        signal: "تأكيد 380 حجز إضافي في أرينا عمّان — استهلاك إفطار متوقع +42%.",
        status: "APPROVED",
      },
      {
        sourceCompanyId: hospitality.id, targetCompanyId: agri.id,
        category: "PRODUCE",
        productLabel: "طماطم + خيار + فلفل للمطبخ",
        productLabelEn: "Tomatoes + cucumbers + peppers for the kitchen",
        unit: "كغ", predictedDemand: 620, confidence: 0.84,
        periodStart: dayOffset(3), periodEnd: dayOffset(10),
        signal: "إشغال أرينا البحر الميت تجاوز 88% للأسبوع القادم — توجيه دفيئة لوران 1 بأولوية الحصاد.",
        status: "DRAFT",
      },
      {
        sourceCompanyId: hospitality.id, targetCompanyId: dairy.id,
        category: "DAIRY",
        productLabel: "أجبان مشكّلة لمنتجع البحر الميت",
        productLabelEn: "Assorted cheeses for the Dead Sea resort",
        unit: "كغ", predictedDemand: 220, confidence: 0.76,
        periodStart: dayOffset(5), periodEnd: dayOffset(12),
        signal: "موسم الربيع — حجوزات عائلية +31% مقارنة بالعام الماضي.",
        status: "DRAFT",
      },
      {
        sourceCompanyId: education.id, targetCompanyId: dairy.id,
        category: "DAIRY",
        productLabel: "حليب + زبادي للكافتيريات",
        productLabelEn: "Milk + yogurt for the cafeterias",
        unit: "لتر", predictedDemand: 980, confidence: 0.88,
        periodStart: dayOffset(1), periodEnd: dayOffset(7),
        signal: "بدء الفصل الدراسي + معارض «The Tank» — استهلاك الكافتيريات يرتفع بانتظام في هذا التوقيت.",
        status: "EXECUTED",
      },
      {
        sourceCompanyId: hospitality.id, targetCompanyId: agri.id,
        category: "PRODUCE",
        productLabel: "بصل + بطاطا — مطابخ صوفيا/فارنا",
        productLabelEn: "Onions + potatoes — Sofia/Varna kitchens",
        unit: "كغ", predictedDemand: 1400, confidence: 0.69,
        periodStart: dayOffset(7), periodEnd: dayOffset(14),
        signal: "محدودية المورد المحلي في بلغاريا — مقترح تصدير دفعة من حقول لوران المكشوفة.",
        status: "DRAFT",
      },
      {
        sourceCompanyId: agri.id, targetCompanyId: hospitality.id,
        category: "PRODUCE",
        productLabel: "خس + أعشاب — قائمة الصيف",
        productLabelEn: "Lettuce + herbs — summer menu",
        unit: "كغ", predictedDemand: 340, confidence: 0.82,
        periodStart: dayOffset(4), periodEnd: dayOffset(11),
        signal: "إطلاق قائمة صيفية جديدة في أرينا عمّان — يتوقع الطلب على السلطات +28%.",
        status: "DRAFT",
      },
    ];

    let inserted = 0;
    for (const s of seeds) {
      try {
        await prisma.supplyForecast.create({
          data: { ...s, generatedById: admin?.id ?? null },
        });
        inserted++;
      } catch (e) {
        // One bad row (FK miss) shouldn't kill the rest.
        console.error("[ensure-supply-forecasts] skipped one row:", (e as Error).message);
      }
    }
    console.log(`[ensure-supply-forecasts] ✓ inserted ${inserted} forecasts.`);
  } catch (e) {
    console.error("[ensure-supply-forecasts] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-supply-forecasts] fatal:", e);
    process.exit(0); // never block deploy
  });
