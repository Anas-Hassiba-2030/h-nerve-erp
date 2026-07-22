// Real-entity seed for مجموعة الحوراني — replaces the invented company /
// hotel / farm registry with the group's ACTUAL published structure.
//
// Every fact here is sourced from docs/HOURANI-GROUP-PROFILE.md (public
// sources only, researched 2026-07-22). THREE assumptions in the old seed were
// simply wrong and are corrected here:
//   1. Loran is a FODDER/ANIMAL-FEED company, not crop farms. The group's real
//      farm is a dairy-cattle farm at Al-Hallabat, Zarqa, owned by a DIFFERENT
//      entity (the Jordanian Union for Agricultural & Livestock Investment).
//   2. "The Tank" incubator is UMNIAH's, not the group's. The education arm is
//      AAU + Al-Jami'a Schools + AAUC2 + The Arena.
//   3. There are TWO dairy companies — Al-Maha AND Danish Jordanian Dairy
//      (brand Baladna, plant at Ein Al-Basha).
//
// RULES THIS SCRIPT FOLLOWS:
//   - Nothing is invented. A number we could not verify is left at 0/null
//     rather than filled with a plausible-looking guess. `employees: 0` means
//     "not published", NOT "no staff".
//   - Only ONE ticker is real (JODA, Amman Stock Exchange). The old seed's
//     MAHA.ASE / ARENA.ASE / LORAN.ASE / AAU.ASE / HH.ASE were fabricated and
//     are cleared.
//   - Existing company CODES are preserved where they exist, because
//     COMPANY_CODE_TO_TENANT_SLUG and seeded rows depend on them. Only the
//     facts behind each code are corrected.
//   - Idempotent: safe to re-run. Upserts by code / by (company, name).
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/seed/seed-hourani-real.ts

import { makePrismaClient } from "../_prisma";

export type CompanySeed = {
  code: string;
  name: string;
  nameEn: string;
  sector: string;
  country: string;
  city: string | null;
  foundedYear: number | null;
  ticker: string | null;
  description: string;
  brandColor: string;
};

// ~11 named entities. The group claims 14; the other ~3 are not published, so
// they are not seeded — an invented subsidiary is worse than a short list.
export const COMPANIES: CompanySeed[] = [
  {
    code: "HH",
    name: "الشركة الأردنية المتحدة للاستثمار",
    nameEn: "United Jordanian Company for Investment (JUICO)",
    sector: "INVESTMENT",
    country: "JO",
    city: "عمّان",
    foundedYear: 1979,
    ticker: null,
    brandColor: "slate",
    description:
      "الشركة القابضة لمجموعة الحوراني — سبعة قطاعات وأكثر من 3000 موظف، منذ 1979.",
  },
  {
    code: "ARENA",
    name: "شركة الأرينا للاستثمار الفندقي والسياحي",
    nameEn: "Arena Hotels & Tourism Investment Company",
    sector: "HOSPITALITY",
    country: "JO",
    city: "عمّان",
    foundedYear: null,
    ticker: null,
    brandColor: "amber",
    description: "مالكة فندق أرينا سبيس على شارع الجاردنز في عمّان.",
  },
  {
    code: "SHARQ",
    name: "شركة الشرق للفنادق والمشاريع السياحية",
    nameEn: "Al-Sharq Hotels & Tourism Projects Company",
    sector: "HOSPITALITY",
    country: "JO",
    city: "عمّان",
    foundedYear: null,
    ticker: null,
    brandColor: "amber",
    description:
      "مالكة العقار الفندقي الذي يُشغَّل تحت علامة موفنبيك عمّان (العلامة تشغيلية لأكور، وليست شركة تابعة للمجموعة).",
  },
  {
    code: "ARENABG",
    name: "شركة فنادق الأرينا المحدودة — صوفيا",
    nameEn: "Arena Hotels Ltd. (Sofia, Bulgaria)",
    sector: "HOSPITALITY",
    country: "BG",
    city: "صوفيا",
    foundedYear: null,
    ticker: null,
    brandColor: "amber",
    description: "ثلاثة فنادق في بلغاريا: سموليان، أتلانتيك (فارنا)، زدرافيتس (فيلينغراد).",
  },
  {
    code: "MAHA",
    name: "شركة الألبان الأردنية — المها",
    nameEn: "The Jordanian Dairy Company Ltd. (Al-Maha)",
    sector: "DAIRY",
    country: "JO",
    city: "الرصيفة، الزرقاء",
    foundedYear: 1968,
    // The ONLY genuine ticker in this registry — Amman Stock Exchange.
    ticker: "JODA",
    brandColor: "sky",
    description:
      "شركة مساهمة عامة مدرجة في بورصة عمّان (JODA). ثلاثة مصانع: الألبان، البلاستيك، وتعبئة المياه. نحو 68 صنفاً و39 مركبة توزيع.",
  },
  {
    code: "DJD",
    name: "شركة الألبان الدنماركية الأردنية — بلدنا",
    nameEn: "The Danish Jordanian Dairy Company (Baladna)",
    sector: "DAIRY",
    country: "JO",
    city: "عين الباشا، عمّان",
    foundedYear: 1980,
    ticker: null,
    brandColor: "sky",
    description:
      "أكثر من 60 منتجاً: حليب، ألبان، عصائر، حليب بنكهات، أجبان. عملاء بينهم الملكية الأردنية وسيفوي وكوزمو.",
  },
  {
    code: "LORAN",
    name: "شركة لوران للاستثمار الزراعي والحيواني",
    nameEn: "Loran Company for Agricultural & Livestock Investment",
    sector: "AGRICULTURE",
    country: "JO",
    city: "عمّان",
    foundedYear: 2019,
    ticker: null,
    brandColor: "emerald",
    // The correction that matters most: this is FEED, not farms.
    description:
      "أعلاف وثروة حيوانية — استيراد البرسيم والقش والسيلاج، وزراعة محاصيل علفية محلية. ليست مزارع محاصيل غذائية.",
  },
  {
    code: "UNIONAGRI",
    name: "شركة الاتحاد الأردني للاستثمار الزراعي والحيواني",
    nameEn: "Jordanian Union for Agricultural & Livestock Investment",
    sector: "AGRICULTURE",
    country: "JO",
    city: "الحلابات، الزرقاء",
    foundedYear: null,
    ticker: null,
    brandColor: "emerald",
    description: "مالكة مزرعة الحلابات التي تغذّي شركة الألبان الدنماركية الأردنية (بلدنا).",
  },
  {
    code: "AAU",
    name: "جامعة عمّان الأهلية",
    nameEn: "Al-Ahliyya Amman University",
    sector: "EDUCATION",
    country: "JO",
    city: "عمّان",
    // Licensed 1989, first cohort 1990. We store the licence year and say so.
    foundedYear: 1989,
    ticker: null,
    brandColor: "indigo",
    description:
      "أول جامعة خاصة في الأردن (ترخيص 1989، أول فوج 1990). 33 برنامج بكالوريوس و14 ماجستير، نحو 7000 طالب. تضم مركز الأمن السيبراني والأرينا.",
  },
  {
    code: "JSS",
    name: "مجموعة مدارس الجامعة",
    nameEn: "Al-Jami'a Secondary Schools",
    sector: "EDUCATION",
    country: "JO",
    city: "عمّان",
    foundedYear: 1979,
    ticker: null,
    brandColor: "indigo",
    description: "ثلاثة فروع — الجبيهة، طبربور، تلاع العلي — وأكثر من 5000 طالب.",
  },
  {
    code: "TABAQAT",
    name: "شركة طبقة فحل للخدمات التجارية",
    nameEn: "Tabaqet Fahel for Trading Services",
    sector: "TRADE",
    country: "JO",
    city: "عمّان",
    foundedYear: 2005,
    ticker: null,
    brandColor: "stone",
    description:
      "مجمّع تجاري على شارع الشهيد وصفي التل — أرض 1510 م² ومسطح بناء 2050 م²، مستأجرون بينهم كابيتال بنك.",
  },
  {
    code: "MAHER",
    name: "شركة الماهر للأمن والحماية",
    nameEn: "Al-Maher Company for Security & Protection",
    sector: "TRADE",
    country: "JO",
    city: "عمّان",
    foundedYear: null,
    ticker: null,
    brandColor: "stone",
    description: "خدمات الأمن والحماية — أحد مستأجري مجمّع طبقة فحل.",
  },
];

export type HotelSeed = {
  companyCode: string;
  name: string;
  nameEn: string;
  city: string;
  country: string;
  starRating: number;
  totalRooms: number;
  tier: string;
  description: string;
};

export const HOTELS: HotelSeed[] = [
  {
    companyCode: "SHARQ",
    name: "فندق موفنبيك عمّان",
    nameEn: "Mövenpick Hotel Amman",
    city: "عمّان",
    country: "JO",
    starRating: 5,
    totalRooms: 218, // 200 rooms + 18 suites
    tier: "LUXURY",
    description: "غرب عمّان، على بعد 35 كم من مطار الملكة علياء. 200 غرفة و18 جناحاً.",
  },
  {
    companyCode: "ARENA",
    name: "فندق أرينا سبيس",
    nameEn: "Arena Space Hotel",
    city: "عمّان",
    country: "JO",
    starRating: 4,
    totalRooms: 142,
    tier: "BUSINESS",
    description: "شارع الجاردنز، غرب عمّان.",
  },
  {
    companyCode: "ARENABG",
    name: "فندق سموليان",
    nameEn: "Smolyani Hotel",
    city: "سموليان",
    country: "BG",
    starRating: 5,
    totalRooms: 102, // 4 business apts + 38 hotel apts + 42 double + 18 single
    tier: "LUXURY",
    description: "قرب منتجع بامبوروفو في بلغاريا. شقق عمل وشقق فندقية وغرف مزدوجة ومفردة.",
  },
  {
    companyCode: "ARENABG",
    name: "فندق أتلانتيك",
    nameEn: "Atlantic Hotel",
    city: "فارنا",
    country: "BG",
    starRating: 4,
    totalRooms: 97, // 89 rooms + 8 apartments
    tier: "RESORT",
    description: "على شاطئ فارنا، مساحة 20,000 م². 89 غرفة و8 شقق.",
  },
  {
    companyCode: "ARENABG",
    name: "فندق زدرافيتس ويلنس آند سبا",
    nameEn: "Zdravets Wellness & Spa Hotel",
    city: "فيلينغراد",
    country: "BG",
    starRating: 4,
    totalRooms: 85,
    tier: "RESORT",
    description:
      "على بعد نحو ساعتين من صوفيا، مساحة 24,660 م². مغذّى بينابيع معدنية ومركز صحي معتمد أوروبياً.",
  },
];

// ---------------------------------------------------------------------------
// REPOINT, don't delete.
//
// A database seeded under the old assumptions holds rows that contradict the
// new ones — invented hotels and Loran vegetable farms. The obvious fix is to
// delete them, but prod's four fabricated hotels carry **518 bookings** and the
// Loran plots carry crops; deleting cascades all of it away and guts the demo.
//
// Every one of those rows has a real counterpart, so they are RENAMED onto it
// instead. Same visible outcome (only real entities on screen), zero history
// destroyed. Keyed on the old name, so it is a no-op on a fresh database and
// safe to re-run.
export const HOTEL_REMAP: Record<string, { name: string; toCompany: string }> = {
  "أرينا سبيس عمّان": { name: "فندق أرينا سبيس", toCompany: "ARENA" },
  // The Dead Sea property does not exist; its bookings are re-homed onto the
  // group's flagship Amman property rather than thrown away.
  "أرينا سبيس البحر الميت": { name: "فندق موفنبيك عمّان", toCompany: "SHARQ" },
  // There is no Sofia hotel — Arena Hotels Ltd. is REGISTERED in Sofia. The
  // actual Bulgarian properties are in Smolyan, Varna, and Velingrad.
  "أرينا سبيس صوفيا": { name: "فندق سموليان", toCompany: "ARENABG" },
  "أرينا سبيس فارنا": { name: "فندق أتلانتيك", toCompany: "ARENABG" },
};

// Loran does grow crops — FODDER crops. So the plots stay and become what they
// really are, and the vegetables growing on them become the fodder the company
// actually produces.
export const FARM_REMAP: Record<string, { name: string; type: string; toCompany?: string; location?: string }> = {
  "حظائر لوران للأبقار": {
    name: "مزرعة الحلابات",
    type: "LIVESTOCK",
    toCompany: "UNIONAGRI",
    location: "الحلابات، الزرقاء",
  },
  "دفيئة لوران 1 — الأغوار": { name: "مزارع لوران للمحاصيل العلفية", type: "OPEN_FIELD" },
  "حقول لوران المكشوفة": { name: "حقول لوران العلفية المكشوفة", type: "OPEN_FIELD" },
};

export const CROP_REMAP: Record<string, string> = {
  "طماطم": "برسيم",
  "خيار": "شعير علفي",
  "بطاطا": "ذرة علفية",
  "بصل": "قش وسيلاج",
};

// Correcting the registry is only half the job. A database seeded under the OLD
// assumptions still holds rows that contradict the new ones — invented hotels
// ("أرينا سبيس البحر الميت" is not a real property) and Loran greenhouse/
// open-field farms that encode the exact mistake this seed exists to fix.
// Leaving them produces something worse than either version alone: a registry
// saying "Loran is a feed company" sitting next to four Loran vegetable farms.
//
// Retiring them DELETES rows, and Hotel→Booking / Farm→Crop cascade. So it is
// OFF by default: without the flag the script only REPORTS what contradicts the
// real registry, and a human decides. Pass --retire-unlisted to actually remove.
const RETIRE = process.argv.includes("--retire-unlisted");

async function main() {
  const db = makePrismaClient();
  let created = 0;
  let updated = 0;

  for (const c of COMPANIES) {
    const existing = await db.company.findFirst({ where: { code: c.code } });
    const data = {
      name: c.name,
      nameEn: c.nameEn,
      sector: c.sector,
      country: c.country,
      city: c.city,
      foundedYear: c.foundedYear,
      ticker: c.ticker,
      description: c.description,
      brandColor: c.brandColor,
      // Per-company headcount is NOT published. Left at 0 deliberately —
      // a made-up number on a board screen is worse than a blank one.
      employees: 0,
      status: "ACTIVE",
    };
    if (existing) {
      await db.company.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await db.company.create({ data: { code: c.code, ...data } });
      created++;
    }
  }

  const byCode = new Map(
    (await db.company.findMany({ select: { id: true, code: true } })).map((c) => [c.code, c.id]),
  );

  // Repoint first, so the upsert below matches the remapped names and updates
  // the existing row (with its bookings) instead of creating a duplicate.
  let repointed = 0;
  for (const [oldName, to] of Object.entries(HOTEL_REMAP)) {
    const row = await db.hotel.findFirst({ where: { name: oldName }, select: { id: true } });
    if (!row) continue;
    const already = await db.hotel.findFirst({
      where: { name: to.name, NOT: { id: row.id } },
      select: { id: true },
    });
    // If the real name is already taken by another row, renaming would collide
    // two properties into one identity. Leave it and report rather than merge.
    if (already) {
      console.log(`  ! hotel "${oldName}" not repointed — "${to.name}" already exists`);
      continue;
    }
    // The owner moves too: Movenpick sits under Al-Sharq and the Bulgarian
    // properties under Arena Hotels Ltd., not under the Amman Arena company.
    // Without this the upsert below would not recognise the row and would
    // create a duplicate beside it.
    const owner = byCode.get(to.toCompany);
    await db.hotel.update({
      where: { id: row.id },
      data: { name: to.name, ...(owner ? { companyId: owner } : {}) },
    });
    repointed++;
  }

  for (const [oldName, to] of Object.entries(FARM_REMAP)) {
    const row = await db.farm.findFirst({ where: { name: oldName }, select: { id: true } });
    if (!row) continue;
    const already = await db.farm.findFirst({
      where: { name: to.name, NOT: { id: row.id } },
      select: { id: true },
    });
    if (already) {
      console.log(`  ! farm "${oldName}" not repointed — "${to.name}" already exists`);
      continue;
    }
    const target = to.toCompany ? byCode.get(to.toCompany) : undefined;
    await db.farm.update({
      where: { id: row.id },
      data: {
        name: to.name,
        type: to.type,
        ...(to.location ? { location: to.location } : {}),
        ...(target ? { companyId: target } : {}),
      },
    });
    repointed++;
  }

  for (const [oldName, realName] of Object.entries(CROP_REMAP)) {
    const n = await db.crop.updateMany({ where: { name: oldName }, data: { name: realName } });
    repointed += n.count;
  }

  let hotelsCreated = 0;
  let hotelsUpdated = 0;
  for (const h of HOTELS) {
    const companyId = byCode.get(h.companyCode);
    if (!companyId) throw new Error(`company ${h.companyCode} missing for hotel ${h.nameEn}`);
    // Matched on NAME alone, not (companyId, name): a repointed row may have
    // just changed owner, and a companyId-scoped lookup would miss it and
    // create a duplicate.
    const existing = await db.hotel.findFirst({ where: { name: h.name } });
    const data = {
      companyId,
      name: h.name,
      nameEn: h.nameEn,
      city: h.city,
      country: h.country,
      starRating: h.starRating,
      totalRooms: h.totalRooms,
      tier: h.tier,
      description: h.description,
    };
    if (existing) {
      await db.hotel.update({ where: { id: existing.id }, data });
      hotelsUpdated++;
    } else {
      await db.hotel.create({ data });
      hotelsCreated++;
    }
  }

  // The group's ONE published farm — a dairy-cattle farm, not a crop farm, and
  // owned by the Union entity rather than by Loran.
  const unionId = byCode.get("UNIONAGRI");
  let farmNote = "skipped";
  if (unionId) {
    const name = "مزرعة الحلابات";
    const existing = await db.farm.findFirst({ where: { companyId: unionId, name } });
    const data = {
      companyId: unionId,
      name,
      nameEn: "Al-Hallabat Dairy Farm",
      type: "LIVESTOCK",
      location: "الحلابات، الزرقاء",
      // juico.com says 300 dunums, baladna.com.jo says 320. We store the
      // group's own figure and record the conflict in the description rather
      // than silently picking a winner.
      areaDunum: 300,
      description:
        "مزرعة أبقار حلوب تغذّي بلدنا — 60 طن حليب خام يومياً (28,800 طن سنوياً)، نظاما حلب DeLaval آليان، ومحطة تحلية مياه في الموقع. المساحة 300 دونم حسب موقع المجموعة و320 حسب موقع بلدنا.",
    };
    if (existing) {
      await db.farm.update({ where: { id: existing.id }, data });
      farmNote = "updated";
    } else {
      await db.farm.create({ data });
      farmNote = "created";
    }
  }

  // ---- reconcile: find rows that contradict the real registry ----------
  const realHotelNames = new Set(HOTELS.map((h) => h.name));
  const staleHotels = await db.hotel.findMany({
    where: { company: { sector: "HOSPITALITY" } },
    select: { id: true, name: true, city: true, _count: { select: { bookings: true } } },
  });
  const hotelsToRetire = staleHotels.filter((h) => !realHotelNames.has(h.name));

  // Loran DOES farm — fodder. The repointed fodder plots are legitimate and
  // must not be reported as contradictions.
  const realFarmNames = new Set([
    "مزرعة الحلابات",
    "مزارع لوران للمحاصيل العلفية",
    "حقول لوران العلفية المكشوفة",
  ]);
  const staleFarms = await db.farm.findMany({
    where: { company: { sector: "AGRICULTURE" } },
    select: { id: true, name: true, type: true, _count: { select: { crops: true } } },
  });
  const farmsToRetire = staleFarms.filter((f) => !realFarmNames.has(f.name));

  let retired = "none";
  if (hotelsToRetire.length || farmsToRetire.length) {
    console.log("\n--- Rows that CONTRADICT the real registry ---");
    for (const h of hotelsToRetire) {
      console.log(`  hotel  "${h.name}" (${h.city}) — ${h._count.bookings} bookings would cascade`);
    }
    for (const f of farmsToRetire) {
      console.log(`  farm   "${f.name}" (${f.type}) — ${f._count.crops} crops would cascade`);
    }
    if (RETIRE) {
      await db.hotel.deleteMany({ where: { id: { in: hotelsToRetire.map((h) => h.id) } } });
      await db.farm.deleteMany({ where: { id: { in: farmsToRetire.map((f) => f.id) } } });
      retired = `${hotelsToRetire.length} hotels + ${farmsToRetire.length} farms DELETED`;
    } else {
      retired = "reported only — re-run with --retire-unlisted to delete them";
    }
    console.log("---\n");
  }

  console.log(
    `Hourani real-entity seed: companies ${created} created / ${updated} updated · ` +
      `hotels ${hotelsCreated} created / ${hotelsUpdated} updated · Al-Hallabat farm ${farmNote} · ` +
      `${repointed} legacy rows repointed onto real entities · leftovers: ${retired}`,
  );
  console.log(
    "NOTE: per-company headcounts, SKU-level catalogues, and the chart of accounts " +
      "are NOT public — they must come from the group. See docs/HOURANI-GROUP-PROFILE.md.",
  );
}

// Only auto-run as a script. scripts/build/hourani-seed-to-d1.ts imports the
// constants above to emit the equivalent SQL for the remote D1 database, and
// must not trigger a local seed as a side effect of importing them.
const INVOKED_DIRECTLY = (process.argv[1] ?? "").split("\\").join("/").endsWith("seed-hourani-real.ts");
if (INVOKED_DIRECTLY) {
  main().catch((e) => {
    console.error("Hourani real-entity seed FAILED:", e);
    process.exit(1);
  });
}
