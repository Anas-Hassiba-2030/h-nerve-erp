import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PROTOCOL_CLAUSES } from "../lib/protocol/clauses";

const prisma = new PrismaClient();

const day = 24 * 60 * 60 * 1000;
const today = new Date();
const at = (offsetDays: number, hour = 12) => {
  const d = new Date(today.getTime() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const ref = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;

// Deterministic PRNG (mulberry32) seeded with a fixed value so every reseed
// produces the *same* numbers — trustworthy demo data, not random noise.
// Replaces Math.random() everywhere downstream (we monkey-patch globally
// for the duration of the seed run, then restore).
const SEED_VALUE = 0x4ec0_1234;
function makePrng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _seedPrng = makePrng(SEED_VALUE);
const _realRandom = Math.random;
Math.random = _seedPrng; // restored at the end of seedOperator()

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const randF = (min: number, max: number) => +(min + Math.random() * (max - min)).toFixed(2);

export async function seedOperator() {
  // -- Wipe (FK-safe order)
  await prisma.protocolClause.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sustainabilityScore.deleteMany();
  await prisma.marketStock.deleteMany();
  await prisma.futureProject.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.supplyForecast.deleteMany();
  await prisma.program.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.dairyBatch.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hotel.deleteMany();
  // Brain models — include in wipe so re-seeding is idempotent
  await prisma.planStep.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.brainIQHistory.deleteMany();
  await prisma.selfTuningReport.deleteMany();
  await prisma.brainFeedback.deleteMany();
  await prisma.brainPattern.deleteMany();
  await prisma.brainWeight.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // -------------------------------------------------------------------
  // COMPANIES
  // -------------------------------------------------------------------
  const arena = await prisma.company.create({
    data: {
      code: "ARENA",
      name: "أرينا سبيس للضيافة",
      nameEn: "Arena Space Hospitality",
      sector: "HOSPITALITY",
      country: "JO",
      city: "عمّان",
      foundedYear: 2014,
      employees: 240,
      brandColor: "amber",
      ticker: "ARENA.ASE",
      description: "سلسلة فنادق ومنتجعات متميزة في عمّان وبلغاريا، تستهدف رجال الأعمال والسياحة العائلية الفاخرة.",
    },
  });
  const maha = await prisma.company.create({
    data: {
      code: "MAHA",
      name: "المها للألبان",
      nameEn: "Maha Dairy Industries",
      sector: "DAIRY",
      country: "JO",
      city: "الزرقاء",
      foundedYear: 1992,
      employees: 380,
      brandColor: "sky",
      ticker: "MAHA.ASE",
      description: "ذراع مجموعة الحوراني في الصناعات الغذائية: الألبان، اللبنة، الجبن الأبيض، والمنتجات الطازجة.",
    },
  });
  const loran = await prisma.company.create({
    data: {
      code: "LORAN",
      name: "لوران للاستثمار الزراعي",
      nameEn: "Loran Agricultural Investment",
      sector: "AGRICULTURE",
      country: "JO",
      city: "الأغوار",
      foundedYear: 2001,
      employees: 165,
      brandColor: "emerald",
      ticker: "LORAN.ASE",
      description: "دفيئات ذكية، مزارع مفتوحة، وثروة حيوانية. مزوّد المجموعة الرئيسي بالخضروات الطازجة والألبان الخام.",
    },
  });
  const aau = await prisma.company.create({
    data: {
      code: "AAU",
      name: "جامعة عمّان الأهلية",
      nameEn: "Al-Ahliyya Amman University",
      sector: "EDUCATION",
      country: "JO",
      city: "عمّان",
      foundedYear: 1990,
      employees: 1200,
      brandColor: "indigo",
      ticker: "AAU.ASE",
      description: "أول جامعة خاصة في الأردن، تحتضن «The Tank» لريادة الأعمال ودفيئة زراعية ذكية للأبحاث التطبيقية.",
    },
  });
  const hHolding = await prisma.company.create({
    data: {
      code: "HH",
      name: "الحوراني القابضة",
      nameEn: "Hourani Holding",
      sector: "INVESTMENT",
      country: "JO",
      city: "عمّان",
      foundedYear: 1979,
      employees: 80,
      brandColor: "slate",
      ticker: "HH.ASE",
      description: "الكيان الأم — يدير محفظة الاستثمارات والشراكات الاستراتيجية للمجموعة منذ 1979.",
    },
  });

  const companyById = { arena, maha, loran, aau, hHolding };
  const allCompanies = [arena, maha, loran, aau, hHolding];

  // -------------------------------------------------------------------
  // USERS — with chess ranks + XP
  // -------------------------------------------------------------------
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@hourani.jo",
      name: "أنس حسيبة",
      passwordHash: adminHash,
      role: "ADMIN",
      title: "مهندس النظام المركزي",
      companyId: hHolding.id,
      avatarColor: "emerald",
      rank: "KING",
      xp: 920,
      loginCount: 87,
      bonusPercent: 12,
      lastLoginAt: at(0, 9),
    },
  });
  // Product owner — Anas's real login, always ADMIN (see lib/owner.ts).
  // Password: admin123 (or SEED_ADMIN_PASSWORD). Lets the owner sign in
  // on a freshly-seeded production with their own email.
  const owner = await prisma.user.create({
    data: {
      email: "anashasiba91@gmail.com",
      name: "أنس حسيبة",
      passwordHash: adminHash,
      role: "ADMIN",
      title: "المالك · مهندس النظام",
      companyId: hHolding.id,
      avatarColor: "gold",
      rank: "KING",
      xp: 1000,
      loginCount: 1,
      bonusPercent: 12,
      lastLoginAt: at(0, 9),
    },
  });
  const ceo = await prisma.user.create({
    data: {
      email: "ceo@hourani.jo",
      name: "د. عبدالله الحوراني",
      passwordHash: adminHash,
      role: "EXECUTIVE",
      title: "الرئيس التنفيذي للمجموعة",
      companyId: hHolding.id,
      avatarColor: "amber",
      rank: "KING",
      xp: 1100,
      loginCount: 142,
      bonusPercent: 15,
      lastLoginAt: at(0, 8),
    },
  });
  const arenaGm = await prisma.user.create({
    data: {
      email: "arena.gm@hourani.jo",
      name: "ريم الزواهرة",
      passwordHash: adminHash,
      role: "MANAGER",
      title: "مدير عام أرينا سبيس",
      companyId: arena.id,
      avatarColor: "amber",
      rank: "QUEEN",
      xp: 410,
      loginCount: 58,
      bonusPercent: 9,
      lastLoginAt: at(-1, 17),
    },
  });
  const mahaGm = await prisma.user.create({
    data: {
      email: "maha.gm@hourani.jo",
      name: "م. خالد العمري",
      passwordHash: adminHash,
      role: "MANAGER",
      title: "مدير الإنتاج — المها",
      companyId: maha.id,
      avatarColor: "sky",
      rank: "KNIGHT",
      xp: 245,
      loginCount: 41,
      bonusPercent: 6,
      lastLoginAt: at(-1, 19),
    },
  });
  const loranGm = await prisma.user.create({
    data: {
      email: "loran.gm@hourani.jo",
      name: "م. ليلى أبو رمان",
      passwordHash: adminHash,
      role: "MANAGER",
      title: "مدير المزارع — لوران",
      companyId: loran.id,
      avatarColor: "emerald",
      rank: "KNIGHT",
      xp: 220,
      loginCount: 38,
      bonusPercent: 6,
      lastLoginAt: at(0, 7),
    },
  });
  const staffMember = await prisma.user.create({
    data: {
      email: "staff@hourani.jo",
      name: "نور الخطيب",
      passwordHash: adminHash,
      role: "STAFF",
      title: "أخصائي تسويق رقمي",
      companyId: arena.id,
      avatarColor: "amber",
      rank: "BISHOP",
      xp: 95,
      loginCount: 24,
      bonusPercent: 3,
      lastLoginAt: at(-2, 11),
    },
  });
  const newHire = await prisma.user.create({
    data: {
      email: "newhire@hourani.jo",
      name: "محمد الزغول",
      passwordHash: adminHash,
      role: "STAFF",
      title: "محلل عمليات",
      companyId: maha.id,
      avatarColor: "sky",
      rank: "PAWN",
      xp: 28,
      loginCount: 6,
      bonusPercent: 1,
      lastLoginAt: at(-3, 10),
    },
  });

  const users = [admin, owner, ceo, arenaGm, mahaGm, loranGm, staffMember, newHire];

  // -------------------------------------------------------------------
  // HOTELS + BOOKINGS
  // -------------------------------------------------------------------
  const arenaAmman = await prisma.hotel.create({
    data: {
      companyId: arena.id,
      name: "أرينا سبيس عمّان",
      nameEn: "Arena Space Amman",
      city: "عمّان",
      country: "JO",
      tier: "LUXURY",
      totalRooms: 220,
      starRating: 5,
      baselineADR: 185,
      description: "العقار الرئيسي للسلسلة في العبدلي — يخدم رجال الأعمال والمؤتمرات الإقليمية.",
    },
  });
  const arenaDeadSea = await prisma.hotel.create({
    data: {
      companyId: arena.id,
      name: "أرينا سبيس البحر الميت",
      nameEn: "Arena Space Dead Sea",
      city: "البحر الميت",
      country: "JO",
      tier: "RESORT",
      totalRooms: 180,
      starRating: 5,
      baselineADR: 220,
      description: "منتجع شاطئي عائلي، إشغال موسمي مرتفع في الربيع والخريف.",
    },
  });
  const arenaSofia = await prisma.hotel.create({
    data: {
      companyId: arena.id,
      name: "أرينا سبيس صوفيا",
      nameEn: "Arena Space Sofia",
      city: "صوفيا",
      country: "BG",
      tier: "BUSINESS",
      totalRooms: 140,
      starRating: 4,
      baselineADR: 130,
      description: "بوابة المجموعة على شرق أوروبا — إقامة طويلة الأمد ومسافرو أعمال.",
    },
  });
  const arenaVarna = await prisma.hotel.create({
    data: {
      companyId: arena.id,
      name: "أرينا سبيس فارنا",
      nameEn: "Arena Space Varna",
      city: "فارنا",
      country: "BG",
      tier: "RESORT",
      totalRooms: 160,
      starRating: 4,
      baselineADR: 150,
      description: "منتجع على ساحل البحر الأسود، ذروة الإشغال صيفاً.",
    },
  });

  const guests = [
    "وفد رجال الأعمال — البحرين", "عائلة العتيبي", "مؤتمر الذكاء الاصطناعي 2026",
    "محمد التميمي", "Boutros & Co.", "GreenTech Bulgaria", "Lina Haddad",
    "وفد جامعة عمّان الأهلية", "شركة المهدي للألبسة", "Ahmed Al-Rifai",
    "BMW Middle East", "وفد وزارة الاستثمار", "DigitalNomad Group", "Karim Mansour",
    "EuroSkills Conference", "Hala Saifi", "TechFest Sofia", "وفد جامعي بلغاري",
    "Investor Roadshow", "ABC Logistics",
  ];
  const roomTypes = ["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"] as const;
  const hotels = [arenaAmman, arenaDeadSea, arenaSofia, arenaVarna];
  // CALCULATED, not random. Occupancy is the headline pitch number, so each
  // hotel is filled to a believable target (66–78%) of its real room count by
  // committed (CHECKED_IN now + CONFIRMED soon) bookings — both states count
  // toward occupancy in hotels/page.tsx + dashboard. We also lay down ~150 days
  // of COMPLETED history so revenue trends, ADR, and the booking heatmap look
  // lived-in. Every booking's revenue derives from ADR × room-type × rooms ×
  // nights, so Finance ties back to occupancy instead of floating free.
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
  const roomWeighted = [1, 1, 1, 1, 2, 2, 2, 3, 4] as const; // mostly small parties
  const adrFor = (room: string) =>
    room === "PRESIDENTIAL" ? 3 : room === "SUITE" ? 2 : room === "DELUXE" ? 1.4 : 1;
  let bRef = 1;
  const bookingRows: any[] = [];
  for (const hotel of hotels) {
    const targetOcc = randF(0.66, 0.78);
    const occupiedTarget = Math.round(hotel.totalRooms * targetOcc);

    // 1) Committed bookings filling the house to ~target occupancy now.
    let filled = 0;
    while (filled < occupiedTarget) {
      const rooms = Math.min(pick(roomWeighted), occupiedTarget - filled);
      filled += rooms;
      const room = pick(roomTypes);
      const nights = rand(1, 6);
      const future = Math.random() < 0.28; // ~28% are upcoming arrivals
      const startOffset = future ? rand(1, 18) : -rand(0, Math.max(1, nights - 1));
      bookingRows.push({
        hotelId: hotel.id,
        tenantId: "hourani-hotels",
        reference: ref("BK", bRef++),
        guestName: pick(guests),
        roomType: room,
        rooms,
        guests: rooms * 2,
        checkIn: at(startOffset, 14),
        checkOut: at(startOffset + nights, 12),
        revenue: Math.round(hotel.baselineADR * adrFor(room) * rooms * nights),
        status: future ? "CONFIRMED" : "CHECKED_IN",
        notes: bRef % 9 === 0 ? "VIP — تنبيه استقبال خاص." : null,
      });
    }

    // 2) ~150 days of completed history → revenue trend + heatmap depth.
    const historyCount = rand(44, 60);
    for (let h = 0; h < historyCount; h++) {
      const rooms = pick(roomWeighted);
      const room = pick(roomTypes);
      const nights = rand(1, 6);
      const seasonal = randF(0.85, 1.2); // gentle demand swing
      const start = -rand(nights + 1, 150);
      bookingRows.push({
        hotelId: hotel.id,
        tenantId: "hourani-hotels",
        reference: ref("BK", bRef++),
        guestName: pick(guests),
        roomType: room,
        rooms,
        guests: rooms * 2,
        checkIn: at(start, 14),
        checkOut: at(start + nights, 12),
        revenue: Math.round(hotel.baselineADR * adrFor(room) * rooms * nights * seasonal),
        status: "COMPLETED",
        notes: null,
      });
    }
  }
  await prisma.booking.createMany({ data: bookingRows });

  // -------------------------------------------------------------------
  // DAIRY BATCHES
  // -------------------------------------------------------------------
  const dairyProducts: Array<[string, string, number, number]> = [
    ["MILK", "حليب طازج كامل الدسم", 4500, 7],
    ["LABNEH", "لبنة بلدية", 1200, 14],
    ["YOGURT", "زبادي طبيعي", 2200, 12],
    ["CHEESE", "جبن أبيض ناعم", 800, 30],
    ["BUTTER", "زبدة طازجة", 350, 45],
    ["CREAM", "قشطة", 500, 10],
  ];
  let dRef = 1;
  for (let i = 0; i < 24; i++) {
    const [code, nameAr, base, expIn] = dairyProducts[i % dairyProducts.length];
    const daysAgo = Math.floor(Math.random() * 20);
    const status = daysAgo > expIn ? "DISTRIBUTED" : daysAgo > 1 ? (Math.random() < 0.6 ? "READY" : "DISTRIBUTED") : "IN_PRODUCTION";
    await prisma.dairyBatch.create({
      data: {
        companyId: maha.id,
        batchNumber: ref("MAHA", dRef++),
        product: code,
        productAr: nameAr,
        quantityLiters: base + Math.floor(Math.random() * 800),
        qualityGrade: Math.random() < 0.85 ? "A" : "B",
        fatContent: 2.5 + Math.random() * 2,
        productionDate: at(-daysAgo, 6),
        expiryDate: at(-daysAgo + expIn, 23),
        status,
        destination: i % 3 === 0 ? "أرينا سبيس عمّان" : i % 3 === 1 ? "Retail — Amman" : "أرينا سبيس البحر الميت",
        notes: i % 9 === 0 ? "دفعة موسومة كأولوية للفنادق." : null,
      },
    });
  }

  // -------------------------------------------------------------------
  // FARMS + CROPS
  // -------------------------------------------------------------------
  const greenhouseLoran = await prisma.farm.create({
    data: {
      companyId: loran.id,
      name: "دفيئة لوران 1 — الأغوار",
      nameEn: "Loran Greenhouse 1",
      type: "GREENHOUSE",
      location: "وادي الأردن",
      areaDunum: 12,
      tempC: 24.6,
      humidity: 71,
      soilMoisture: 38,
      alertLevel: "OK",
      lastReadAt: at(0, today.getHours()),
      description: "دفيئة طماطم وخيار — تتغذى من نظام H-Nerve مباشرة على بيانات إشغال الفنادق.",
    },
  });
  const greenhouseAAU = await prisma.farm.create({
    data: {
      companyId: aau.id,
      name: "الدفيئة الذكية — الجامعة",
      nameEn: "AAU Smart Greenhouse",
      type: "GREENHOUSE",
      location: "حرم جامعة عمّان الأهلية",
      areaDunum: 4,
      tempC: 26.1,
      humidity: 64,
      soilMoisture: 29,
      alertLevel: "WARN",
      lastReadAt: at(0, today.getHours()),
      description: "منشأة بحثية مشتركة بين كلية الأعمال وكلية الزراعة — اختبار خوارزميات التوقع.",
    },
  });
  const livestockLoran = await prisma.farm.create({
    data: {
      companyId: loran.id,
      name: "حظائر لوران للأبقار",
      nameEn: "Loran Cattle Ranch",
      type: "LIVESTOCK",
      location: "المفرق",
      areaDunum: 320,
      alertLevel: "OK",
      lastReadAt: at(-1, 8),
      description: "260 رأس بقر حلوب — مزوّد رئيسي للمها بالحليب الخام.",
    },
  });
  const openFieldLoran = await prisma.farm.create({
    data: {
      companyId: loran.id,
      name: "حقول لوران المكشوفة",
      nameEn: "Loran Open Fields",
      type: "OPEN_FIELD",
      location: "الأغوار الجنوبية",
      areaDunum: 180,
      alertLevel: "OK",
      lastReadAt: at(-2, 8),
      description: "زراعة موسمية: بطاطا، بصل، فاصولياء.",
    },
  });
  await prisma.crop.createMany({
    data: [
      { farmId: greenhouseLoran.id, tenantId: "loran-agri", name: "طماطم", variety: "Cherry F1", plantedAt: at(-45, 8), expectedHarvest: at(15, 8), expectedYieldKg: 8000, status: "GROWING" },
      { farmId: greenhouseLoran.id, tenantId: "loran-agri", name: "خيار", variety: "Beit Alpha", plantedAt: at(-30, 8), expectedHarvest: at(10, 8), expectedYieldKg: 5500, status: "GROWING" },
      { farmId: greenhouseAAU.id, tenantId: "tank-incubator", name: "فلفل ملون", variety: "Bell Mix", plantedAt: at(-20, 8), expectedHarvest: at(40, 8), expectedYieldKg: 1200, status: "GROWING" },
      { farmId: openFieldLoran.id, tenantId: "loran-agri", name: "بطاطا", variety: "Spunta", plantedAt: at(-90, 8), expectedHarvest: at(-5, 8), actualYieldKg: 22000, expectedYieldKg: 24000, status: "HARVESTED" },
      { farmId: openFieldLoran.id, tenantId: "loran-agri", name: "بصل", variety: "Texas Grano", plantedAt: at(-60, 8), expectedHarvest: at(20, 8), expectedYieldKg: 9000, status: "GROWING" },
    ],
  });

  // -------------------------------------------------------------------
  // PROGRAMS — Tank Incubator
  // -------------------------------------------------------------------
  await prisma.program.createMany({
    data: [
      { companyId: aau.id, name: "نيرف لابز", nameEn: "Nerve Labs", founder: "أنس حسيبة", vertical: "AI", stage: "ACCELERATING", cohort: "2026-S1", fundingJod: 15000, teamSize: 4, description: "البنية التحتية لتطبيقات الذكاء الاصطناعي العربية — خرج منها نواة H-Nerve." },
      { companyId: aau.id, name: "هاسيبا للتجارة", nameEn: "Hasiba E-commerce", founder: "أنس حسيبة", vertical: "ECOMMERCE", stage: "ACCELERATING", cohort: "2026-S1", fundingJod: 8000, teamSize: 3, description: "متجر دروبشيبينغ لمنتجات الصحة والجمال + اختبار خوارزميات التحويل." },
      { companyId: aau.id, name: "أغريفاي", nameEn: "Agrify", founder: "هلا الصيفي", vertical: "AGRITECH", stage: "INTAKE", cohort: "2026-S1", fundingJod: 5000, teamSize: 2, description: "حساسات IoT للدفيئات الصغيرة — مرشحة للتجربة في مزارع لوران." },
      { companyId: aau.id, name: "كوبي رايت", nameEn: "CopyRight AI", founder: "كريم منصور", vertical: "AI", stage: "GRADUATED", cohort: "2025-F2", fundingJod: 22000, teamSize: 5, description: "أداة كتابة نصوص تسويقية بالعربية — تستخدمها أرينا سبيس داخلياً." },
      { companyId: aau.id, name: "EduPay", nameEn: "EduPay", founder: "ليث جرادات", vertical: "FINTECH", stage: "INTAKE", cohort: "2026-S1", fundingJod: 3000, teamSize: 2, description: "تقسيط الأقساط الجامعية — قيد التحقق التنظيمي." },
    ],
  });

  // -------------------------------------------------------------------
  // SUPPLY FORECASTS
  // -------------------------------------------------------------------
  await prisma.supplyForecast.createMany({
    data: [
      { sourceCompanyId: arena.id, targetCompanyId: maha.id, category: "DAIRY", productLabel: "حليب + لبنة لإفطارات النزلاء", unit: "لتر", predictedDemand: 1850, confidence: 0.91, periodStart: at(2, 6), periodEnd: at(9, 22), signal: "تأكيد 380 حجز إضافي في أرينا عمّان (مؤتمر AI 2026) — استهلاك إفطار متوقع +42%.", status: "APPROVED", generatedById: admin.id },
      { sourceCompanyId: arena.id, targetCompanyId: loran.id, category: "PRODUCE", productLabel: "طماطم + خيار + فلفل للمطبخ", unit: "كغ", predictedDemand: 620, confidence: 0.84, periodStart: at(3, 6), periodEnd: at(10, 22), signal: "إشغال أرينا البحر الميت تجاوز 88% للأسبوع القادم — توجيه دفيئة لوران 1 بأولوية الحصاد.", status: "DRAFT", generatedById: admin.id },
      { sourceCompanyId: arena.id, targetCompanyId: maha.id, category: "DAIRY", productLabel: "أجبان مشكّلة لمنتجع البحر الميت", unit: "كغ", predictedDemand: 220, confidence: 0.76, periodStart: at(5, 6), periodEnd: at(12, 22), signal: "موسم الربيع — حجوزات عائلية +31% مقارنة بالعام الماضي.", status: "DRAFT", generatedById: admin.id },
      { sourceCompanyId: aau.id, targetCompanyId: maha.id, category: "DAIRY", productLabel: "حليب + زبادي للكافتيريات", unit: "لتر", predictedDemand: 980, confidence: 0.88, periodStart: at(1, 6), periodEnd: at(7, 22), signal: "بدء الفصل الدراسي + معارض «The Tank» — استهلاك الكافتيريات يرتفع بانتظام في هذا التوقيت.", status: "EXECUTED", generatedById: admin.id },
      { sourceCompanyId: arena.id, targetCompanyId: loran.id, category: "PRODUCE", productLabel: "بصل + بطاطا — مطابخ صوفيا/فارنا", unit: "كغ", predictedDemand: 1400, confidence: 0.69, periodStart: at(7, 6), periodEnd: at(14, 22), signal: "محدودية المورد المحلي في بلغاريا — مقترح تصدير دفعة من حقول لوران المكشوفة.", status: "DRAFT", generatedById: admin.id },
    ],
  });

  // -------------------------------------------------------------------
  // TRANSACTIONS
  // Deterministic layout: Arena REVENUE is explicitly present in BOTH
  // the prior period (days -60 to -31) AND the current period (days -30
  // to -1), with the current period larger → healthy positive delta.
  // Other companies follow the same pattern at known day offsets.
  // All amounts are realistic JOD figures from the original seed.
  // -------------------------------------------------------------------
  let tRef = 1;

  // Helper to create one transaction without randomised date.
  const tx = async (
    companyId: string,
    kind: string,
    category: string,
    amount: number,
    dayOffset: number,
  ) => {
    await prisma.transaction.create({
      data: {
        companyId,
        reference: ref("TX", tRef++),
        kind,
        category,
        amount,
        currency: "JOD",
        description: category,
        occurredAt: at(dayOffset, 12),
        createdById: admin.id,
      },
    });
  };

  // ── Arena Space (HOSPITALITY) ─────────────────────────────────────
  // Prior period (days -60 to -31): 6 REVENUE rows, total ≈ 280 000 JOD
  await tx(arena.id, "REVENUE", "حجوزات فندقية - أرينا عمّان",    42000, -58);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - البحر الميت",    55000, -52);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - أرينا عمّان",    38000, -47);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - صوفيا",          32000, -42);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - البحر الميت",    63000, -38);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - فارنا",          50000, -33);
  // Prior period EXPENSE rows
  await tx(arena.id, "EXPENSE", "رواتب وتشغيل",                   48000, -55);
  await tx(arena.id, "EXPENSE", "تسويق رقمي وإعلانات",             4200, -44);
  await tx(arena.id, "EXPENSE", "صيانة دورية",                     6800, -35);

  // Current period (days -29 to -1): 8 REVENUE rows, total ≈ 420 000 JOD
  // Spread so every 7-day sparkline bucket has a hit.
  await tx(arena.id, "REVENUE", "حجوزات فندقية - أرينا عمّان",    58000, -29);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - البحر الميت",    72000, -24);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - مؤتمر AI 2026",  95000, -20);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - أرينا عمّان",    47000, -16);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - فارنا",          61000, -12);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - صوفيا",          38000,  -8);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - البحر الميت",    68000,  -4);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - أرينا عمّان",    54000,  -1);
  // Current period EXPENSE rows
  await tx(arena.id, "EXPENSE", "رواتب وتشغيل",                   52000, -27);
  await tx(arena.id, "EXPENSE", "تسويق رقمي وإعلانات",             5800, -15);
  await tx(arena.id, "EXPENSE", "صيانة دورية وتحديثات",            8200,  -6);

  // ── Maha Dairy ───────────────────────────────────────────────────
  // Prior period
  await tx(maha.id, "REVENUE", "مبيعات تجزئة - ألبان",            18000, -57);
  await tx(maha.id, "REVENUE", "مبيعات الجملة - فنادق المجموعة",   9000, -50);
  await tx(maha.id, "REVENUE", "مبيعات تجزئة - ألبان",            22000, -40);
  await tx(maha.id, "REVENUE", "مبيعات الجملة - فنادق المجموعة",  11000, -36);
  await tx(maha.id, "EXPENSE", "مواد خام - ألبان",                 8000, -54);
  await tx(maha.id, "EXPENSE", "أعلاف وصيانة",                     5500, -43);
  // Current period
  await tx(maha.id, "REVENUE", "مبيعات تجزئة - ألبان",            26000, -28);
  await tx(maha.id, "REVENUE", "مبيعات الجملة - فنادق المجموعة",  12000, -22);
  await tx(maha.id, "REVENUE", "مبيعات تجزئة - ألبان",            24000, -14);
  await tx(maha.id, "REVENUE", "مبيعات الجملة - فنادق المجموعة",  10000,  -7);
  await tx(maha.id, "REVENUE", "مبيعات تجزئة - ألبان",            28000,  -3);
  await tx(maha.id, "EXPENSE", "مواد خام - ألبان",                10000, -25);
  await tx(maha.id, "EXPENSE", "أعلاف وصيانة",                     6200, -10);

  // ── Loran Agriculture ────────────────────────────────────────────
  // Prior period
  await tx(loran.id, "REVENUE", "مبيعات خضروات - جملة",           12000, -59);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - تجزئة",           8000, -48);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - جملة",           15000, -37);
  await tx(loran.id, "EXPENSE", "أعلاف ماشية وبذور",               6000, -53);
  await tx(loran.id, "EXPENSE", "صيانة دفيئات",                    2800, -41);
  // Current period
  await tx(loran.id, "REVENUE", "مبيعات خضروات - جملة",           17000, -26);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - تجزئة",          10000, -18);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - جملة",           14000,  -9);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - تجزئة",          11000,  -2);
  await tx(loran.id, "EXPENSE", "أعلاف ماشية وبذور",               7500, -23);
  await tx(loran.id, "EXPENSE", "صيانة دفيئات",                    3100,  -5);

  // ── Al-Ahliyya University / The Tank ─────────────────────────────
  // Prior period
  await tx(aau.id, "REVENUE", "رسوم دراسية - الفصل الثاني",      185000, -56);
  await tx(aau.id, "REVENUE", "رسوم برامج The Tank",               42000, -46);
  await tx(aau.id, "EXPENSE", "رواتب أعضاء هيئة التدريس",          95000, -60);
  await tx(aau.id, "EXPENSE", "تشغيل وصيانة المرافق",              28000, -39);
  // Current period
  await tx(aau.id, "REVENUE", "رسوم دراسية - الفصل الثاني",      210000, -27);
  await tx(aau.id, "REVENUE", "رسوم برامج The Tank",               55000, -19);
  await tx(aau.id, "REVENUE", "رسوم التسجيل الصيفي",               38000, -11);
  await tx(aau.id, "EXPENSE", "رواتب أعضاء هيئة التدريس",         100000, -30);
  await tx(aau.id, "EXPENSE", "تشغيل وصيانة المرافق",              31000,  -8);

  // ── Hourani Holding (transfers + older historical) ────────────────
  await tx(hHolding.id, "TRANSFER", "تحويل داخلي - تمويل أرينا",  60000, -62);
  await tx(hHolding.id, "TRANSFER", "تحويل داخلي - رأس مال لوران", 35000, -45);
  await tx(hHolding.id, "TRANSFER", "تحويل داخلي - تمويل توسعة",  80000, -31);
  await tx(hHolding.id, "TRANSFER", "تحويل داخلي - أرينا سبيس",   45000, -17);

  // ── Historical depth (months 2-3 for trend sparkline) ────────────
  // Six monthly buckets for the sparkline need data in months -6 to -1.
  // Months 2-6 ago (days -61 to -180) — one Arena REVENUE row per month.
  await tx(arena.id, "REVENUE", "حجوزات فندقية - تاريخي",         215000, -90);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - تاريخي",         232000, -120);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - تاريخي",         248000, -150);
  await tx(arena.id, "REVENUE", "حجوزات فندقية - تاريخي",         261000, -180);
  await tx(maha.id,  "REVENUE", "مبيعات ألبان - تاريخي",           72000,  -90);
  await tx(maha.id,  "REVENUE", "مبيعات ألبان - تاريخي",           78000, -120);
  await tx(loran.id, "REVENUE", "مبيعات خضروات - تاريخي",          38000,  -90);
  await tx(aau.id,   "REVENUE", "رسوم دراسية - تاريخي",           390000,  -90);

  // -------------------------------------------------------------------
  // INSIGHTS
  // -------------------------------------------------------------------
  await prisma.aIInsight.createMany({
    data: [
      { module: "SUPPLY", severity: "OPPORTUNITY", title: "فرصة تآزر: ربط حجوزات أرينا الزرقاء بإنتاج المها", body: "النظام التقط نمطاً متكرراً: في كل أسبوع تتجاوز فيه حجوزات أرينا عمّان 80% إشغال، ترتفع طلبيات المها بنسبة 38% بعد 48 ساعة. يقترح H-Nerve ربط هذه الإشارة بأمر تصنيع تلقائي — توفير لوجستي تقديري: 6,400 د.أ شهرياً.", status: "OPEN", authorId: admin.id },
      { module: "FARMS", severity: "WARN", title: "انخفاض رطوبة التربة في الدفيئة الذكية - الجامعة", body: "قراءة المستشعرات: 29% رطوبة، أقل من العتبة المثلى (35%). يوصى بتفعيل الري الجزئي خلال 4 ساعات.", status: "OPEN" },
      { module: "HOTELS", severity: "INFO", title: "أرينا سبيس صوفيا: بداية موسم الأعمال", body: "حجوزات الأسبوعين القادمين تشير إلى ارتفاع 22% — يتم تجهيز فريق الاستقبال البلغاري.", status: "ACKNOWLEDGED" },
      { module: "DAIRY", severity: "CRITICAL", title: "دفعة لبنة قرب انتهاء الصلاحية - المها", body: "دفعة MAHA-00007 (1,180 لتر) — تنتهي خلال 36 ساعة. اقتراح: تحويل عاجل إلى منفذ التجزئة بعرض ترويجي.", status: "OPEN" },
      { module: "FINANCE", severity: "OPPORTUNITY", title: "هامش الربح في دفيئة لوران 1 يتفوق على المعيار", body: "هامش الربح 41% مقابل 28% معيار القطاع. توصية: نسخ النموذج التشغيلي إلى الحقول المكشوفة في الموسم القادم.", status: "OPEN" },
      { module: "EDUCATION", severity: "INFO", title: "حاضنة The Tank: 5 شركات نشطة في الكوهورت 2026-S1", body: "تمويل تراكمي: 53,000 د.أ. من بينها «أغريفاي» المرشحة للتجربة المباشرة في مزارع لوران.", status: "OPEN" },
    ],
  });

  // -------------------------------------------------------------------
  // FUTURE PROJECTS — pipeline per company
  // -------------------------------------------------------------------
  const futureProjects = [
    { companyId: arena.id, title: "أرينا سبيس العقبة", description: "افتتاح منتجع شاطئي 5 نجوم في العقبة بسعة 240 غرفة، يستهدف السياحة الخليجية.", stage: "PLANNED", budgetJod: 18000000, priority: "HIGH", startQuarter: "2026-Q4", targetQuarter: "2028-Q2", kpis: "إشغال 65% بنهاية السنة الأولى، 12% ROI سنوياً", ownerName: "ريم الزواهرة", progressPct: 18 },
    { companyId: arena.id, title: "Arena Smart Concierge", description: "تطبيق ذكاء اصطناعي مدمج بالحجز يقترح تجارب محلية للنزلاء بناءً على ملفهم.", stage: "RESEARCH", budgetJod: 240000, priority: "MEDIUM", startQuarter: "2026-Q3", targetQuarter: "2027-Q1", kpis: "ARPU +18%، رضا النزلاء 4.6/5", ownerName: "نيرف لابز", progressPct: 35 },
    { companyId: arena.id, title: "توسعة مرافق صوفيا", description: "إضافة 60 غرفة وقاعة مؤتمرات لـ 400 شخص.", stage: "APPROVED", budgetJod: 6500000, priority: "MEDIUM", startQuarter: "2026-Q2", targetQuarter: "2027-Q3", kpis: "إيرادات +9 مليون د.أ سنوياً", ownerName: "Vesselin K.", progressPct: 8 },
    { companyId: maha.id, title: "خط إنتاج الأجبان البريميوم", description: "خط تصنيع متخصص بالأجبان الأوروبية (موزاريلا، تشيدر) مستهدفاً قطاع المطاعم.", stage: "IN_PROGRESS", budgetJod: 1800000, priority: "HIGH", startQuarter: "2026-Q1", targetQuarter: "2026-Q4", kpis: "حصة سوقية 12% في خانة الأجبان البريميوم", ownerName: "م. خالد العمري", progressPct: 62 },
    { companyId: maha.id, title: "تصدير المها للخليج", description: "خطوط شحن مبردة + شراكات توزيع في السعودية والإمارات.", stage: "PLANNED", budgetJod: 950000, priority: "MEDIUM", startQuarter: "2026-Q3", targetQuarter: "2027-Q2", kpis: "1.5 مليون د.أ صادرات سنوياً", ownerName: "م. خالد العمري", progressPct: 22 },
    { companyId: loran.id, title: "10 دفيئات ذكية إضافية", description: "توسعة الطاقة الإنتاجية في الأغوار بنظام Loran-IoT الجديد.", stage: "APPROVED", budgetJod: 3200000, priority: "HIGH", startQuarter: "2026-Q3", targetQuarter: "2027-Q4", kpis: "+90 طن خضروات سنوياً، توفير مياه 35%", ownerName: "م. ليلى أبو رمان", progressPct: 14 },
    { companyId: loran.id, title: "مزرعة دواجن Loran Farms", description: "دخول قطاع الدواجن — 50,000 طائر/أسبوع.", stage: "IDEA", budgetJod: 2400000, priority: "LOW", startQuarter: "2027-Q1", targetQuarter: "2028-Q1", kpis: "غطاء استهلاك المجموعة الذاتي 100%", ownerName: "—", progressPct: 0 },
    { companyId: aau.id, title: "كلية الذكاء الاصطناعي التطبيقي", description: "كلية متخصصة بالذكاء الاصطناعي والتعلم الآلي بالشراكة مع نيرف لابز.", stage: "RESEARCH", budgetJod: 4500000, priority: "HIGH", startQuarter: "2026-Q4", targetQuarter: "2028-Q4", kpis: "200 طالب بكالوريوس + 60 ماجستير في السنة الأولى", ownerName: "د. عبدالله الحوراني", progressPct: 12 },
    { companyId: aau.id, title: "حضانة Tank 2.0", description: "نسخة موسعة من حاضنة The Tank تستوعب 25 شركة ناشئة، صندوق استثماري بقيمة 1.2 مليون د.أ.", stage: "PLANNED", budgetJod: 1200000, priority: "MEDIUM", startQuarter: "2026-Q3", targetQuarter: "2027-Q3", kpis: "5 شركات تخرج بقيمة سوقية > 1 مليون د.أ", ownerName: "أنس حسيبة", progressPct: 28 },
    { companyId: hHolding.id, title: "ترخيص H-Nerve كمنتج SaaS", description: "تحويل النظام الداخلي إلى منتج للمجموعات القابضة الإقليمية.", stage: "RESEARCH", budgetJod: 800000, priority: "URGENT", startQuarter: "2026-Q3", targetQuarter: "2027-Q2", kpis: "10 عملاء بنهاية 2027، إيرادات متكررة 450,000 د.أ", ownerName: "أنس حسيبة", progressPct: 42 },
  ];
  for (const p of futureProjects) {
    await prisma.futureProject.create({ data: p });
  }

  // -------------------------------------------------------------------
  // MARKET STOCKS — global + regional
  // -------------------------------------------------------------------
  const makeHistory = (start: number, vol: number) => {
    const out: number[] = [];
    let v = start;
    for (let i = 0; i < 30; i++) {
      v = Math.max(0.5, v + (Math.random() - 0.5) * vol);
      out.push(+v.toFixed(2));
    }
    return JSON.stringify(out);
  };

  const stocks = [
    { ticker: "ARENA.ASE", label: "Arena Hospitality", labelAr: "أرينا سبيس", exchange: "ASE", currency: "JOD", lastPrice: 6.42, changePct: 1.8, companyId: arena.id, region: "MENA", history: makeHistory(6, 0.3) },
    { ticker: "MAHA.ASE", label: "Maha Dairy", labelAr: "المها للألبان", exchange: "ASE", currency: "JOD", lastPrice: 2.15, changePct: -0.6, companyId: maha.id, region: "MENA", history: makeHistory(2, 0.1) },
    { ticker: "LORAN.ASE", label: "Loran Agri", labelAr: "لوران الزراعية", exchange: "ASE", currency: "JOD", lastPrice: 4.78, changePct: 2.4, companyId: loran.id, region: "MENA", history: makeHistory(4.5, 0.2) },
    { ticker: "AAU.ASE", label: "Al-Ahliyya Amman University", labelAr: "جامعة عمّان الأهلية", exchange: "ASE", currency: "JOD", lastPrice: 3.92, changePct: 0.4, companyId: aau.id, region: "MENA", history: makeHistory(3.8, 0.15) },
    { ticker: "HH.ASE", label: "Hourani Holding", labelAr: "الحوراني القابضة", exchange: "ASE", currency: "JOD", lastPrice: 18.6, changePct: 3.2, companyId: hHolding.id, region: "MENA", history: makeHistory(17, 0.6) },
    { ticker: "JOPH.ASE", label: "Jordan Phosphate Mines", labelAr: "مناجم الفوسفات الأردنية", exchange: "ASE", currency: "JOD", lastPrice: 11.2, changePct: -1.1, region: "MENA", history: makeHistory(11.5, 0.4) },
    { ticker: "ARBK.ASE", label: "Arab Bank", labelAr: "البنك العربي", exchange: "ASE", currency: "JOD", lastPrice: 7.85, changePct: 0.9, region: "MENA", history: makeHistory(7.6, 0.2) },
    { ticker: "2222.SR", label: "Saudi Aramco", labelAr: "أرامكو السعودية", exchange: "TADAWUL", currency: "SAR", lastPrice: 30.45, changePct: 0.6, region: "MENA", history: makeHistory(30, 0.5) },
    { ticker: "EMAAR.DU", label: "Emaar Properties", labelAr: "إعمار العقارية", exchange: "DFM", currency: "AED", lastPrice: 8.9, changePct: 1.5, region: "MENA", history: makeHistory(8.7, 0.3) },
    { ticker: "AAPL", label: "Apple Inc.", labelAr: "أبل", exchange: "NASDAQ", currency: "USD", lastPrice: 224.18, changePct: 1.2, region: "US", history: makeHistory(220, 4) },
    { ticker: "MSFT", label: "Microsoft", labelAr: "مايكروسوفت", exchange: "NASDAQ", currency: "USD", lastPrice: 482.5, changePct: 0.8, region: "US", history: makeHistory(478, 6) },
    { ticker: "NVDA", label: "NVIDIA", labelAr: "إنفيديا", exchange: "NASDAQ", currency: "USD", lastPrice: 138.7, changePct: 2.6, region: "US", history: makeHistory(135, 5) },
    { ticker: "GOOGL", label: "Alphabet", labelAr: "ألفابت", exchange: "NASDAQ", currency: "USD", lastPrice: 195.3, changePct: -0.4, region: "US", history: makeHistory(196, 3) },
    { ticker: "TSLA", label: "Tesla", labelAr: "تسلا", exchange: "NASDAQ", currency: "USD", lastPrice: 312.4, changePct: 4.1, region: "US", history: makeHistory(298, 10) },
    { ticker: "ASML.AS", label: "ASML Holding", labelAr: "إيه إس إم إل", exchange: "EURONEXT", currency: "EUR", lastPrice: 712, changePct: -1.2, region: "EU", history: makeHistory(720, 12) },
    { ticker: "9988.HK", label: "Alibaba", labelAr: "علي بابا", exchange: "HKEX", currency: "HKD", lastPrice: 92.4, changePct: 1.8, region: "ASIA", history: makeHistory(90, 3) },
  ];
  for (const s of stocks) {
    await prisma.marketStock.create({ data: s });
  }

  // -------------------------------------------------------------------
  // SUSTAINABILITY SCORES — last 4 quarters per company
  // -------------------------------------------------------------------
  const periods: Array<{ year: number; period: string }> = [
    { year: 2025, period: "Q3" },
    { year: 2025, period: "Q4" },
    { year: 2026, period: "Q1" },
    { year: 2026, period: "Q2" },
  ];
  for (const c of allCompanies) {
    let envBase = randF(55, 75);
    let socBase = randF(60, 78);
    let govBase = randF(65, 82);
    for (const p of periods) {
      envBase = Math.min(95, envBase + randF(0.5, 3.5));
      socBase = Math.min(95, socBase + randF(0.3, 2.8));
      govBase = Math.min(95, govBase + randF(0.2, 2.0));
      const overall = +((envBase + socBase + govBase) / 3).toFixed(1);
      await prisma.sustainabilityScore.create({
        data: {
          companyId: c.id,
          period: p.period,
          year: p.year,
          environmentalScore: +envBase.toFixed(1),
          socialScore: +socBase.toFixed(1),
          governanceScore: +govBase.toFixed(1),
          overall,
          carbonTons: randF(120, 1800),
          waterCubicM: randF(2000, 25000),
          renewablePct: randF(8, 42),
          notes: c.code === "LORAN" ? "تقدم ملحوظ في الري بالتنقيط الذكي." : c.code === "ARENA" ? "تشغيل أول فندق بمعيار Green Key." : null,
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // ACHIEVEMENTS catalog
  // -------------------------------------------------------------------
  const achievements = [
    { code: "FIRST_LOGIN", name: "أول دخول", nameEn: "First Login", description: "بداية الرحلة في H-Nerve.", tier: "BRONZE", icon: "Sparkles", threshold: 1 },
    { code: "WEEK_STREAK", name: "أسبوع بلا انقطاع", nameEn: "Week Streak", description: "تسجيل دخول لـ 7 أيام متتالية.", tier: "SILVER", icon: "Flame", threshold: 7 },
    { code: "TASK_5", name: "خماسي المهام", nameEn: "5 Tasks Done", description: "إنجاز 5 مهام.", tier: "BRONZE", icon: "CheckCircle2", threshold: 5 },
    { code: "TASK_25", name: "ربعي المهام", nameEn: "25 Tasks Done", description: "إنجاز 25 مهمة.", tier: "SILVER", icon: "CheckCircle2", threshold: 25 },
    { code: "TASK_100", name: "مئوي المهام", nameEn: "100 Tasks Done", description: "إنجاز 100 مهمة — احترافي حقيقي.", tier: "GOLD", icon: "CheckCircle2", threshold: 100 },
    { code: "SIDE_HUSTLE", name: "بطل المهام الجانبية", nameEn: "Side Hustle Hero", description: "إنجاز 10 مهام جانبية بونص.", tier: "GOLD", icon: "Zap", threshold: 10 },
    { code: "RANK_BISHOP", name: "ارتقاء فيل", nameEn: "Bishop Promoted", description: "الوصول إلى رتبة الفيل.", tier: "SILVER", icon: "ChevronsUp", threshold: 51 },
    { code: "RANK_KNIGHT", name: "ارتقاء حصان", nameEn: "Knight Promoted", description: "الوصول إلى رتبة الحصان.", tier: "SILVER", icon: "ChevronsUp", threshold: 151 },
    { code: "RANK_QUEEN", name: "ارتقاء وزير", nameEn: "Queen Promoted", description: "الوصول إلى رتبة الوزير.", tier: "GOLD", icon: "Crown", threshold: 301 },
    { code: "RANK_KING", name: "ارتقاء ملك", nameEn: "King Promoted", description: "أعلى رتبة في النظام — ملك.", tier: "PLATINUM", icon: "Crown", threshold: 500 },
    { code: "INSIGHT_MAKER", name: "صانع إشارات", nameEn: "Insight Maker", description: "نشر 5 إشارات ذكاء.", tier: "SILVER", icon: "Lightbulb", threshold: 5 },
    { code: "FORECAST_MASTER", name: "سيد التوقعات", nameEn: "Forecast Master", description: "اعتماد 20 توقع توريد.", tier: "GOLD", icon: "Brain", threshold: 20 },
  ];
  const ach: Record<string, { id: string }> = {};
  for (const a of achievements) {
    const created = await prisma.achievement.create({ data: a });
    ach[a.code] = created;
  }

  // Award some achievements
  const award = async (userId: string, code: string) => {
    const a = ach[code];
    if (!a) return;
    await prisma.userAchievement.create({ data: { userId, achievementId: a.id } });
  };
  await award(admin.id, "FIRST_LOGIN");
  await award(admin.id, "WEEK_STREAK");
  await award(admin.id, "TASK_25");
  await award(admin.id, "TASK_100");
  await award(admin.id, "SIDE_HUSTLE");
  await award(admin.id, "RANK_BISHOP");
  await award(admin.id, "RANK_KNIGHT");
  await award(admin.id, "RANK_QUEEN");
  await award(admin.id, "RANK_KING");
  await award(admin.id, "INSIGHT_MAKER");
  await award(admin.id, "FORECAST_MASTER");

  await award(ceo.id, "FIRST_LOGIN");
  await award(ceo.id, "WEEK_STREAK");
  await award(ceo.id, "TASK_100");
  await award(ceo.id, "RANK_KING");

  await award(arenaGm.id, "FIRST_LOGIN");
  await award(arenaGm.id, "TASK_25");
  await award(arenaGm.id, "RANK_QUEEN");

  await award(mahaGm.id, "FIRST_LOGIN");
  await award(mahaGm.id, "TASK_25");
  await award(mahaGm.id, "RANK_KNIGHT");

  await award(loranGm.id, "FIRST_LOGIN");
  await award(loranGm.id, "RANK_KNIGHT");

  await award(staffMember.id, "FIRST_LOGIN");
  await award(staffMember.id, "RANK_BISHOP");

  await award(newHire.id, "FIRST_LOGIN");

  // -------------------------------------------------------------------
  // TASKS — gamified work
  // -------------------------------------------------------------------
  const tasks = [
    // Admin (Anas)
    { title: "مراجعة لوحة H-Nerve التنفيذية", kind: "CORE", status: "DONE", priority: "HIGH", module: "DASHBOARD", points: 20, assigneeId: admin.id, completedAt: at(-2, 11), dueAt: at(-2, 18) },
    { title: "تشغيل المحرك التنبؤي وتحقق التنبؤات", kind: "CORE", status: "DONE", priority: "URGENT", module: "SUPPLY", points: 30, assigneeId: admin.id, completedAt: at(-1, 14) },
    { title: "تحديث وثيقة استراتيجية H-Nerve SaaS", kind: "SIDE", status: "IN_PROGRESS", priority: "MEDIUM", module: "PROJECTS", points: 25, assigneeId: admin.id, dueAt: at(7, 18) },
    { title: "إعداد عرض تقديمي لمجلس الإدارة", kind: "CORE", status: "TODO", priority: "URGENT", module: "DASHBOARD", points: 40, assigneeId: admin.id, dueAt: at(3, 10) },
    // CEO
    { title: "اعتماد ميزانية توسعة فنادق العقبة", kind: "CORE", status: "IN_PROGRESS", priority: "URGENT", module: "PROJECTS", points: 50, assigneeId: ceo.id, dueAt: at(5, 15) },
    { title: "اجتماع الشركاء البلغاريين", kind: "CORE", status: "DONE", priority: "HIGH", module: "HOTELS", points: 25, assigneeId: ceo.id, completedAt: at(-3, 16) },
    { title: "مراجعة تقارير ESG ربع سنوية", kind: "CORE", status: "TODO", priority: "MEDIUM", module: "SUSTAINABILITY", points: 20, assigneeId: ceo.id, dueAt: at(10, 17) },
    // Arena GM
    { title: "حملة تسويقية موسم الربيع", kind: "CORE", status: "IN_PROGRESS", priority: "HIGH", module: "HOTELS", points: 30, assigneeId: arenaGm.id, dueAt: at(8, 17) },
    { title: "زيارة فندق صوفيا — تدقيق الجودة", kind: "SIDE", status: "TODO", priority: "MEDIUM", module: "HOTELS", points: 20, assigneeId: arenaGm.id, dueAt: at(14, 12) },
    { title: "تحديث قائمة الأطعمة في البحر الميت", kind: "CORE", status: "DONE", priority: "MEDIUM", module: "HOTELS", points: 15, assigneeId: arenaGm.id, completedAt: at(-1, 12) },
    // Maha GM
    { title: "اختبار خط الجبن البريميوم الجديد", kind: "CORE", status: "IN_PROGRESS", priority: "HIGH", module: "DAIRY", points: 35, assigneeId: mahaGm.id, dueAt: at(6, 16) },
    { title: "تدقيق جودة 12 دفعة هذا الأسبوع", kind: "CORE", status: "TODO", priority: "URGENT", module: "DAIRY", points: 25, assigneeId: mahaGm.id, dueAt: at(2, 18) },
    { title: "اقتراح تنويع منتج الزبادي اليوناني", kind: "SIDE", status: "TODO", priority: "LOW", module: "PROJECTS", points: 20, assigneeId: mahaGm.id, dueAt: at(20, 12) },
    // Loran GM
    { title: "صيانة دفيئة لوران 1 — منظومة الري", kind: "CORE", status: "DONE", priority: "HIGH", module: "FARMS", points: 25, assigneeId: loranGm.id, completedAt: at(-2, 9) },
    { title: "اختبار حساسات IoT الجديدة من Agrify", kind: "SIDE", status: "IN_PROGRESS", priority: "MEDIUM", module: "FARMS", points: 30, assigneeId: loranGm.id, dueAt: at(9, 15) },
    { title: "مراجعة معدلات الحصاد لمحصول البطاطا", kind: "CORE", status: "DONE", priority: "MEDIUM", module: "FARMS", points: 15, assigneeId: loranGm.id, completedAt: at(-4, 13) },
    // Staff
    { title: "إعداد محتوى وسائل التواصل الأسبوعية", kind: "CORE", status: "IN_PROGRESS", priority: "MEDIUM", module: "HOTELS", points: 15, assigneeId: staffMember.id, dueAt: at(2, 15) },
    { title: "تحليل أداء حملة Facebook Ads", kind: "CORE", status: "TODO", priority: "MEDIUM", module: "HOTELS", points: 18, assigneeId: staffMember.id, dueAt: at(4, 14) },
    { title: "مقترح حملة LinkedIn للوفود الخليجية", kind: "SIDE", status: "TODO", priority: "LOW", module: "PROJECTS", points: 22, assigneeId: staffMember.id, dueAt: at(15, 12) },
    // New hire
    { title: "إكمال التدريب التعريفي على H-Nerve", kind: "CORE", status: "IN_PROGRESS", priority: "HIGH", module: "SETTINGS", points: 10, assigneeId: newHire.id, dueAt: at(5, 17) },
    { title: "أول تقرير عن مخزون أحد منتجات المها", kind: "CORE", status: "TODO", priority: "MEDIUM", module: "DAIRY", points: 12, assigneeId: newHire.id, dueAt: at(7, 15) },
  ];
  for (const t of tasks) {
    await prisma.task.create({ data: t });
  }

  // -------------------------------------------------------------------
  // BRAIN IQ HISTORY — rising trajectory for the Brain IQ page.
  // Eight weekly snapshots, starting from 102 and climbing to 127.
  // Components follow a realistic warming curve.
  // -------------------------------------------------------------------
  const iqSnapshots = [
    { weeksAgo: 8, iq: 102, accuracy: 0.42, decisionVelocity: 0.28, outcomeQuality: 0.30, userTrust: 0.50, drivenBy: "accuracy",  note: "Initial calibration — model accuracy improving." },
    { weeksAgo: 7, iq: 107, accuracy: 0.50, decisionVelocity: 0.32, outcomeQuality: 0.35, userTrust: 0.52, drivenBy: "accuracy",  note: "Accuracy lift after first insight batch review." },
    { weeksAgo: 6, iq: 110, accuracy: 0.55, decisionVelocity: 0.40, outcomeQuality: 0.38, userTrust: 0.55, drivenBy: "velocity",  note: "Two council sessions committed in a week." },
    { weeksAgo: 5, iq: 114, accuracy: 0.60, decisionVelocity: 0.48, outcomeQuality: 0.42, userTrust: 0.58, drivenBy: "outcome",   note: "First plan completed on time — outcome quality rising." },
    { weeksAgo: 4, iq: 118, accuracy: 0.65, decisionVelocity: 0.55, outcomeQuality: 0.50, userTrust: 0.62, drivenBy: "trust",     note: "Users enabling more pattern suggestions." },
    { weeksAgo: 3, iq: 121, accuracy: 0.70, decisionVelocity: 0.60, outcomeQuality: 0.56, userTrust: 0.66, drivenBy: "accuracy",  note: "Narrator confidence threshold eased." },
    { weeksAgo: 2, iq: 124, accuracy: 0.74, decisionVelocity: 0.65, outcomeQuality: 0.62, userTrust: 0.70, drivenBy: "velocity",  note: "Arena conference plan fast-tracked by council." },
    { weeksAgo: 0, iq: 127, accuracy: 0.78, decisionVelocity: 0.70, outcomeQuality: 0.68, userTrust: 0.74, drivenBy: "outcome",   note: "All four components above 60% for the first time." },
  ];
  for (const s of iqSnapshots) {
    const snappedAt = at(-s.weeksAgo * 7, 9);
    await prisma.brainIQHistory.create({
      data: {
        scope: "default",
        snappedAt,
        iq: s.iq,
        accuracy: s.accuracy,
        decisionVelocity: s.decisionVelocity,
        outcomeQuality: s.outcomeQuality,
        userTrust: s.userTrust,
        drivenBy: s.drivenBy,
        note: s.note,
      },
    });
  }

  // -------------------------------------------------------------------
  // PLANS — realistic action plans so Brain IQ velocity > 0.
  // Three plans: one DONE, one ACTIVE (committed), one DRAFT.
  // This gives decisionVelocity = 2/3 ≈ 67% (committed / created).
  // -------------------------------------------------------------------
  const plan1 = await prisma.plan.create({
    data: {
      goal: "رفع إشغال أرينا البحر الميت إلى 75% خلال موسم الربيع",
      goalEn: "Lift Arena Dead Sea occupancy to 75% for the spring season",
      rationale: "الإشغال الحالي 58% — تفعيل حملة عائلية مع عروض النهاية الأسبوعية يمكن أن يغلق الفجوة.",
      rationaleEn: "Current occupancy 58% — activating a family campaign with weekend packages can close the gap.",
      targetMetric: "occupancy",
      targetDelta: 0.17,
      targetDeadline: at(45, 18),
      projectedDelta: 0.19,
      confidence: 0.82,
      status: "DONE",
      committedAt: at(-30, 10),
      completedAt: at(-5, 16),
    },
  });
  await prisma.planStep.createMany({
    data: [
      { planId: plan1.id, orderIndex: 1, action: "إطلاق حملة رمضانية عائلية على Instagram + Google Ads", actionEn: "Launch Ramadan family campaign on Instagram + Google Ads", ownerRole: "MARKETING", durationDays: 5, status: "DONE", completedAt: at(-28, 14) },
      { planId: plan1.id, orderIndex: 2, action: "تفعيل باقة عطلة نهاية الأسبوع (إفطار + إقامة) بسعر خاص", actionEn: "Activate weekend package (breakfast + stay) at promotional price", ownerRole: "OPS_HOTEL", durationDays: 3, status: "DONE", completedAt: at(-22, 11) },
      { planId: plan1.id, orderIndex: 3, action: "مراجعة أداء الأسبوع الأول وتعديل الميزانية الإعلانية", actionEn: "Review first-week performance and adjust ad budget", ownerRole: "CFO", durationDays: 2, status: "DONE", completedAt: at(-10, 15) },
    ],
  });

  const plan2 = await prisma.plan.create({
    data: {
      goal: "تخفيض مخاطر انتهاء صلاحية منتجات المها بنسبة 40%",
      goalEn: "Reduce Maha expiry risk by 40% within 30 days",
      rationale: "دفعتان من اللبنة على وشك الانتهاء — تحويل إلى منافذ التجزئة بعروض مخفضة يحمي الهامش ويصفّي المخزون.",
      rationaleEn: "Two labneh batches near expiry — routing to retail with markdown offers protects margin and clears stock.",
      targetMetric: "expiry_risk",
      targetDelta: -0.40,
      targetDeadline: at(20, 18),
      projectedDelta: -0.45,
      confidence: 0.77,
      status: "ACTIVE",
      committedAt: at(-3, 11),
    },
  });
  await prisma.planStep.createMany({
    data: [
      { planId: plan2.id, orderIndex: 1, action: "إشعار فوري لمديري منافذ التجزئة الثلاثة بتخفيض 15%", actionEn: "Immediate notification to 3 retail managers with 15% markdown", ownerRole: "OPS_DAIRY", durationDays: 1, status: "DONE", completedAt: at(-2, 10) },
      { planId: plan2.id, orderIndex: 2, action: "تحويل 200 كغ لبنة إلى عرض ترويجي في أرينا البحر الميت", actionEn: "Route 200 kg labneh to Arena Dead Sea as a buffet promotion", ownerRole: "OPS_HOTEL", durationDays: 2, status: "IN_PROGRESS" },
      { planId: plan2.id, orderIndex: 3, action: "تقرير انتهاء الأزمة وتوصيات لتحسين جدولة الإنتاج", actionEn: "Crisis-end report and production-scheduling improvement recommendations", ownerRole: "CFO", durationDays: 3, status: "PENDING" },
    ],
  });

  await prisma.plan.create({
    data: {
      goal: "نشر لوحة H-Nerve لأول عميل SaaS خارج مجموعة الحوراني",
      goalEn: "Deploy H-Nerve dashboard for first external SaaS client",
      rationale: "الكود قابل للإعداد متعدد المستأجرين — استهداف مجموعة قابضة إقليمية واحدة كـ pilot يثبت النموذج.",
      rationaleEn: "Multi-tenant scaffolding is ready — targeting one regional holding group as pilot proves the model.",
      targetMetric: "revenue",
      targetDelta: 0.12,
      targetDeadline: at(90, 18),
      confidence: 0.65,
      status: "DRAFT",
    },
  });

  // -- Phase 20: the Living Protocol constitution (group-wide, tenantId="default")
  await prisma.protocolClause.createMany({
    data: DEFAULT_PROTOCOL_CLAUSES.map((c) => ({
      tenantId: "default",
      key: c.key,
      title: c.title,
      titleEn: c.titleEn,
      body: c.body,
      bodyEn: c.bodyEn,
      orderIndex: c.orderIndex,
      version: 1,
    })),
  });

  console.log("\n✓ تم زرع بيانات H-Nerve ERP الكاملة بنجاح.\n");
  console.log("بيانات الدخول الرئيسية:");
  console.log("  admin@hourani.jo  / admin123  (ملك ♚, 920 XP)");
  console.log("  ceo@hourani.jo    / admin123  (ملك ♚, 1100 XP)");
  console.log("  staff@hourani.jo  / admin123  (فيل ♝, 95 XP)");
  console.log("  newhire@hourani.jo / admin123 (بيدق ♟, 28 XP)");
  console.log(`\nالشركات: ${allCompanies.length}, المستخدمون: ${users.length}, المشاريع المستقبلية: ${futureProjects.length}, الأسهم: ${stocks.length}\n`);

  // Restore the real Math.random so subsequent imports of this module
  // don't see a seeded PRNG. (Required when the /admin/genesis server
  // action calls seedOperator() inside a live Next.js process.)
  Math.random = _realRandom;
}

// Run only when invoked directly as a CLI script (npx tsx prisma/seed.ts).
// When imported by the seed endpoint, the caller invokes seedOperator().
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  seedOperator()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
