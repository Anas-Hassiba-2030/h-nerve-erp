import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const day = 24 * 60 * 60 * 1000;
const today = new Date();
const at = (offsetDays: number, hour = 12) => {
  const d = new Date(today.getTime() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const ref = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const randF = (min: number, max: number) => +(min + Math.random() * (max - min)).toFixed(2);

async function main() {
  // -- Wipe (FK-safe order)
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

  const users = [admin, ceo, arenaGm, mahaGm, loranGm, staffMember, newHire];

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
  const roomTypes = ["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"];
  const hotels = [arenaAmman, arenaDeadSea, arenaSofia, arenaVarna];
  let bRef = 1;
  for (let i = 0; i < 60; i++) {
    const hotel = hotels[i % hotels.length];
    const startOffset = -20 + Math.floor(Math.random() * 50);
    const nights = 1 + Math.floor(Math.random() * 6);
    const rooms = 1 + Math.floor(Math.random() * 4);
    const room = roomTypes[Math.min(roomTypes.length - 1, Math.floor(Math.random() * (roomTypes.length + 1)))];
    const adrMul = room === "PRESIDENTIAL" ? 3 : room === "SUITE" ? 2 : room === "DELUXE" ? 1.4 : 1;
    const status =
      startOffset + nights < 0 ? "CHECKED_OUT" :
      startOffset <= 0 ? "CHECKED_IN" :
      Math.random() < 0.85 ? "CONFIRMED" : "PENDING";
    await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        reference: ref("BK", bRef++),
        guestName: guests[i % guests.length],
        roomType: room,
        rooms,
        guests: rooms * 2,
        checkIn: at(startOffset, 14),
        checkOut: at(startOffset + nights, 12),
        revenue: Math.round(hotel.baselineADR * adrMul * rooms * nights),
        status,
        notes: i % 7 === 0 ? "VIP — تنبيه استقبال خاص." : null,
      },
    });
  }

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
      { farmId: greenhouseLoran.id, name: "طماطم", variety: "Cherry F1", plantedAt: at(-45, 8), expectedHarvest: at(15, 8), expectedYieldKg: 8000, status: "GROWING" },
      { farmId: greenhouseLoran.id, name: "خيار", variety: "Beit Alpha", plantedAt: at(-30, 8), expectedHarvest: at(10, 8), expectedYieldKg: 5500, status: "GROWING" },
      { farmId: greenhouseAAU.id, name: "فلفل ملون", variety: "Bell Mix", plantedAt: at(-20, 8), expectedHarvest: at(40, 8), expectedYieldKg: 1200, status: "GROWING" },
      { farmId: openFieldLoran.id, name: "بطاطا", variety: "Spunta", plantedAt: at(-90, 8), expectedHarvest: at(-5, 8), actualYieldKg: 22000, expectedYieldKg: 24000, status: "HARVESTED" },
      { farmId: openFieldLoran.id, name: "بصل", variety: "Texas Grano", plantedAt: at(-60, 8), expectedHarvest: at(20, 8), expectedYieldKg: 9000, status: "GROWING" },
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
  // -------------------------------------------------------------------
  let tRef = 1;
  const txCategories = [
    { kind: "REVENUE", category: "حجوزات فندقية", company: arena.id, range: [12000, 95000] },
    { kind: "REVENUE", category: "مبيعات تجزئة - ألبان", company: maha.id, range: [4000, 28000] },
    { kind: "REVENUE", category: "مبيعات الجملة - فنادق المجموعة", company: maha.id, range: [3000, 12000] },
    { kind: "REVENUE", category: "مبيعات خضروات", company: loran.id, range: [2500, 18000] },
    { kind: "REVENUE", category: "رسوم دراسية", company: aau.id, range: [40000, 220000] },
    { kind: "EXPENSE", category: "مواد خام - ألبان", company: maha.id, range: [2000, 14000] },
    { kind: "EXPENSE", category: "أعلاف ماشية", company: loran.id, range: [1500, 9000] },
    { kind: "EXPENSE", category: "رواتب", company: arena.id, range: [25000, 60000] },
    { kind: "EXPENSE", category: "تسويق رقمي", company: arena.id, range: [800, 6500] },
    { kind: "EXPENSE", category: "صيانة دفيئات", company: loran.id, range: [600, 3500] },
    { kind: "TRANSFER", category: "تحويل داخلي - تمويل توسعة", company: hHolding.id, range: [10000, 80000] },
  ];
  for (let i = 0; i < 80; i++) {
    const t = txCategories[i % txCategories.length];
    const [min, max] = t.range;
    const occurredAt = at(-Math.floor(Math.random() * 90), 12);
    await prisma.transaction.create({
      data: {
        companyId: t.company,
        reference: ref("TX", tRef++),
        kind: t.kind,
        category: t.category,
        amount: rand(min, max),
        currency: "JOD",
        description: t.category,
        occurredAt,
        createdById: admin.id,
      },
    });
  }

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

  console.log("\n✓ تم زرع بيانات H-Nerve ERP الكاملة بنجاح.\n");
  console.log("بيانات الدخول الرئيسية:");
  console.log("  admin@hourani.jo  / admin123  (ملك ♚, 920 XP)");
  console.log("  ceo@hourani.jo    / admin123  (ملك ♚, 1100 XP)");
  console.log("  staff@hourani.jo  / admin123  (فيل ♝, 95 XP)");
  console.log("  newhire@hourani.jo / admin123 (بيدق ♟, 28 XP)");
  console.log(`\nالشركات: ${allCompanies.length}, المستخدمون: ${users.length}, المشاريع المستقبلية: ${futureProjects.length}, الأسهم: ${stocks.length}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
