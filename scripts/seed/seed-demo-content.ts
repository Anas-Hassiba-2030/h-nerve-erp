// scripts/seed/seed-demo-content.ts
//
// Rich demo content seed — fills the "intelligence layer" tables that make
// the system look alive and impressive during demos:
//   • 100+ activity log entries (audit trail over 30 days)
//   • 200+ bookings (60-day hotel occupancy curve)
//   • Council sessions + voice transcripts (AI agent debates)
//   • Action plans + steps (AI planner output)
//   • Tasks + achievements + user unlocks
//   • Documents (contracts, invoices, reports — 20+ files)
//
// Idempotent: every write upserts on a stable id.
// Run after seed-if-empty.ts (needs hotels + users to exist).
//
//   npx tsx scripts/seed/seed-demo-content.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sid(...parts: (string | number)[]): string {
  return `demo-content-${parts.join("-")}`;
}
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}
function daysAgo(n: number): Date {
  return hoursAgo(n * 24);
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

async function main() {
  console.log("● Demo Content Seed starting …\n");

  // ── lookups ───────────────────────────────────────────────────────────
  const hotels  = await prisma.hotel.findMany({ select: { id: true, name: true, baselineADR: true } });
  const users   = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });

  const adminUser = users.find(u => u.role === "ADMIN") ?? users[0];
  const adminId   = adminUser?.id ?? null;

  if (hotels.length === 0) {
    console.log("  ⚠  No hotels found — run seed-if-empty.ts first. Skipping bookings.");
  }

  // ════════════════════════════════════════════════════════════════════════
  // 1. ACTIVITY LOG  — 120 entries over 30 days
  // ════════════════════════════════════════════════════════════════════════
  const ACTORS = [
    "أنس حسيبة",
    "مدير فنادق الحوراني",
    "مدير ألبان المها",
    "مدير لوران للزراعة",
    "مدير حاضنة The Tank",
    "محاسب المجموعة",
    "Brain Engine",
    "admin@hourani.jo",
  ];

  type ActEntry = { action: string; entity: string; summary: string; summaryEn: string; module: string; actor: string; h: number };
  const ACTS: ActEntry[] = [
    // Day 0
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: أنس حسيبة",              summaryEn:"Login: Anas Hassiba",                      module:"AUTH",        actor:ACTORS[0], h:1  },
    { action:"CREATE",  entity:"PURCHASE_ORDER", summary:"أمر شراء جديد — PO-HTL-006",          summaryEn:"New PO — PO-HTL-006",                      module:"INVENTORY",   actor:ACTORS[1], h:2  },
    { action:"INSIGHT", entity:"BRAIN",          summary:"رؤية جديدة: طلب الحليب ارتفع 28%",   summaryEn:"New insight: milk demand +28%",             module:"BRAIN",       actor:ACTORS[6], h:3  },
    { action:"UPDATE",  entity:"SALES_ORDER",    summary:"تأكيد SO-MHA-004 — زبادي وسلطة",      summaryEn:"Confirmed SO-MHA-004 — yogurt",            module:"DAIRY",       actor:ACTORS[2], h:4  },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز جديد — عمّان دلوكس (4 ليالٍ)",   summaryEn:"New booking — Amman Deluxe (4 nights)",   module:"HOSPITALITY", actor:ACTORS[1], h:5  },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: تقرير الإيرادات الشهري",       summaryEn:"Export: monthly revenue report",            module:"FINANCE",     actor:ACTORS[5], h:6  },
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: مدير ألبان المها",        summaryEn:"Login: Maha Dairy Manager",                module:"AUTH",        actor:ACTORS[2], h:8  },
    { action:"CREATE",  entity:"JOURNAL_ENTRY",  summary:"قيد يومية — إيرادات يونيو",           summaryEn:"Journal entry — June revenue",             module:"FINANCE",     actor:ACTORS[5], h:9  },
    { action:"PLAN",    entity:"PLAN",           summary:"Brain أنشأ خطة: تحسين إشغال عقبة",   summaryEn:"Brain created plan: Aqaba occupancy lift", module:"BRAIN",       actor:ACTORS[6], h:10 },
    { action:"UPDATE",  entity:"PRODUCT",        summary:"تحديث نقطة الطلب — HTL-WATER-B",      summaryEn:"Reorder point updated — HTL-WATER-B",      module:"INVENTORY",   actor:ACTORS[1], h:11 },
    // Day 1
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: مدير لوران",              summaryEn:"Login: Loran Manager",                     module:"AUTH",        actor:ACTORS[3], h:25 },
    { action:"CREATE",  entity:"SALES_ORDER",    summary:"طلبية طماطم — أرينا المطابخ",         summaryEn:"Tomato SO — Arena kitchens",               module:"AGRICULTURE", actor:ACTORS[3], h:26 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"تحذير: دفعة جبن قريبة الانتهاء",      summaryEn:"Warning: cheese batch near expiry",        module:"BRAIN",       actor:ACTORS[6], h:27 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز رجال أعمال — الملكية الأردنية",   summaryEn:"Corporate booking — Royal Jordanian",      module:"HOSPITALITY", actor:ACTORS[1], h:28 },
    { action:"UPDATE",  entity:"DAIRY_BATCH",    summary:"دفعة حليب B-221 — اجتازت الجودة",    summaryEn:"Batch B-221 — passed quality check",       module:"DAIRY",       actor:ACTORS[2], h:30 },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: تقرير المخزون الأسبوعي",       summaryEn:"Export: weekly inventory report",          module:"INVENTORY",   actor:ACTORS[5], h:33 },
    { action:"FORECAST",entity:"FORECAST",       summary:"Brain: توقع طلب خيار الأسبوع القادم", summaryEn:"Brain: cucumber demand forecast next week", module:"AGRICULTURE", actor:ACTORS[6], h:36 },
    { action:"CREATE",  entity:"PURCHASE_ORDER", summary:"أمر شراء أعلاف — PO-MHA-004",        summaryEn:"Feed PO — PO-MHA-004",                     module:"DAIRY",       actor:ACTORS[2], h:40 },
    // Day 2-3
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: محاسب المجموعة",          summaryEn:"Login: Group Accountant",                  module:"AUTH",        actor:ACTORS[5], h:50 },
    { action:"CREATE",  entity:"JOURNAL_ENTRY",  summary:"قيد: استلام PO-HTL-004",              summaryEn:"JE: goods received PO-HTL-004",            module:"FINANCE",     actor:ACTORS[5], h:52 },
    { action:"UPDATE",  entity:"SALES_ORDER",    summary:"SO-LRN-001 — تم التنفيذ",             summaryEn:"SO-LRN-001 — FULFILLED",                   module:"AGRICULTURE", actor:ACTORS[3], h:55 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز جماعي — وفد الأمم المتحدة",       summaryEn:"Group booking — UN delegation",            module:"HOSPITALITY", actor:ACTORS[1], h:58 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"رؤية: إشغال عقبة 62% — أقل من المستهدف", summaryEn:"Insight: Aqaba occupancy 62% below target", module:"BRAIN",  actor:ACTORS[6], h:62 },
    { action:"UPDATE",  entity:"PRODUCT",        summary:"تحديث مخزون زيت الزيتون — IZR-A",    summaryEn:"Olive oil stock updated — IZR-A",          module:"INVENTORY",   actor:ACTORS[3], h:65 },
    { action:"PLAN",    entity:"PLAN",           summary:"Brain: خطة تقليل هدر منتجات الألبان", summaryEn:"Brain: dairy waste reduction plan",        module:"BRAIN",       actor:ACTORS[6], h:70 },
    { action:"CREATE",  entity:"SALES_ORDER",    summary:"SO-MHA-005 — كارفور + سيفوي",         summaryEn:"SO-MHA-005 — Carrefour + Safeway",         module:"DAIRY",       actor:ACTORS[2], h:73 },
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: مدير حاضنة The Tank",    summaryEn:"Login: Tank Incubator Manager",            module:"AUTH",        actor:ACTORS[4], h:78 },
    { action:"CREATE",  entity:"PROGRAM",        summary:"برنامج جديد: كوهورت الذكاء 2027",    summaryEn:"New program: AI Cohort 2027",              module:"EDUCATION",   actor:ACTORS[4], h:80 },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: ملخص مجلس الدماغ — يونيو",    summaryEn:"Export: Brain council summary — June",     module:"BRAIN",       actor:ACTORS[0], h:85 },
    // Day 4-7
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: أنس حسيبة",              summaryEn:"Login: Anas Hassiba",                      module:"AUTH",        actor:ACTORS[0], h:96  },
    { action:"UPDATE",  entity:"PURCHASE_ORDER", summary:"PO-HTL-005 — مُستلم",                 summaryEn:"PO-HTL-005 — RECEIVED",                    module:"INVENTORY",   actor:ACTORS[1], h:100 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"رؤية: أسعار الطماطم في ذروتها",       summaryEn:"Insight: tomato prices at seasonal peak",  module:"BRAIN",       actor:ACTORS[6], h:105 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز فردي — البحر الميت سبا",          summaryEn:"Individual booking — Dead Sea spa",         module:"HOSPITALITY", actor:ACTORS[1], h:110 },
    { action:"UPDATE",  entity:"DAIRY_BATCH",    summary:"دفعة جبن A440 — تم التوزيع",          summaryEn:"Batch A440 — distributed",                 module:"DAIRY",       actor:ACTORS[2], h:115 },
    { action:"CREATE",  entity:"JOURNAL_ENTRY",  summary:"قيد: تحصيل مدفوعات كارفور",          summaryEn:"JE: Carrefour payment collection",         module:"FINANCE",     actor:ACTORS[5], h:120 },
    { action:"FORECAST",entity:"FORECAST",       summary:"Brain: موسم الصيف يرفع الإشغال 22%",  summaryEn:"Brain: summer season +22% occupancy",     module:"HOSPITALITY", actor:ACTORS[6], h:125 },
    { action:"CREATE",  entity:"PURCHASE_ORDER", summary:"أمر شراء — تغليف جديد PO-MHA-005",   summaryEn:"New packaging PO — PO-MHA-005",            module:"DAIRY",       actor:ACTORS[2], h:130 },
    { action:"UPDATE",  entity:"SALES_ORDER",    summary:"SO-HTL-002 — تأكيد النسيج",           summaryEn:"SO-HTL-002 — textile confirmed",           module:"HOSPITALITY", actor:ACTORS[1], h:135 },
    // Day 8-14
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: أنس حسيبة",              summaryEn:"Login: Anas Hassiba",                      module:"AUTH",        actor:ACTORS[0], h:192 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"تحذير: دوران المياه المعبأة مرتفع",   summaryEn:"Warning: mineral water turnover rate high", module:"BRAIN",      actor:ACTORS[6], h:200 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز مؤتمر — البنوك الأردنية 3 أيام",  summaryEn:"Conference booking — JBG 3 days",          module:"HOSPITALITY", actor:ACTORS[1], h:205 },
    { action:"UPDATE",  entity:"PRODUCT",        summary:"مخزون منخفض: HTL-TOWEL-W",           summaryEn:"Low stock alert: HTL-TOWEL-W",             module:"INVENTORY",   actor:ACTORS[6], h:210 },
    { action:"CREATE",  entity:"SALES_ORDER",    summary:"SO-AGRI-004 — صادرات شركة الخير",     summaryEn:"SO-AGRI-004 — Khayr export order",        module:"AGRICULTURE", actor:ACTORS[3], h:215 },
    { action:"PLAN",    entity:"PLAN",           summary:"Brain: خطة أتمتة التوريد من لوران",   summaryEn:"Brain: auto-supply plan from Loran",      module:"BRAIN",       actor:ACTORS[6], h:220 },
    { action:"CREATE",  entity:"JOURNAL_ENTRY",  summary:"قيد: رواتب يونيو — كل الشركات",      summaryEn:"JE: June payroll — all companies",         module:"FINANCE",     actor:ACTORS[5], h:225 },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: تقرير الذمم المدينة",          summaryEn:"Export: accounts receivable report",       module:"FINANCE",     actor:ACTORS[5], h:230 },
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: مدير فنادق الحوراني",    summaryEn:"Login: Hotels Manager",                    module:"AUTH",        actor:ACTORS[1], h:240 },
    { action:"UPDATE",  entity:"BOOKING",        summary:"تحديث حجز US Embassy — تمديد ليلة",   summaryEn:"US Embassy booking extended 1 night",      module:"HOSPITALITY", actor:ACTORS[1], h:245 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"توصية: تفعيل باقة خاصة للبحر الميت",  summaryEn:"Recommendation: launch Dead Sea package",  module:"BRAIN",       actor:ACTORS[6], h:250 },
    // Day 15-21
    { action:"CREATE",  entity:"PURCHASE_ORDER", summary:"أمر شراء بذور — PO-LRN-004",         summaryEn:"Seeds PO — PO-LRN-004",                    module:"AGRICULTURE", actor:ACTORS[3], h:360 },
    { action:"UPDATE",  entity:"SALES_ORDER",    summary:"SO-MHA-003 — تسليم جزئي لأرينا",      summaryEn:"SO-MHA-003 — partial delivery to Arena",  module:"DAIRY",       actor:ACTORS[2], h:365 },
    { action:"FORECAST",entity:"FORECAST",       summary:"Brain: توقع إنتاج قمح الشهر القادم",  summaryEn:"Brain: wheat harvest forecast next month", module:"AGRICULTURE", actor:ACTORS[6], h:370 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز هاتفي — مجموعة عائلية 6 أفراد",  summaryEn:"Phone booking — family group 6 persons",   module:"HOSPITALITY", actor:ACTORS[1], h:375 },
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: محاسب المجموعة",          summaryEn:"Login: Group Accountant",                  module:"AUTH",        actor:ACTORS[5], h:380 },
    { action:"CREATE",  entity:"JOURNAL_ENTRY",  summary:"قيد: تسوية الذمم — مجموعة يونيو",    summaryEn:"JE: AR settlement — June batch",           module:"FINANCE",     actor:ACTORS[5], h:385 },
    { action:"UPDATE",  entity:"PRODUCT",        summary:"تحديث تكلفة الوحدة — MHA-MLK-F",     summaryEn:"Unit cost updated — MHA-MLK-F",            module:"INVENTORY",   actor:ACTORS[2], h:390 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"رؤية: هامش ألبان المها تحسّن 4.2%",   summaryEn:"Insight: Maha margin improved 4.2%",       module:"BRAIN",       actor:ACTORS[6], h:400 },
    { action:"PLAN",    entity:"PLAN",           summary:"Brain: خطة توسيع بيوت محمية لوران",  summaryEn:"Brain: Loran greenhouse expansion plan",   module:"BRAIN",       actor:ACTORS[6], h:410 },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: تقرير ربع السنة الثاني",        summaryEn:"Export: Q2 summary report",                module:"FINANCE",     actor:ACTORS[0], h:420 },
    // Day 22-30
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: أنس حسيبة",              summaryEn:"Login: Anas Hassiba",                      module:"AUTH",        actor:ACTORS[0], h:528 },
    { action:"UPDATE",  entity:"PURCHASE_ORDER", summary:"PO-MHA-003 — مُرسَل للمورّد",         summaryEn:"PO-MHA-003 — SENT to supplier",            module:"DAIRY",       actor:ACTORS[2], h:532 },
    { action:"CREATE",  entity:"BOOKING",        summary:"حجز عبر الإنترنت — عقبة شاليه بحري", summaryEn:"Online booking — Aqaba beach chalet",      module:"HOSPITALITY", actor:ACTORS[1], h:535 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"رؤية: قمح الأردن — أسعار تضغط الهامش",summaryEn:"Insight: Jordan wheat — prices squeeze margin",module:"BRAIN",    actor:ACTORS[6], h:540 },
    { action:"CREATE",  entity:"SALES_ORDER",    summary:"SO-LRN-004 — فلفل للسوق المركزي",    summaryEn:"SO-LRN-004 — peppers to central market",   module:"AGRICULTURE", actor:ACTORS[3], h:545 },
    { action:"UPDATE",  entity:"SALES_ORDER",    summary:"SO-AGRI-003 — مؤكد بالكامل",          summaryEn:"SO-AGRI-003 — fully confirmed",            module:"AGRICULTURE", actor:ACTORS[3], h:550 },
    { action:"FORECAST",entity:"FORECAST",       summary:"Brain: الموسم السياحي يرتفع يوليو",   summaryEn:"Brain: tourism season peaks July",         module:"HOSPITALITY", actor:ACTORS[6], h:555 },
    { action:"LOGIN",   entity:"AUTH",           summary:"تسجيل دخول: مدير ألبان المها",        summaryEn:"Login: Maha Dairy Manager",                module:"AUTH",        actor:ACTORS[2], h:560 },
    { action:"CREATE",  entity:"PURCHASE_ORDER", summary:"طلب طارئ — Chr. Hansen كائنات حية",   summaryEn:"Emergency PO — Chr. Hansen cultures",      module:"DAIRY",       actor:ACTORS[2], h:565 },
    { action:"EXPORT",  entity:"REPORT",         summary:"تصدير: تفريغ كامل للبيانات (backup)", summaryEn:"Export: full system dump (backup)",         module:"ADMIN",       actor:ACTORS[0], h:570 },
    { action:"INSIGHT", entity:"BRAIN",          summary:"IQ الدماغ ارتفع إلى 87 — أفضل قراءة", summaryEn:"Brain IQ rose to 87 — best reading",       module:"BRAIN",       actor:ACTORS[6], h:575 },
    { action:"PLAN",    entity:"PLAN",           summary:"Brain: خطة تحويل فندق العقبة ذكياً",  summaryEn:"Brain: Aqaba hotel smart conversion plan", module:"BRAIN",       actor:ACTORS[6], h:580 },
  ];

  let actCount = 0;
  for (let i = 0; i < ACTS.length; i++) {
    const a = ACTS[i];
    const id = sid("act", i);
    await prisma.activityLog.upsert({
      where: { id },
      create: { id, action: a.action, entity: a.entity, summary: a.summary, summaryEn: a.summaryEn,
        actorName: a.actor, module: a.module, actorId: adminId ?? undefined, createdAt: hoursAgo(a.h) },
      update: { action: a.action, entity: a.entity, summary: a.summary, summaryEn: a.summaryEn,
        actorName: a.actor, module: a.module, createdAt: hoursAgo(a.h) },
    });
    actCount++;
  }
  console.log(`  activity logs: ${actCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 2. BOOKINGS — 200 entries spread across 60 days
  // ════════════════════════════════════════════════════════════════════════
  const ROOM_TYPES = ["STANDARD","DELUXE","SUITE","OCEAN_VIEW","SPA_SUITE","FAMILY","JUNIOR_SUITE"];
  const GUEST_NAMES = [
    "Khaled Hourani","Sara Al-Tarawneh","Lina Saifi","Omar Kilani","Maria Garcia",
    "Yusuf Mahmoud","Linda Marshall","Hassan El-Karim","Aisha Nasser","Rabia Al-Mansour",
    "Ibrahim Sweidan","Layla Najjar","Ahmed Al-Rashid","Nour Mansour","Tariq Barakat",
    "Hana Khoury","Rami Saleh","Dina Hamdan","Ziad Farouk","Samar Issa",
    "John Mitchell","Elena Popescu","Ali Hassan","فاطمة الحوراني","كريم السيد",
  ];
  const CORP_NAMES = [
    "Royal Jordanian — Corporate","UN Amman Mission","US Embassy Staff",
    "Jordan Banks Group","Golden Tours Group","Deloitte Amman Team",
    "Abu Dhabi Investment Authority","Saudi Aramco Delegation","USAID Jordan",
  ];

  let bookCount = 0;
  if (hotels.length > 0) {
    for (let i = 0; i < 200; i++) {
      const h = hotels[i % hotels.length];
      const checkInDays  = Math.floor((i * 7.3) % 60);      // deterministic spread
      const nights       = 1 + (i % 6);
      const rooms        = 1 + (i % 4);
      const adr          = (h.baselineADR ?? 120) * (0.75 + ((i * 0.13) % 0.6));
      const roomType     = ROOM_TYPES[i % ROOM_TYPES.length];
      const isCorp       = i % 7 === 0;
      const guestName    = isCorp ? CORP_NAMES[i % CORP_NAMES.length] : GUEST_NAMES[i % GUEST_NAMES.length];
      const past         = checkInDays > nights;
      const current      = checkInDays <= nights && checkInDays >= 0;
      const status       = past ? "COMPLETED" : current ? "CHECKED_IN" : "CONFIRMED";
      const reference    = `DC-BKG-${String(i).padStart(4,"0")}`;
      const checkIn      = daysAgo(checkInDays);
      const checkOut     = daysAgo(checkInDays - nights);
      await prisma.booking.upsert({
        where: { reference },
        create: {
          hotelId: h.id, tenantId: "hourani-hotels", reference, guestName,
          roomType, rooms, guests: rooms * 2,
          checkIn, checkOut, revenue: Math.round(adr * rooms * nights), status,
        },
        update: { status, revenue: Math.round(adr * rooms * nights) },
      });
      bookCount++;
    }
  }
  console.log(`  bookings: ${bookCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 3. COUNCIL SESSIONS + VOICES
  //    Each session = a real AI-style multi-agent debate around a business
  //    question. Voices: HospitalityExpert, DairyExpert, AgriExpert,
  //    FinanceBrain, RiskOfficer, Moderator.
  // ════════════════════════════════════════════════════════════════════════
  const SESSIONS = [
    {
      id: sid("cs","aqaba-occ"),
      topic: "إشغال عقبة 62% — هل نُخفّض السعر أم نُركّز على تسويق B2B؟",
      recommendation: "ابدأ بحملة B2B موجّهة للشركات الكبرى قبل أي تخفيض، مع تجربة باقة نهاية الأسبوع للأسرة.",
      confidence: 0.81,
      status: "COMPLETED",
      ranAt: daysAgo(3),
      voices: [
        { agentId:"HospitalityExpert", ar:"خبير الضيافة", en:"Hospitality Expert", pos:"SUPPORT",    thesis:"إشغال 62% في الصيف رقم ضعيف لفندق عقبة. أنصح بباقة نهاية أسبوع مخفّضة لجذب السوق المحلي مع الحفاظ على التسعير التجاري." },
        { agentId:"FinanceBrain",      ar:"محلل المالية",  en:"Finance Analyst",    pos:"SUPPORT",    thesis:"تأثير تخفيض 10% على السعر يُنتج +18% في الإيرادات بشرط الوصول لـ 78% إشغال. الحساب مُجدٍ." },
        { agentId:"RiskOfficer",       ar:"مسؤول المخاطر", en:"Risk Officer",       pos:"DISSENT",    thesis:"تخفيض السعر الآن يُقلّص هامش الربح ويضع توقعات منخفضة لدى العملاء. أفضّل التركيز على قناة الشركات." },
        { agentId:"Moderator",         ar:"المُحكِّم",      en:"Moderator",          pos:"SYNTHESIS",  thesis:"التوافق على استراتيجية مزدوجة: حملة B2B للشركات هذا الشهر، مراجعة الأسعار في غياب النتائج خلال 30 يوماً." },
      ],
    },
    {
      id: sid("cs","dairy-waste"),
      topic: "هدر الألبان يرتفع — ما هي الأسباب الجذرية وخطة الإصلاح؟",
      recommendation: "تقليص دورة الإنتاج من 72 إلى 48 ساعة + تفعيل تنبيهات انتهاء الصلاحية على مستوى الدفعة.",
      confidence: 0.88,
      status: "COMPLETED",
      ranAt: daysAgo(7),
      voices: [
        { agentId:"DairyExpert",       ar:"خبير الألبان",  en:"Dairy Expert",       pos:"SUPPORT",    thesis:"السبب الرئيسي هو دورة الإنتاج الطويلة (72 ساعة) مقارنة بعمر الرف. التقليص إلى 48 ساعة يُنقص الهدر 34%." },
        { agentId:"FinanceBrain",      ar:"محلل المالية",  en:"Finance Analyst",    pos:"SUPPORT",    thesis:"الهدر الحالي يُكلّف 8,400 دينار شهرياً. الاستثمار في أنظمة التتبع الحراري يُسترد خلال 4 أشهر." },
        { agentId:"RiskOfficer",       ar:"مسؤول المخاطر", en:"Risk Officer",       pos:"NEUTRAL",    thesis:"تقليص دورة الإنتاج يزيد الضغط على الخطوط. يجب التأكد من القدرة التشغيلية قبل التطبيق." },
        { agentId:"Moderator",         ar:"المُحكِّم",      en:"Moderator",          pos:"SYNTHESIS",  thesis:"تفعيل تنبيهات الدفعة فوراً (صفر تكلفة)، اختبار دورة 48 ساعة على خط واحد أولاً." },
      ],
    },
    {
      id: sid("cs","loran-export"),
      topic: "هل توسّع لوران في التصدير المباشر أو تُركّز على توريد المجموعة الداخلي؟",
      recommendation: "أولويّة: توريد مطابخ أرينا بالكامل (ضمان إيراد)، ثم بناء قناة تصدير صغيرة عبر شركة الخير في موسم الطماطم.",
      confidence: 0.74,
      status: "COMPLETED",
      ranAt: daysAgo(12),
      voices: [
        { agentId:"AgriExpert",        ar:"خبير الزراعة",  en:"Agri Expert",        pos:"SUPPORT",    thesis:"موسم الطماطم في ذروته. شركة الخير تعرض 0.48 دينار/كغ للتصدير مقابل 0.55 للسوق المحلي. الفرق الحجمي يُعوّض." },
        { agentId:"FinanceBrain",      ar:"محلل المالية",  en:"Finance Analyst",    pos:"NEUTRAL",    thesis:"عقد التصدير يحمل شروط دفع Net 45 مع مخاطر عملة. التدفق النقدي من أرينا أفضل وأسرع." },
        { agentId:"HospitalityExpert", ar:"خبير الضيافة",  en:"Hospitality Expert", pos:"SUPPORT",    thesis:"مطابخ أرينا تحتاج 800 كغ طماطم يومياً في الصيف. الاستمرارية مع لوران تُخفّض تكلفتنا 12%." },
        { agentId:"RiskOfficer",       ar:"مسؤول المخاطر", en:"Risk Officer",       pos:"DISSENT",    thesis:"التصدير يعرّضنا لمخاطر اللوجستيك والجمارك. أنصح بالتركيز الداخلي حتى نبني قدرة أعلى." },
        { agentId:"Moderator",         ar:"المُحكِّم",      en:"Moderator",          pos:"SYNTHESIS",  thesis:"توريد أرينا غير قابل للتفاوض. تصدير تجريبي 20% من الفائض عبر الخير لاستطلاع القناة." },
      ],
    },
  ];

  let csCount = 0, voiceCount = 0;
  for (const s of SESSIONS) {
    await prisma.councilSession.upsert({
      where: { id: s.id },
      create: {
        id: s.id, topic: s.topic, recommendation: s.recommendation,
        confidence: s.confidence, status: s.status, ranAt: s.ranAt,
        durationMs: 8400, usedLiveLlm: false,
        contextRefs: JSON.stringify([]),
      },
      update: { recommendation: s.recommendation, status: s.status },
    });
    csCount++;

    for (let vi = 0; vi < s.voices.length; vi++) {
      const v = s.voices[vi];
      const vid = sid("voice", s.id.slice(-8), vi);
      await prisma.councilVoice.upsert({
        where: { id: vid },
        create: {
          id: vid, sessionId: s.id, agentId: v.agentId,
          speakerLabelAr: v.ar, speakerLabelEn: v.en,
          position: v.pos, thesis: v.thesis,
          evidenceJson: "[]", orderIndex: vi, isStub: true,
        },
        update: { thesis: v.thesis, position: v.pos },
      });
      voiceCount++;
    }
  }
  console.log(`  council sessions: ${csCount}, voices: ${voiceCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 4. PLANS + STEPS
  // ════════════════════════════════════════════════════════════════════════
  const PLANS = [
    {
      id: sid("plan","aqaba-occ"),
      goal: "رفع إشغال فندق العقبة من 62% إلى 78% بحلول نهاية أغسطس",
      goalEn: "Lift Aqaba hotel occupancy from 62% to 78% by end of August",
      rationale: "الإشغال الحالي أقل بـ 16 نقطة من المستهدف الصيفي، مما يُفقد الفندق ما يُقدّر بـ 38,000 دينار من الإيرادات الشهرية.",
      rationaleEn: "Current occupancy is 16pp below the summer target, costing an estimated 38,000 JOD/month in lost revenue.",
      targetMetric: "occupancy", targetDelta: 0.16, targetDeadline: daysFromNow(65),
      projectedDelta: 0.14, confidence: 0.81, status: "ACTIVE",
      steps: [
        { action: "أطلق حملة B2B للشركات الأردنية الكبرى (10 شركات مستهدفة)", actionEn: "Launch B2B campaign targeting top 10 Jordanian corporates", role: "MANAGER", days: 14 },
        { action: "صمّم باقة نهاية الأسبوع للعائلات بسعر مخفّض 15%", actionEn: "Design weekend family package at 15% discount", role: "MANAGER", days: 7 },
        { action: "اعقد اتفاقية تفضيلية مع وكالتين سياحيتين في عمّان", actionEn: "Sign preferential agreement with 2 Amman travel agencies", role: "EXECUTIVE", days: 21 },
        { action: "راجع نتائج الأسبوعين الأولين وعدّل التسعير إن لزم", actionEn: "Review first 2-week results and adjust pricing if needed", role: "EXECUTIVE", days: 30 },
      ],
    },
    {
      id: sid("plan","dairy-waste"),
      goal: "تقليص هدر منتجات الألبان بنسبة 30% خلال 45 يوماً",
      goalEn: "Reduce dairy product waste by 30% within 45 days",
      rationale: "الهدر الحالي يُكلّف 8,400 دينار شهرياً. تقليصه 30% يُنقّح الهامش ويُحسّن التدفق النقدي.",
      rationaleEn: "Current waste costs 8,400 JOD/month. A 30% reduction improves margin and cash flow.",
      targetMetric: "waste_pct", targetDelta: -0.30, targetDeadline: daysFromNow(45),
      projectedDelta: -0.28, confidence: 0.88, status: "ACTIVE",
      steps: [
        { action: "فعّل تنبيهات انتهاء الصلاحية على مستوى الدفعة في النظام", actionEn: "Enable batch-level expiry alerts in the system", role: "MANAGER", days: 3 },
        { action: "اختبر دورة إنتاج 48 ساعة على خط المها الأول",                actionEn: "Pilot 48-hour production cycle on Maha Line 1", role: "MANAGER", days: 14 },
        { action: "درّب فريق المستودع على بروتوكول FIFO الصارم",               actionEn: "Train warehouse team on strict FIFO protocol", role: "STAFF",   days: 7  },
        { action: "قيّم النتائج وقرّر التطبيق على كل الخطوط",                  actionEn: "Evaluate results and decide full rollout", role: "EXECUTIVE", days: 45 },
      ],
    },
    {
      id: sid("plan","loran-greenhouse"),
      goal: "توسيع البيوت المحمية للوران بنسبة 40% قبل موسم 2027",
      goalEn: "Expand Loran greenhouses by 40% before the 2027 season",
      rationale: "الطلب من مطابخ أرينا والأسواق المحلية يتجاوز الطاقة الإنتاجية الحالية في موسم الصيف.",
      rationaleEn: "Demand from Arena kitchens and local markets exceeds current production capacity in summer.",
      targetMetric: "production_volume", targetDelta: 0.40, targetDeadline: daysFromNow(180),
      projectedDelta: 0.38, confidence: 0.74, status: "DRAFT",
      steps: [
        { action: "وافق على ميزانية التوسيع — 420,000 دينار (المرحلة الثانية)", actionEn: "Approve expansion budget — 420,000 JOD (Phase 2)", role: "EXECUTIVE", days: 14 },
        { action: "اختر المورّد وابدأ تركيب الهيكل في إربد",                   actionEn: "Select contractor and start structure installation", role: "MANAGER", days: 60 },
        { action: "اشترِ بذور الطماطم والخيار الموسمية بالكميات الجديدة",       actionEn: "Purchase tomato & cucumber seeds for new capacity", role: "MANAGER", days: 120 },
        { action: "ابدأ الإنتاج التجريبي في البيوت الجديدة",                    actionEn: "Begin trial production in new greenhouses", role: "MANAGER", days: 180 },
      ],
    },
    {
      id: sid("plan","brain-iq"),
      goal: "رفع مؤشر ذكاء الدماغ (Brain IQ) إلى 90 من 87",
      goalEn: "Raise Brain IQ index from 87 to 90",
      rationale: "كل نقطة في IQ تعني دقة أعلى في التوقعات وتوصيات أفضل للفريق التنفيذي.",
      rationaleEn: "Each IQ point means higher forecast accuracy and better recommendations for the executive team.",
      targetMetric: "brain_iq", targetDelta: 3, targetDeadline: daysFromNow(90),
      projectedDelta: 3, confidence: 0.69, status: "ACTIVE",
      steps: [
        { action: "أضف وثائق المورّدين والعملاء لمخزن المعرفة (RAG)",           actionEn: "Add supplier & customer docs to knowledge store (RAG)", role: "STAFF", days: 14 },
        { action: "شغّل جلستي مجلس يومياً للأسبوعين القادمين",                 actionEn: "Run 2 council sessions daily for the next 2 weeks", role: "MANAGER", days: 14 },
        { action: "صحّح تحيّز التوقع في نماذج الضيافة بتغذية بيانات 2025",    actionEn: "Correct hospitality forecast bias with 2025 data", role: "MANAGER", days: 21 },
        { action: "افحص مؤشر IQ وارفع تقرير بالتحسينات",                       actionEn: "Review IQ index and report on improvements", role: "EXECUTIVE", days: 90 },
      ],
    },
  ];

  let planCount = 0, stepCount = 0;
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      create: {
        id: p.id, goal: p.goal, goalEn: p.goalEn, rationale: p.rationale, rationaleEn: p.rationaleEn,
        targetMetric: p.targetMetric, targetDelta: p.targetDelta, targetDeadline: p.targetDeadline,
        projectedDelta: p.projectedDelta, confidence: p.confidence, status: p.status,
        committedById: p.status === "ACTIVE" ? adminId ?? undefined : undefined,
        committedAt:   p.status === "ACTIVE" ? daysAgo(7) : undefined,
      },
      update: { status: p.status },
    });
    planCount++;

    for (let si = 0; si < p.steps.length; si++) {
      const st = p.steps[si];
      const stId = sid("step", p.id.slice(-8), si);
      const isDone = p.status === "ACTIVE" && si === 0; // first step done on active plans
      await prisma.planStep.upsert({
        where: { id: stId },
        create: {
          id: stId, planId: p.id, orderIndex: si,
          action: st.action, actionEn: st.actionEn,
          ownerRole: st.role, durationDays: st.days,
          status: isDone ? "DONE" : si === 1 && p.status === "ACTIVE" ? "IN_PROGRESS" : "PENDING",
        },
        update: { status: isDone ? "DONE" : si === 1 && p.status === "ACTIVE" ? "IN_PROGRESS" : "PENDING" },
      });
      stepCount++;
    }
  }
  console.log(`  plans: ${planCount}, steps: ${stepCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 5. TASKS + ACHIEVEMENTS
  // ════════════════════════════════════════════════════════════════════════
  const TASKS = [
    { id:sid("task",1),  title:"مراجعة خطة الإشغال — العقبة",         titleEn:"Review Aqaba occupancy plan",            kind:"CORE", status:"IN_PROGRESS", priority:"HIGH",   module:"HOSPITALITY", points:20, daysUntilDue:3 },
    { id:sid("task",2),  title:"إرسال PO-HTL-005 للمورّد",             titleEn:"Send PO-HTL-005 to supplier",            kind:"CORE", status:"DONE",        priority:"HIGH",   module:"INVENTORY",   points:15, daysUntilDue:-1 },
    { id:sid("task",3),  title:"تدقيق ميزانية الربع الثالث",           titleEn:"Audit Q3 budget",                        kind:"CORE", status:"TODO",        priority:"MEDIUM", module:"FINANCE",     points:25, daysUntilDue:14 },
    { id:sid("task",4),  title:"تحديث خريطة الموردين — لوران",         titleEn:"Update supplier map — Loran",            kind:"BRAIN",status:"TODO",        priority:"MEDIUM", module:"AGRICULTURE", points:10, daysUntilDue:7  },
    { id:sid("task",5),  title:"تفعيل تنبيهات الدفعة في مها",          titleEn:"Enable batch alerts in Maha",            kind:"BRAIN",status:"IN_PROGRESS", priority:"HIGH",   module:"DAIRY",       points:20, daysUntilDue:2  },
    { id:sid("task",6),  title:"مراجعة دقة توقعات Brain الأسبوع الماضي",titleEn:"Review Brain forecast accuracy last week",kind:"BRAIN",status:"DONE",     priority:"LOW",    module:"BRAIN",       points:10, daysUntilDue:-2 },
    { id:sid("task",7),  title:"إضافة وثيقة عقد Chr. Hansen للنظام",   titleEn:"Upload Chr. Hansen contract to system",  kind:"CORE", status:"TODO",        priority:"MEDIUM", module:"DAIRY",       points:15, daysUntilDue:5  },
    { id:sid("task",8),  title:"تدريب الفريق على FIFO — مستودع الزرقاء",titleEn:"Train warehouse team FIFO — Zarqa",     kind:"CORE", status:"TODO",        priority:"HIGH",   module:"INVENTORY",   points:20, daysUntilDue:10 },
    { id:sid("task",9),  title:"مراجعة توصية مجلس الدماغ — تصدير لوران",titleEn:"Review Brain council rec — Loran export",kind:"BRAIN",status:"IN_PROGRESS",priority:"MEDIUM",module:"BRAIN",      points:15, daysUntilDue:4  },
    { id:sid("task",10), title:"تجهيز عرض تقديمي لمستثمري الربع الثالث",titleEn:"Prepare Q3 investor presentation",      kind:"CORE", status:"TODO",        priority:"HIGH",   module:"FINANCE",     points:30, daysUntilDue:21 },
    { id:sid("task",11), title:"متابعة حجز مؤتمر المصارف — تأكيد الغرف",titleEn:"Follow up JBG conference booking",      kind:"CORE", status:"DONE",        priority:"MEDIUM", module:"HOSPITALITY", points:10, daysUntilDue:-3 },
    { id:sid("task",12), title:"تحديث بيانات عملاء لوران في النظام",     titleEn:"Update Loran customer data in system",   kind:"CORE", status:"TODO",        priority:"LOW",    module:"AGRICULTURE", points:8,  daysUntilDue:30 },
  ];

  let taskCount = 0;
  for (const t of TASKS) {
    const dueAt = daysFromNow(t.daysUntilDue);
    const completedAt = t.status === "DONE" ? daysAgo(Math.abs(t.daysUntilDue)) : undefined;
    await prisma.task.upsert({
      where: { id: t.id },
      create: {
        id: t.id, title: t.title, titleEn: t.titleEn, kind: t.kind,
        status: t.status, priority: t.priority, module: t.module,
        points: t.points, dueAt, completedAt: completedAt ?? null,
        assigneeId: adminId ?? null,
      },
      update: { status: t.status, completedAt: completedAt ?? null },
    });
    taskCount++;
  }
  console.log(`  tasks: ${taskCount} ready`);

  // Achievements
  const ACHIEVEMENTS = [
    { id:sid("ach","first-login"),    code:"FIRST_LOGIN",    name:"أول خطوة",        nameEn:"First Step",         description:"سجّلت دخولك لأول مرة",          tier:"BRONZE", icon:"Star",      threshold:1   },
    { id:sid("ach","first-booking"),  code:"FIRST_BOOKING",  name:"أول حجز",         nameEn:"First Booking",      description:"أنشأت أول حجز فندقي",           tier:"BRONZE", icon:"CalendarCheck",threshold:1 },
    { id:sid("ach","ten-tasks"),      code:"TEN_TASKS",      name:"منجز",            nameEn:"Task Crusher",       description:"أكملت 10 مهام",                 tier:"SILVER", icon:"CheckSquare",threshold:10  },
    { id:sid("ach","brain-believer"), code:"BRAIN_BELIEVER", name:"مؤمن بالذكاء",    nameEn:"Brain Believer",     description:"نفّذت 3 توصيات من Brain",        tier:"SILVER", icon:"Brain",     threshold:3   },
    { id:sid("ach","data-guardian"),  code:"DATA_GUARDIAN",  name:"حارس البيانات",   nameEn:"Data Guardian",      description:"راجعت 50 سجلاً في الأسبوع",     tier:"GOLD",   icon:"Shield",    threshold:50  },
    { id:sid("ach","first-export"),   code:"FIRST_EXPORT",   name:"تقرير المدير",     nameEn:"Report Master",      description:"صدّرت أول تقرير",               tier:"BRONZE", icon:"Download",  threshold:1   },
    { id:sid("ach","council-voter"),  code:"COUNCIL_VOTER",  name:"صوت المجلس",       nameEn:"Council Voice",      description:"شاركت في 5 جلسات مجلس",         tier:"SILVER", icon:"Users",     threshold:5   },
    { id:sid("ach","empire-builder"), code:"EMPIRE_BUILDER", name:"بانٍ للإمبراطورية",nameEn:"Empire Builder",     description:"أنشأت 3 مستأجرين",              tier:"GOLD",   icon:"Crown",     threshold:3   },
  ];

  let achCount = 0, uaCount = 0;
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: { id: a.id, code: a.code, name: a.name, nameEn: a.nameEn, description: a.description, tier: a.tier, icon: a.icon, threshold: a.threshold },
      update: { name: a.name, description: a.description, tier: a.tier },
    });
    achCount++;
  }

  // Unlock the first 4 achievements for the admin user
  if (adminId) {
    const unlockCodes = ["FIRST_LOGIN","FIRST_BOOKING","FIRST_EXPORT","BRAIN_BELIEVER"];
    for (const code of unlockCodes) {
      const ach = await prisma.achievement.findUnique({ where: { code } });
      if (!ach) continue;
      const uaId = sid("ua", adminId.slice(-4), code);
      await prisma.userAchievement.upsert({
        where: { id: uaId },
        create: { id: uaId, userId: adminId, achievementId: ach.id, earnedAt: daysAgo(14) },
        update: {},
      });
      uaCount++;
    }
  }
  console.log(`  achievements: ${achCount}, unlocked: ${uaCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 6. DOCUMENTS (invoices, contracts, reports — realistic file metadata)
  // ════════════════════════════════════════════════════════════════════════
  const DOCS = [
    { id:sid("doc",1),  kind:"invoice",   fileName:"INV-الكوثر-مناشف-2026-06.pdf",       title:"فاتورة مورّد — الكوثر للأقمشة الفندقية",  titleEn:"Supplier invoice — Kawthar Hotel Textiles",  status:"MATCHED", size:184320,  confidence:0.97, supplierName:"شركة الكوثر للأقمشة الفندقية" },
    { id:sid("doc",2),  kind:"invoice",   fileName:"INV-chr-hansen-2026-05.pdf",          title:"فاتورة Chr. Hansen — كائنات الجبن",        titleEn:"Chr. Hansen invoice — cheese cultures",      status:"MATCHED", size:221440,  confidence:0.94, supplierName:"Chr. Hansen الشرق الأوسط" },
    { id:sid("doc",3),  kind:"invoice",   fileName:"INV-بريدو-مواد-غذائية-0422.pdf",     title:"فاتورة مواد غذائية — بريدو",               titleEn:"Food supply invoice — Breedo",               status:"MATCHED", size:156000,  confidence:0.91, supplierName:"بريدو لتوريد المواد الغذائية" },
    { id:sid("doc",4),  kind:"contract",  fileName:"CTR-لوران-أرينا-توريد-2026.pdf",     title:"عقد توريد — لوران إلى أرينا الفنادق",      titleEn:"Supply contract — Loran to Arena Hotels",   status:"MATCHED", size:342000,  confidence:0.98, supplierName:"لوران للزراعة" },
    { id:sid("doc",5),  kind:"contract",  fileName:"CTR-الكوثر-3سنوات-2026.pdf",         title:"عقد إطاري — الكوثر 3 سنوات",               titleEn:"Framework contract — Kawthar 3 years",      status:"PARSING", size:298000,  confidence:null, supplierName:null },
    { id:sid("doc",6),  kind:"report",    fileName:"RPT-ربع2-2026-مجموعة-الحوراني.pdf",  title:"تقرير الربع الثاني — مجموعة الحوراني",     titleEn:"Q2 2026 report — Hourani Group",             status:"MATCHED", size:512000,  confidence:0.99, supplierName:null },
    { id:sid("doc",7),  kind:"report",    fileName:"RPT-brain-iq-2026-06.pdf",            title:"تقرير ذكاء الدماغ — يونيو 2026",           titleEn:"Brain IQ report — June 2026",               status:"MATCHED", size:128000,  confidence:0.99, supplierName:null },
    { id:sid("doc",8),  kind:"invoice",   fileName:"INV-مياه-رم-2026-23.pdf",             title:"فاتورة مياه رم — الأسبوع 23",              titleEn:"Rum Water invoice — Week 23",               status:"MATCHED", size:88000,   confidence:0.96, supplierName:"مياه رم المعبّأة" },
    { id:sid("doc",9),  kind:"contract",  fileName:"CTR-carrefour-مها-2026.pdf",          title:"عقد توريد — مها إلى كارفور الأردن",        titleEn:"Supply contract — Maha to Carrefour JO",    status:"MATCHED", size:380000,  confidence:0.97, supplierName:"كارفور الأردن" },
    { id:sid("doc",10), kind:"invoice",   fileName:"INV-نيتافيم-ري-لوران-0601.pdf",      title:"فاتورة أنظمة ري — نيتافيم الأردن",         titleEn:"Irrigation systems invoice — Netafim JO",   status:"REVIEW",  size:210000,  confidence:0.78, supplierName:"نيتافيم الأردن" },
    { id:sid("doc",11), kind:"report",    fileName:"RPT-occupancy-AQB-may-2026.pdf",      title:"تقرير إشغال العقبة — مايو 2026",           titleEn:"Aqaba occupancy report — May 2026",         status:"MATCHED", size:144000,  confidence:0.99, supplierName:null },
    { id:sid("doc",12), kind:"invoice",   fileName:"INV-أعلاف-وطنية-2026-05.pdf",        title:"فاتورة أعلاف — مزارع الأعلاف الوطنية",    titleEn:"Feed invoice — National Feed Farms",        status:"MATCHED", size:196000,  confidence:0.93, supplierName:"مزارع الأعلاف الوطنية" },
    { id:sid("doc",13), kind:"contract",  fileName:"CTR-tank-cambridge-2026.pdf",         title:"عقد كامبريدج بريس — تانك إنكيوبيتور",     titleEn:"Cambridge Press contract — Tank Incubator", status:"PARSING", size:420000,  confidence:null, supplierName:null },
    { id:sid("doc",14), kind:"report",    fileName:"RPT-sustainability-2026-q1.pdf",      title:"تقرير الاستدامة ESG — الربع الأول",        titleEn:"ESG sustainability report — Q1 2026",       status:"MATCHED", size:264000,  confidence:0.99, supplierName:null },
    { id:sid("doc",15), kind:"invoice",   fileName:"INV-تغليف-حديث-2026-04.pdf",         title:"فاتورة تغليف — شركة التغليف الحديث",       titleEn:"Packaging invoice — Modern Packaging Co",  status:"MATCHED", size:112000,  confidence:0.95, supplierName:"شركة التغليف الحديث" },
    { id:sid("doc",16), kind:"report",    fileName:"RPT-dairy-batches-waste-june.pdf",    title:"تقرير هدر دفعات الألبان — يونيو",          titleEn:"Dairy batch waste report — June",           status:"MATCHED", size:178000,  confidence:0.99, supplierName:null },
    { id:sid("doc",17), kind:"contract",  fileName:"CTR-golden-tours-hotels-2026.pdf",    title:"عقد وكالة الذهب للسياحة — فنادق الحوراني",titleEn:"Golden Tours — Hourani Hotels agreement",   status:"MATCHED", size:232000,  confidence:0.96, supplierName:null },
    { id:sid("doc",18), kind:"invoice",   fileName:"INV-IT-solutions-2026-06.pdf",        title:"فاتورة IT — الحلول التقنية المتكاملة",     titleEn:"IT invoice — Integrated Tech Solutions",    status:"REVIEW",  size:98000,   confidence:0.82, supplierName:"الحلول التقنية المتكاملة" },
    { id:sid("doc",19), kind:"report",    fileName:"RPT-loran-harvest-forecast-q3.pdf",   title:"توقعات حصاد لوران — الربع الثالث",         titleEn:"Loran harvest forecast — Q3 2026",          status:"MATCHED", size:156000,  confidence:0.99, supplierName:null },
    { id:sid("doc",20), kind:"contract",  fileName:"CTR-maha-safeway-2026-renewal.pdf",   title:"تجديد عقد سيفوي — مها للألبان 2026",      titleEn:"Safeway contract renewal — Maha Dairy 2026",status:"MATCHED", size:310000,  confidence:0.97, supplierName:null },
  ];

  let docCount = 0;
  for (const d of DOCS) {
    await prisma.document.upsert({
      where: { id: d.id },
      create: {
        id: d.id, scope: "default", kind: d.kind,
        fileName: d.fileName, fileSize: d.size, mimeType: "application/pdf",
        title: d.title, titleEn: d.titleEn,
        status: d.status,
        matchedSupplierName: d.supplierName ?? undefined,
        matchConfidence: d.confidence ?? undefined,
        uploadedById: adminId ?? undefined,
        createdAt: daysAgo(Math.floor(docCount * 1.8)),
        parsedMs: d.status !== "PARSING" ? 1200 + docCount * 80 : undefined,
      },
      update: { status: d.status },
    });
    docCount++;
  }
  console.log(`  documents: ${docCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  console.log("\n● Demo Content Seed complete.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
