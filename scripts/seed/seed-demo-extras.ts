// scripts/seed-demo-extras.ts
//
// Idempotent extension of the demo seed for pitch readiness. Adds the
// data that prisma/seed-demo.ts skipped because Phase F1-F8 didn't need
// it but the dashboard / insights / activity pages do. Safe to re-run.
//
//   npx tsx scripts/seed-demo-extras.ts
//
// Adds, per tenant:
//   - Transactions (REVENUE / EXPENSE / COGS spread over 12 months) so
//     the dashboard's revenue/expense/net KPI tiles are non-zero.
//   - Programs for Tank Incubator (6 realistic Jordanian startups).
//   - BrainInsights (LOW_STOCK / REORDER_RECOMMENDATION / STALE_PRODUCT)
//     against real seeded products so the /admin/brain + /insights
//     pages have content.
//   - ActivityLog entries so the audit trail is non-empty.
//   - Extra Bookings to fill the 60-day occupancy chart for the
//     Hourani Hotels workspace.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic PRNG — same trick as prisma/seed.ts so the demo extras
// are reproducible (trustworthy) instead of jittering on every reseed.
const _realRandom = Math.random;
let _a = 0x4ec0_5678;
Math.random = function () {
  _a |= 0; _a = (_a + 0x6D2B79F5) | 0;
  let t = _a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function did(...parts: (string | number)[]) {
  return `demo-extras-${parts.join("-")}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

async function main() {
  console.log("• Seeding demo extras …\n");

  // ===== Companies look-up =====
  const companies = await prisma.company.findMany({
    select: { id: true, code: true },
  });
  const byCode = new Map(companies.map((c) => [c.code, c.id]));

  // ===== Transactions — 9 per company × 4 = 36, spread over 12 months =====
  // Categories per sector so the finance pages tell a coherent story.
  // reference is unique; deterministic so re-runs upsert in place.
  const TX_PER_COMPANY: Record<
    string,
    Array<{ kind: "REVENUE" | "EXPENSE" | "COGS"; cat: string; amt: number; daysAgo: number; desc: string }>
  > = {
    HOTELS: [
      { kind: "REVENUE", cat: "ROOM_REVENUE", amt: 142_500, daysAgo: 12, desc: "إيرادات الغرف — ديسمبر" },
      { kind: "REVENUE", cat: "ROOM_REVENUE", amt: 168_400, daysAgo: 42, desc: "إيرادات الغرف — نوفمبر" },
      { kind: "REVENUE", cat: "F&B", amt: 38_200, daysAgo: 18, desc: "مأكولات ومشروبات" },
      { kind: "EXPENSE", cat: "PAYROLL", amt: 64_000, daysAgo: 30, desc: "رواتب نوفمبر" },
      { kind: "EXPENSE", cat: "UTILITIES", amt: 18_400, daysAgo: 22, desc: "كهرباء وماء" },
      { kind: "EXPENSE", cat: "MAINTENANCE", amt: 9_200, daysAgo: 14, desc: "صيانة العقبة" },
      { kind: "COGS", cat: "INVENTORY", amt: 22_600, daysAgo: 25, desc: "مستلزمات الغرف" },
      { kind: "REVENUE", cat: "ROOM_REVENUE", amt: 155_800, daysAgo: 72, desc: "إيرادات الغرف — أكتوبر" },
      { kind: "EXPENSE", cat: "PAYROLL", amt: 62_500, daysAgo: 60, desc: "رواتب أكتوبر" },
    ],
    MAHA: [
      { kind: "REVENUE", cat: "RETAIL_SALES", amt: 84_300, daysAgo: 11, desc: "بيع للسوبرماركت" },
      { kind: "REVENUE", cat: "RETAIL_SALES", amt: 78_900, daysAgo: 40, desc: "بيع للسوبرماركت" },
      { kind: "REVENUE", cat: "B2B", amt: 22_400, daysAgo: 20, desc: "بيع للفنادق" },
      { kind: "EXPENSE", cat: "PAYROLL", amt: 28_000, daysAgo: 30, desc: "رواتب الإنتاج" },
      { kind: "EXPENSE", cat: "RAW_MATERIALS", amt: 41_200, daysAgo: 18, desc: "حليب خام" },
      { kind: "EXPENSE", cat: "PACKAGING", amt: 12_800, daysAgo: 24, desc: "عبوات تترا باك" },
      { kind: "COGS", cat: "INVENTORY", amt: 36_500, daysAgo: 28, desc: "تكلفة البضاعة المباعة" },
      { kind: "REVENUE", cat: "RETAIL_SALES", amt: 71_600, daysAgo: 70, desc: "بيع للسوبرماركت — أكتوبر" },
      { kind: "EXPENSE", cat: "LOGISTICS", amt: 8_400, daysAgo: 16, desc: "نقل مبرّد" },
    ],
    LORAN: [
      { kind: "REVENUE", cat: "PRODUCE_SALES", amt: 38_400, daysAgo: 10, desc: "خضار للمطاعم" },
      { kind: "REVENUE", cat: "OLIVE_OIL", amt: 24_800, daysAgo: 35, desc: "زيت زيتون موسم" },
      { kind: "REVENUE", cat: "DATES", amt: 16_200, daysAgo: 50, desc: "تمر مجدول" },
      { kind: "EXPENSE", cat: "PAYROLL", amt: 14_500, daysAgo: 30, desc: "رواتب المزارع" },
      { kind: "EXPENSE", cat: "FERTILIZER", amt: 9_800, daysAgo: 22, desc: "أسمدة" },
      { kind: "EXPENSE", cat: "IRRIGATION", amt: 6_400, daysAgo: 16, desc: "ري" },
      { kind: "COGS", cat: "INVENTORY", amt: 19_300, daysAgo: 26, desc: "تكلفة المحصول" },
      { kind: "REVENUE", cat: "PRODUCE_SALES", amt: 33_900, daysAgo: 65, desc: "خضار — أكتوبر" },
      { kind: "EXPENSE", cat: "SEEDS", amt: 5_200, daysAgo: 8, desc: "بذور جديدة" },
    ],
    TANK: [
      { kind: "REVENUE", cat: "TUITION", amt: 48_000, daysAgo: 12, desc: "رسوم الحاضنة" },
      { kind: "REVENUE", cat: "GRANTS", amt: 75_000, daysAgo: 32, desc: "منحة بحثية" },
      { kind: "REVENUE", cat: "EQUITY", amt: 32_000, daysAgo: 55, desc: "حقوق ملكية في خريج" },
      { kind: "EXPENSE", cat: "PAYROLL", amt: 16_000, daysAgo: 30, desc: "رواتب المرشدين" },
      { kind: "EXPENSE", cat: "FACILITIES", amt: 7_600, daysAgo: 24, desc: "إيجار المساحة" },
      { kind: "EXPENSE", cat: "EVENTS", amt: 4_300, daysAgo: 14, desc: "يوم الخريجين" },
      { kind: "COGS", cat: "PROGRAMS", amt: 8_800, daysAgo: 28, desc: "كلفة البرامج" },
      { kind: "REVENUE", cat: "TUITION", amt: 42_500, daysAgo: 70, desc: "رسوم — أكتوبر" },
      { kind: "EXPENSE", cat: "MENTORS", amt: 12_200, daysAgo: 20, desc: "أتعاب مرشدين" },
    ],
  };

  let txCount = 0;
  for (const [code, txs] of Object.entries(TX_PER_COMPANY)) {
    const cid = byCode.get(code);
    if (!cid) continue;
    let idx = 0;
    for (const t of txs) {
      idx++;
      const ref = `DEMO-TX-${code}-${idx}`;
      await prisma.transaction.upsert({
        where: { reference: ref },
        create: {
          companyId: cid,
          reference: ref,
          kind: t.kind,
          category: t.cat,
          amount: t.amt,
          currency: "JOD",
          description: t.desc,
          occurredAt: daysAgo(t.daysAgo),
        },
        update: { amount: t.amt, occurredAt: daysAgo(t.daysAgo), category: t.cat, description: t.desc, kind: t.kind },
      });
      txCount++;
    }
  }

  // ===== Programs — Tank Incubator (6 startups) =====
  const tankCid = byCode.get("TANK");
  const PROGRAMS = [
    { id: did("prog", "agribot"),    name: "AgriBot Jordan",     vertical: "AGRITECH",  stage: "ACCELERATING", funding: 145_000, team: 6 },
    { id: did("prog", "levantpay"),  name: "LevantPay",           vertical: "FINTECH",   stage: "GRADUATED",    funding: 680_000, team: 14 },
    { id: did("prog", "deadsealogics"), name: "DeadSeaLogics",    vertical: "LOGISTICS", stage: "ACCELERATING", funding: 220_000, team: 8 },
    { id: did("prog", "shamsi"),     name: "Shamsi Solar",        vertical: "CLEANTECH", stage: "INTAKE",       funding: 0,       team: 3 },
    { id: did("prog", "halal-ai"),   name: "Halal-AI Compliance", vertical: "SAAS",      stage: "ACCELERATING", funding: 95_000,  team: 5 },
    { id: did("prog", "petra-bio"),  name: "Petra Bio",           vertical: "BIOTECH",   stage: "GRADUATED",    funding: 540_000, team: 11 },
  ];
  let progCount = 0;
  if (tankCid) {
    for (const p of PROGRAMS) {
      await prisma.program.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          companyId: tankCid,
          name: p.name,
          nameEn: p.name,
          founder: ["خالد العمري","ليلى الحوراني","أحمد طراونة","Sara Hassan","عمر الكيلاني","Linda Marshall"][Math.floor(Math.random()*6)],
          vertical: p.vertical,
          stage: p.stage,
          cohort: "2026",
          fundingJod: p.funding,
          teamSize: p.team,
          description: `${p.name} — برنامج حاضنة The Tank في AAU`,
        },
        update: {
          companyId: tankCid,
          name: p.name,
          vertical: p.vertical,
          stage: p.stage,
          fundingJod: p.funding,
          teamSize: p.team,
        },
      });
      progCount++;
    }
  }

  // ===== Brain Insights — populate per tenant from real seeded data =====
  // Composite unique key is (tenantId, type, productId) — re-runs upsert.
  type BIn = { tenantSlug: string; type: string; severity: string; title: string; body: string; sku?: string };
  const INSIGHTS: BIn[] = [
    // Maha Dairy
    { tenantSlug: "maha-dairy", type: "LOW_STOCK",            severity: "WARNING",  title: "مخزون منخفض — جميد عجلون",       body: "جميد عجلون 1كغ تحت نقطة إعادة الطلب. يُنصح بطلب جديد.",      sku: "DAIRY-005" },
    { tenantSlug: "maha-dairy", type: "REORDER_RECOMMENDATION", severity: "INFO",   title: "إعادة طلب — قشطة المها",          body: "قشطة المها 200غ ستنفد خلال 6 أيام بمعدل البيع الحالي.",       sku: "DAIRY-006" },
    { tenantSlug: "maha-dairy", type: "STALE_PRODUCT",         severity: "INFO",    title: "حركة بطيئة — حلوم 250غ",           body: "جبنة حلوم لم تتحرك منذ ١٢ يوماً. اعتبر عرضاً ترويجياً.",       sku: "DAIRY-003" },
    // Hourani Hotels
    { tenantSlug: "hourani-hotels", type: "LOW_STOCK",            severity: "CRITICAL", title: "نفاذ وشيك — منظف غرف",        body: "منظف غرف صناعي 5ل أقل من ٦٠ وحدة. غرف العقبة تستهلك ٢٥/يوم.", sku: "HOTEL-006" },
    { tenantSlug: "hourani-hotels", type: "REORDER_RECOMMENDATION", severity: "WARNING", title: "إعادة طلب — ملاءات سرير",     body: "ملاءات قطن مصري — نقطة إعادة الطلب اقتربت في مستودع العقبة.",   sku: "HOTEL-004" },
    { tenantSlug: "hourani-hotels", type: "STALE_PRODUCT",         severity: "INFO",    title: "حركة بطيئة — قهوة عربية",       body: "قهوة عربية 250غ تحرّكت ٣٠٪ أقل من المتوقع هذا الشهر.",       sku: "HOTEL-005" },
    // Loran Agri
    { tenantSlug: "loran-agri", type: "LOW_STOCK",            severity: "WARNING",  title: "مخزون منخفض — تمر مجدول",          body: "تمر مجدول 1كغ — أقل من ٨٠ وحدة. الموسم القادم بعد ٤ أسابيع.",  sku: "AGRI-004" },
    { tenantSlug: "loran-agri", type: "REORDER_RECOMMENDATION", severity: "INFO",  title: "إعادة طلب — زيت زيتون",            body: "زيت زيتون لوران 1ل — معدل الاستهلاك يشير إلى نفاذ في ١٠ أيام.", sku: "AGRI-003" },
    { tenantSlug: "loran-agri", type: "STALE_PRODUCT",         severity: "INFO",    title: "حركة بطيئة — بطاطا أردنية",        body: "بطاطا أردنية تحركت ١٥٪ أقل عن المعدل. تحقق من المنافسة.",     sku: "AGRI-006" },
    // Tank Incubator
    { tenantSlug: "tank-incubator", type: "LOW_STOCK",            severity: "INFO",  title: "مخزون منخفض — حقائب طلاب",       body: "حقيبة طالب الحاضنة — أقل من ٥٠ وحدة قبل ورشة العمل القادمة.", sku: "EDU-002" },
    { tenantSlug: "tank-incubator", type: "REORDER_RECOMMENDATION", severity: "INFO", title: "إعادة طلب — كتب ريادة الأعمال", body: "نقطة إعادة الطلب اقتربت — ٣٢٠ وحدة، يكفي لكوهورت واحدة.",     sku: "EDU-001" },
  ];

  let insightCount = 0;
  for (const ins of INSIGHTS) {
    let productId: string | null = null;
    if (ins.sku) {
      const p = await prisma.product.findFirst({
        where: { tenantId: ins.tenantSlug, sku: ins.sku, deletedAt: null },
        select: { id: true },
      });
      productId = p?.id ?? null;
    }
    // Build the upsert where — the unique key requires productId (null
    // is treated as distinct in Postgres; for the unique to behave, we
    // use a deterministic id fallback for nullable cases).
    const stableId = did("ins", ins.tenantSlug, ins.type, ins.sku ?? "global");
    await prisma.brainInsight.upsert({
      where: { id: stableId },
      create: {
        id: stableId,
        tenantId: ins.tenantSlug,
        type: ins.type,
        severity: ins.severity,
        title: ins.title,
        body: ins.body,
        productId,
        metadata: JSON.stringify({ source: "seed-demo-extras" }),
      },
      update: {
        tenantId: ins.tenantSlug,
        type: ins.type,
        severity: ins.severity,
        title: ins.title,
        body: ins.body,
        productId,
      },
    });
    insightCount++;
  }

  // ===== Activity log — recent entries across modules =====
  const ACT: Array<{ action: string; entity: string; summary: string; summaryEn: string; module: string; daysAgo: number; hoursAgo: number; actorName: string }> = [
    { action: "LOGIN",  entity: "AUTH",        summary: "تسجيل دخول: مدير ألبان المها",     summaryEn: "Login: Maha Dairy Manager",   module: "AUTH",        daysAgo: 0, hoursAgo: 2, actorName: "مدير ألبان المها" },
    { action: "CREATE", entity: "SALES_ORDER", summary: "أمر بيع جديد لكارفور — DAIRY-001", summaryEn: "New SO for Carrefour — DAIRY-001", module: "DAIRY", daysAgo: 0, hoursAgo: 4, actorName: "مدير ألبان المها" },
    { action: "CREATE", entity: "BOOKING",     summary: "حجز جديد — عمّان (3 ليالٍ)",        summaryEn: "New booking — Amman (3 nights)", module: "HOSPITALITY", daysAgo: 0, hoursAgo: 7, actorName: "مدير فنادق الحوراني" },
    { action: "UPDATE", entity: "PRODUCT",     summary: "تحديث نقطة إعادة الطلب — HOTEL-006", summaryEn: "Reorder point updated — HOTEL-006", module: "INVENTORY", daysAgo: 1, hoursAgo: 3, actorName: "مدير فنادق الحوراني" },
    { action: "LOGIN",  entity: "AUTH",        summary: "تسجيل دخول: مدير لوران للزراعة",   summaryEn: "Login: Loran Agri Manager",   module: "AUTH",        daysAgo: 1, hoursAgo: 5, actorName: "مدير لوران للزراعة" },
    { action: "CREATE", entity: "PURCHASE_ORDER", summary: "أمر شراء — أسمدة من أجري برو",   summaryEn: "PO — fertilizer from AgriPro", module: "AGRICULTURE", daysAgo: 1, hoursAgo: 8, actorName: "مدير لوران للزراعة" },
    { action: "INSIGHT", entity: "BRAIN",      summary: "رؤية جديدة: مخزون منخفض — جميد",   summaryEn: "New insight: low stock — Jameed", module: "BRAIN", daysAgo: 1, hoursAgo: 12, actorName: "Brain Engine" },
    { action: "EXPORT", entity: "REPORT",      summary: "تصدير: تقرير المالية الشهري",       summaryEn: "Export: monthly finance report", module: "FINANCE", daysAgo: 2, hoursAgo: 4, actorName: "admin@hourani.jo" },
    { action: "CREATE", entity: "PROGRAM",     summary: "برنامج جديد: Shamsi Solar",         summaryEn: "New program: Shamsi Solar", module: "EDUCATION", daysAgo: 2, hoursAgo: 9, actorName: "مدير حاضنة The Tank" },
    { action: "UPDATE", entity: "SALES_ORDER", summary: "تحديث حالة SO — تم التنفيذ",        summaryEn: "SO status updated — FULFILLED", module: "DAIRY", daysAgo: 3, hoursAgo: 6, actorName: "مدير ألبان المها" },
    { action: "FORECAST", entity: "FORECAST",  summary: "توقع طلب: أنبأ الذكاء بزيادة 18٪", summaryEn: "Demand forecast: AI predicts +18%", module: "BRAIN", daysAgo: 3, hoursAgo: 14, actorName: "Brain Engine" },
    { action: "DELETE", entity: "PRODUCT",     summary: "أرشفة منتج راكد — EDU-004",         summaryEn: "Archived stale product — EDU-004", module: "INVENTORY", daysAgo: 4, hoursAgo: 5, actorName: "مدير حاضنة The Tank" },
    { action: "LOGIN",  entity: "AUTH",        summary: "تسجيل دخول: المسؤول",                summaryEn: "Login: admin@hourani.jo", module: "AUTH", daysAgo: 4, hoursAgo: 10, actorName: "admin@hourani.jo" },
    { action: "INSIGHT", entity: "BRAIN",      summary: "اقتراح إعادة طلب: HOTEL-004",       summaryEn: "Reorder recommendation: HOTEL-004", module: "BRAIN", daysAgo: 5, hoursAgo: 3, actorName: "Brain Engine" },
    { action: "CREATE", entity: "TRANSACTION", summary: "معاملة جديدة: إيراد ٨٤٬٣٠٠ د.أ",   summaryEn: "New transaction: revenue 84,300 JOD", module: "FINANCE", daysAgo: 5, hoursAgo: 11, actorName: "admin@hourani.jo" },
    { action: "CREATE", entity: "BOOKING",     summary: "حجز جماعي — وفد سياحي للعقبة",     summaryEn: "Group booking — Aqaba tour", module: "HOSPITALITY", daysAgo: 6, hoursAgo: 9, actorName: "مدير فنادق الحوراني" },
    { action: "UPDATE", entity: "DAIRY_BATCH", summary: "دفعة حليب — جودة A",                 summaryEn: "Dairy batch — grade A", module: "DAIRY", daysAgo: 6, hoursAgo: 15, actorName: "مدير ألبان المها" },
    { action: "LOGIN",  entity: "AUTH",        summary: "تسجيل دخول: مدير حاضنة The Tank", summaryEn: "Login: Tank Manager", module: "AUTH", daysAgo: 7, hoursAgo: 4, actorName: "مدير حاضنة The Tank" },
    { action: "CREATE", entity: "JOURNAL_ENTRY", summary: "قيد محاسبي — استلام بضاعة",       summaryEn: "JE — goods received", module: "FINANCE", daysAgo: 8, hoursAgo: 6, actorName: "Brain Engine" },
    { action: "FORECAST", entity: "FORECAST",  summary: "توقع موسم زيتون — لوران",           summaryEn: "Olive harvest forecast — Loran", module: "AGRICULTURE", daysAgo: 9, hoursAgo: 12, actorName: "Brain Engine" },
  ];

  let actCount = 0;
  for (let i = 0; i < ACT.length; i++) {
    const a = ACT[i];
    const id = did("act", i);
    const ts = new Date(Date.now() - (a.daysAgo * 24 + a.hoursAgo) * 60 * 60 * 1000);
    await prisma.activityLog.upsert({
      where: { id },
      create: {
        id,
        action: a.action,
        entity: a.entity,
        summary: a.summary,
        summaryEn: a.summaryEn,
        actorName: a.actorName,
        module: a.module,
        createdAt: ts,
      },
      update: {
        action: a.action,
        entity: a.entity,
        summary: a.summary,
        summaryEn: a.summaryEn,
        actorName: a.actorName,
        module: a.module,
        createdAt: ts,
      },
    });
    actCount++;
  }

  // ===== Extra Bookings — spread 30 across the last 45 days to fill the chart =====
  const hotels = await prisma.hotel.findMany({ select: { id: true, baselineADR: true } });
  const ROOM_TYPES = ["STANDARD", "DELUXE", "SUITE", "OCEAN_VIEW", "SPA_SUITE", "FAMILY"];
  const NAMES = ["Khaled Hourani","Sara Al-Tarawneh","Lina Saifi","Omar Kilani","Maria Garcia","Yusuf Mahmoud","Linda Marshall","Hassan El-Karim","Aisha Nasser","Rabia Al-Mansour","Ibrahim Sweidan","Layla Najjar"];
  let bookCount = 0;
  for (let i = 0; i < 30; i++) {
    const h = hotels[i % hotels.length];
    if (!h) break;
    const checkInDaysAgo = Math.floor(Math.random() * 45);
    const nights = 1 + Math.floor(Math.random() * 5);
    const rooms = 1 + Math.floor(Math.random() * 3);
    const nightly = (h.baselineADR ?? 120) * (0.85 + Math.random() * 0.6);
    const room = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
    const status = checkInDaysAgo > nights ? "COMPLETED" : checkInDaysAgo > 0 ? "CHECKED_IN" : "CONFIRMED";
    const reference = `DEMO-EXTRA-${i.toString().padStart(3, "0")}`;
    const checkIn = daysAgo(checkInDaysAgo);
    const checkOut = daysFromNow(-checkInDaysAgo + nights);
    await prisma.booking.upsert({
      where: { reference },
      create: {
        hotelId: h.id,
        tenantId: "hourani-hotels",
        reference,
        guestName: NAMES[i % NAMES.length],
        roomType: room,
        rooms,
        guests: rooms * 2,
        checkIn,
        checkOut,
        revenue: Math.round(nightly * rooms * nights),
        status,
      },
      update: {
        hotelId: h.id,
        tenantId: "hourani-hotels",
        roomType: room,
        rooms,
        guests: rooms * 2,
        checkIn,
        checkOut,
        revenue: Math.round(nightly * rooms * nights),
        status,
      },
    });
    bookCount++;
  }

  // ===== Counts =====
  const counts = {
    transactions: await prisma.transaction.count(),
    programs: await prisma.program.count(),
    brainInsights: await prisma.brainInsight.count(),
    activityLogs: await prisma.activityLog.count(),
    bookings: await prisma.booking.count(),
  };

  console.log("\nDone. Counts after seed-demo-extras:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log(`\nWrote: tx=${txCount}, programs=${progCount}, insights=${insightCount}, activity=${actCount}, bookings(+)=${bookCount}`);

  await prisma.$disconnect();
  Math.random = _realRandom;
}

main().catch((e) => { console.error("SEED FAILED:", e); process.exit(1); });
