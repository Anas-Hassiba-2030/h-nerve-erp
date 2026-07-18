// prisma/seed-demo.ts
//
// REALISTIC DEMO DATA for the 4 Hourani Group business arms. Designed
// to be safe to run against production Neon: every write is an upsert
// on a unique key (Tenant.slug, TenantTheme.tenantId, TenantPack
// composite, Company.code, Hotel.id (deterministic "demo-…"),
// Booking.reference, Supplier (tenantId,name), Customer (tenantId,name),
// Warehouse (tenantId,code), Product (tenantId,sku,warehouseId),
// PurchaseOrder.poNumber, SalesOrder.soNumber, LedgerAccount
// (tenantId,code), FinancialPeriod (tenantId,year,month),
// JournalEntry.id (deterministic), JournalLine.id (deterministic),
// PurchaseOrderLine.id (deterministic), SalesOrderLine.id (deterministic),
// InventoryMovement.id (deterministic)).
//
// Re-running the script does NOT duplicate rows. It does NOT delete
// anything. It does NOT touch the existing admin@hourani.jo user.
//
//   npm run db:seed-demo
//
// All money is JOD as Prisma.Decimal. All Arabic names use real
// Jordanian and MENA brands. Hotel nightly rates are 80-300 JOD,
// dairy unit prices 0.50-3 JOD, agri 0.40-8.50 JOD.

import { makePrismaClient } from "../_prisma";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = makePrismaClient();

const D = (v: string | number) => new Prisma.Decimal(v);

// ---------------------------------------------------------------------
// 1. Tenants — 4 business arms.
// ---------------------------------------------------------------------
type TenantSeed = {
  slug: string;
  name: string;
  adminEmail: string;
  theme: "heritage" | "ocean" | "ember" | "forest" | "monolith" | "pearl";
  emblem: string;
  packs: ("hospitality" | "dairy" | "agri" | "education" | "finance")[];
};

const TENANTS: TenantSeed[] = [
  {
    slug: "hourani-hotels",
    name: "مجموعة الحوراني — الفنادق",
    adminEmail: "admin@hourani.jo",
    theme: "heritage",
    emblem: "◆",
    packs: ["hospitality", "finance"],
  },
  {
    slug: "maha-dairy",
    name: "ألبان المها",
    adminEmail: "ops@maha.jo",
    theme: "ocean",
    emblem: "◉",
    packs: ["dairy", "finance"],
  },
  {
    slug: "loran-agri",
    name: "لوران للزراعة",
    adminEmail: "ops@loran.jo",
    theme: "forest",
    emblem: "✱",
    packs: ["agri", "finance"],
  },
  {
    slug: "tank-incubator",
    name: "حاضنة The Tank",
    adminEmail: "ops@thetank.jo",
    theme: "ember",
    emblem: "▲",
    packs: ["education", "finance"],
  },
];

// ---------------------------------------------------------------------
// 2. Companies — one per arm. Company is NOT tenant-scoped in the schema
// (no tenantId column on Company); the link is conceptual via sector.
// ---------------------------------------------------------------------
const COMPANIES = [
  {
    code: "HOTELS",
    name: "فنادق الحوراني",
    nameEn: "Hourani Hotels",
    sector: "HOSPITALITY",
    city: "Amman",
    foundedYear: 1998,
    employees: 420,
    brandColor: "ochre",
    description: "3 فنادق في عمّان والعقبة والبحر الميت.",
  },
  {
    code: "MAHA",
    name: "ألبان المها",
    nameEn: "Maha Dairy",
    sector: "DAIRY",
    city: "Amman",
    foundedYear: 2004,
    employees: 165,
    brandColor: "cyan",
    description: "منتجات الألبان الطازجة من مصنع عمّان.",
  },
  {
    code: "LORAN",
    name: "لوران للزراعة",
    nameEn: "Loran Agriculture",
    sector: "AGRICULTURE",
    city: "Karama",
    foundedYear: 2011,
    employees: 95,
    brandColor: "forest",
    description: "مزارع في غور الأردن — خضار وزيتون وتمور.",
  },
  {
    code: "TANK",
    name: "حاضنة The Tank",
    nameEn: "Tank Incubator",
    sector: "EDUCATION",
    city: "Amman",
    foundedYear: 2018,
    employees: 24,
    brandColor: "ember",
    description: "حاضنة أعمال في جامعة عمّان الأهلية.",
  },
];

// ---------------------------------------------------------------------
// 3. Hotels — 3 properties.
// ---------------------------------------------------------------------
const HOTELS = [
  {
    id: "demo-hotel-amman",
    companyCode: "HOTELS",
    name: "فندق الحوراني عمّان",
    nameEn: "Hourani Amman Hotel",
    city: "Amman",
    tier: "BUSINESS",
    totalRooms: 180,
    starRating: 4,
    baselineADR: 120,
    description: "فندق أعمال في وسط عمّان قرب الدوار الثالث.",
  },
  {
    id: "demo-hotel-aqaba",
    companyCode: "HOTELS",
    name: "منتجع الحوراني العقبة",
    nameEn: "Hourani Aqaba Resort",
    city: "Aqaba",
    tier: "RESORT",
    totalRooms: 240,
    starRating: 5,
    baselineADR: 180,
    description: "منتجع شاطئي على البحر الأحمر.",
  },
  {
    id: "demo-hotel-deadsea",
    companyCode: "HOTELS",
    name: "منتجع الحوراني البحر الميت",
    nameEn: "Hourani Dead Sea Resort",
    city: "Dead Sea",
    tier: "LUXURY",
    totalRooms: 120,
    starRating: 5,
    baselineADR: 240,
    description: "منتجع علاجي على شاطئ البحر الميت.",
  },
];

// ---------------------------------------------------------------------
// 4. Warehouses — one per major location, tenant-scoped.
// ---------------------------------------------------------------------
const WAREHOUSES = [
  { tenantSlug: "hourani-hotels", code: "AMM-A", name: "مستودع عمّان الرئيسي", type: "MAIN", address: "عمّان — الدوار الثالث" },
  { tenantSlug: "hourani-hotels", code: "AQB-A", name: "مستودع العقبة", type: "MAIN", address: "العقبة — شارع الكورنيش" },
  { tenantSlug: "maha-dairy",     code: "AMM-D", name: "مستودع المها المبرّد", type: "COLD", address: "عمّان — المنطقة الصناعية" },
  { tenantSlug: "loran-agri",     code: "JV-A",  name: "مزرعة غور الأردن",     type: "DRY",  address: "كرامة — غور الأردن" },
  { tenantSlug: "tank-incubator", code: "AAU-T", name: "مستودع حاضنة The Tank", type: "DRY",  address: "عمّان — جامعة عمّان الأهلية" },
];

// ---------------------------------------------------------------------
// 5. Suppliers — 10 across the 4 tenants, MENA-realistic.
// ---------------------------------------------------------------------
const SUPPLIERS = [
  { tenantSlug: "maha-dairy",     name: "تترا باك السعودية",       email: "orders@tetrapak-sa.com",   phone: "+966-11-2671100", address: "الرياض — المنطقة الصناعية", paymentTerms: "Net 30" },
  { tenantSlug: "maha-dairy",     name: "قطع الغيار المتحدة عمّان", email: "sales@united-spare.jo",    phone: "+962-6-5654321",  address: "عمّان — وادي صقرة",         paymentTerms: "Net 30" },
  { tenantSlug: "maha-dairy",     name: "حياة سو تركيا",            email: "export@hayatsu.com.tr",    phone: "+90-216-5781000", address: "إسطنبول — تركيا",            paymentTerms: "Prepaid" },
  { tenantSlug: "hourani-hotels", name: "موفنبيك المنسوجات",        email: "linens@movenpick-mea.com", phone: "+971-4-4385000",  address: "دبي — الإمارات",              paymentTerms: "Net 45" },
  { tenantSlug: "hourani-hotels", name: "مستلزمات الضيافة القاهرة",  email: "orders@hospitalitycairo.eg", phone: "+20-2-25785544", address: "القاهرة — المعادي",         paymentTerms: "Net 30" },
  { tenantSlug: "hourani-hotels", name: "أرامكو لزيوت التشغيل",     email: "b2b@aramco-lubes.com",     phone: "+966-13-8800000", address: "الظهران — السعودية",          paymentTerms: "Net 60" },
  { tenantSlug: "loran-agri",     name: "حصاد الأردن للأعلاف",      email: "sales@hassad.jo",          phone: "+962-6-4641122",  address: "الزرقاء — الأردن",            paymentTerms: "Net 30" },
  { tenantSlug: "loran-agri",     name: "أجري برو مصر",             email: "orders@agripro.eg",         phone: "+20-2-26741212",  address: "القاهرة — مصر",               paymentTerms: "Net 45" },
  { tenantSlug: "loran-agri",     name: "دمير للبيوت المحمية",      email: "info@demir-greenhouse.tr", phone: "+90-242-3215050", address: "أنطاليا — تركيا",            paymentTerms: "Prepaid" },
  { tenantSlug: "tank-incubator", name: "كامبريدج بريس الأردن",     email: "orders@cambridge.jo",      phone: "+962-6-5677788",  address: "عمّان — الشميساني",          paymentTerms: "Net 30" },
];

// ---------------------------------------------------------------------
// 6. Customers — 10 across the 4 tenants. Hotel B2B side (group bookings,
// tour ops, airline crew rooming) + retail buyers for dairy/agri.
// ---------------------------------------------------------------------
const CUSTOMERS = [
  { tenantSlug: "maha-dairy",     name: "كارفور الأردن",          email: "purchasing@carrefour.jo", phone: "+962-6-5803333", address: "عمّان — سيتي مول",        paymentTerms: "Net 30" },
  { tenantSlug: "maha-dairy",     name: "كوزمو ماركت",            email: "supply@cozmo.jo",          phone: "+962-6-5666700", address: "عمّان — عبدون",             paymentTerms: "Net 30" },
  { tenantSlug: "maha-dairy",     name: "محمود مول الفود كورت",    email: "fb@mahmoud-mall.jo",       phone: "+962-6-4612000", address: "عمّان — جبل عمّان",         paymentTerms: "Net 45" },
  { tenantSlug: "hourani-hotels", name: "الملكية الأردنية — الطواقم", email: "crewstay@rj.com",         phone: "+962-6-5100000", address: "عمّان — مطار الملكة علياء", paymentTerms: "Net 60" },
  { tenantSlug: "hourani-hotels", name: "مكتب العقبة للسياحة",      email: "groups@aqabatours.jo",     phone: "+962-3-2017200", address: "العقبة — كورنيش",           paymentTerms: "Net 30" },
  { tenantSlug: "hourani-hotels", name: "مقهى ريم",                 email: "orders@reem-cafe.jo",      phone: "+962-79-5550101",address: "عمّان — جبل اللويبدة",      paymentTerms: "Net 15" },
  { tenantSlug: "loran-agri",     name: "مجموعة فايف ستارز للمطاعم",email: "purchasing@5stars.jo",     phone: "+962-6-5550900", address: "عمّان — عبدون",             paymentTerms: "Net 30" },
  { tenantSlug: "loran-agri",     name: "المناصير مارت",             email: "supply@manaseer.com",      phone: "+962-6-5677700", address: "عمّان — وسط البلد",         paymentTerms: "Net 30" },
  { tenantSlug: "tank-incubator", name: "كلية إدارة الأعمال — الأهلية",email: "admin@aau.edu.jo",        phone: "+962-6-5500211", address: "عمّان — جامعة الأهلية",     paymentTerms: "Net 60" },
  { tenantSlug: "tank-incubator", name: "مركز الابتكار في PSUT",     email: "innovation@psut.edu.jo",   phone: "+962-6-5359949", address: "عمّان — جامعة الأميرة سمية",paymentTerms: "Net 60" },
];

// ---------------------------------------------------------------------
// 7. Products — 22 SKUs across the 4 sectors.
// ---------------------------------------------------------------------
type ProductSeed = {
  tenantSlug: string;
  warehouseCode: string;
  supplierName?: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: string;
  reorderPoint?: number;
};

const PRODUCTS: ProductSeed[] = [
  // ---- Maha Dairy ----
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "تترا باك السعودية", sku: "DAIRY-001", name: "لبن المها 1ل",          quantity: 1200, unitCost: "0.55", reorderPoint: 300 },
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "تترا باك السعودية", sku: "DAIRY-002", name: "حليب المها الطازج 1ل",  quantity: 1800, unitCost: "0.45", reorderPoint: 400 },
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "حياة سو تركيا",     sku: "DAIRY-003", name: "جبنة حلوم المها 250غ",   quantity:  600, unitCost: "1.70", reorderPoint: 150 },
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "تترا باك السعودية", sku: "DAIRY-004", name: "لبنة المها 500غ",        quantity:  900, unitCost: "1.10", reorderPoint: 200 },
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "قطع الغيار المتحدة عمّان", sku: "DAIRY-005", name: "جميد عجلون 1كغ",   quantity:  240, unitCost: "2.20", reorderPoint:  80 },
  { tenantSlug: "maha-dairy", warehouseCode: "AMM-D", supplierName: "حياة سو تركيا",     sku: "DAIRY-006", name: "قشطة المها 200غ",        quantity:  380, unitCost: "1.30", reorderPoint: 100 },

  // ---- Hourani Hotels ----
  { tenantSlug: "hourani-hotels", warehouseCode: "AMM-A", supplierName: "مستلزمات الضيافة القاهرة", sku: "HOTEL-001", name: "صابون توالت فاخر",          quantity: 5400, unitCost: "0.18", reorderPoint: 1000 },
  { tenantSlug: "hourani-hotels", warehouseCode: "AMM-A", supplierName: "موفنبيك المنسوجات",         sku: "HOTEL-002", name: "مناشف غرف ضيوف",            quantity:  820, unitCost: "4.20", reorderPoint:  200 },
  { tenantSlug: "hourani-hotels", warehouseCode: "AMM-A", supplierName: "مستلزمات الضيافة القاهرة", sku: "HOTEL-003", name: "ماء معدني 0.5ل عبوة",       quantity: 9600, unitCost: "0.12", reorderPoint: 2000 },
  { tenantSlug: "hourani-hotels", warehouseCode: "AQB-A", supplierName: "موفنبيك المنسوجات",         sku: "HOTEL-004", name: "ملاءات سرير قطن مصري",     quantity:  340, unitCost: "8.50", reorderPoint:  100 },
  { tenantSlug: "hourani-hotels", warehouseCode: "AMM-A", supplierName: "مستلزمات الضيافة القاهرة", sku: "HOTEL-005", name: "قهوة عربية 250غ",          quantity:  560, unitCost: "3.40", reorderPoint:  150 },
  { tenantSlug: "hourani-hotels", warehouseCode: "AQB-A", supplierName: "أرامكو لزيوت التشغيل",     sku: "HOTEL-006", name: "منظف غرف صناعي 5ل",        quantity:  220, unitCost: "6.80", reorderPoint:   60 },

  // ---- Loran Agri ----
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "أجري برو مصر",        sku: "AGRI-001", name: "طماطم بلدية كغ",       quantity: 4200, unitCost: "0.22", reorderPoint: 800 },
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "أجري برو مصر",        sku: "AGRI-002", name: "خيار بيتي كغ",         quantity: 2800, unitCost: "0.18", reorderPoint: 600 },
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "حصاد الأردن للأعلاف", sku: "AGRI-003", name: "زيت زيتون لوران 1ل",  quantity:  680, unitCost: "5.80", reorderPoint: 150 },
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "حصاد الأردن للأعلاف", sku: "AGRI-004", name: "تمر مجدول 1كغ",        quantity:  340, unitCost: "3.20", reorderPoint:  80 },
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "دمير للبيوت المحمية",  sku: "AGRI-005", name: "فلفل حلو كغ",          quantity: 1900, unitCost: "0.32", reorderPoint: 400 },
  { tenantSlug: "loran-agri", warehouseCode: "JV-A", supplierName: "أجري برو مصر",        sku: "AGRI-006", name: "بطاطا أردنية كغ",      quantity: 3600, unitCost: "0.20", reorderPoint: 700 },

  // ---- Tank Incubator ----
  { tenantSlug: "tank-incubator", warehouseCode: "AAU-T", supplierName: "كامبريدج بريس الأردن", sku: "EDU-001", name: "كتاب ريادة الأعمال",      quantity: 320, unitCost: "12.00", reorderPoint: 80 },
  { tenantSlug: "tank-incubator", warehouseCode: "AAU-T", supplierName: "كامبريدج بريس الأردن", sku: "EDU-002", name: "حقيبة طالب الحاضنة",    quantity: 180, unitCost: "8.50",  reorderPoint: 50 },
  { tenantSlug: "tank-incubator", warehouseCode: "AAU-T", supplierName: "كامبريدج بريس الأردن", sku: "EDU-003", name: "دفاتر تدريب 30 ورقة",   quantity: 950, unitCost: "0.95",  reorderPoint: 200 },
  { tenantSlug: "tank-incubator", warehouseCode: "AAU-T", supplierName: "كامبريدج بريس الأردن", sku: "EDU-004", name: "أقلام تخطيط ١٢ علبة",   quantity: 420, unitCost: "2.10",  reorderPoint: 100 },
];

// ---------------------------------------------------------------------
// 8. Purchase Orders — 12. Mix of statuses.
//    Each line uses {sku, qty, unitCost} so the seed can resolve the
//    Product row at write time. RECEIVED orders also seed receivedQty
//    and write a matching RECEIVED InventoryMovement + JournalEntry.
// ---------------------------------------------------------------------
type POSeed = {
  tenantSlug: string;
  poNumber: string;
  supplierName: string;
  status: "DRAFT" | "SENT" | "RECEIVED";
  orderedDaysAgo: number;
  expectedDaysFromNow?: number;
  note?: string;
  lines: { sku: string; qty: number; unitCost: string }[];
};

const PURCHASE_ORDERS: POSeed[] = [
  { tenantSlug: "maha-dairy", poNumber: "PO-MAHA-001", supplierName: "تترا باك السعودية", status: "RECEIVED", orderedDaysAgo: 28, expectedDaysFromNow: -21,
    lines: [{ sku: "DAIRY-001", qty: 400, unitCost: "0.55" }, { sku: "DAIRY-002", qty: 600, unitCost: "0.45" }] },
  { tenantSlug: "maha-dairy", poNumber: "PO-MAHA-002", supplierName: "حياة سو تركيا", status: "RECEIVED", orderedDaysAgo: 18,
    lines: [{ sku: "DAIRY-003", qty: 200, unitCost: "1.70" }, { sku: "DAIRY-006", qty: 150, unitCost: "1.30" }] },
  { tenantSlug: "maha-dairy", poNumber: "PO-MAHA-003", supplierName: "قطع الغيار المتحدة عمّان", status: "SENT", orderedDaysAgo: 5, expectedDaysFromNow: 12,
    lines: [{ sku: "DAIRY-005", qty: 80, unitCost: "2.20" }] },

  { tenantSlug: "hourani-hotels", poNumber: "PO-HTL-001", supplierName: "مستلزمات الضيافة القاهرة", status: "RECEIVED", orderedDaysAgo: 35,
    lines: [{ sku: "HOTEL-001", qty: 2000, unitCost: "0.18" }, { sku: "HOTEL-003", qty: 3000, unitCost: "0.12" }] },
  { tenantSlug: "hourani-hotels", poNumber: "PO-HTL-002", supplierName: "موفنبيك المنسوجات", status: "RECEIVED", orderedDaysAgo: 22,
    lines: [{ sku: "HOTEL-002", qty: 300, unitCost: "4.20" }, { sku: "HOTEL-004", qty: 120, unitCost: "8.50" }] },
  { tenantSlug: "hourani-hotels", poNumber: "PO-HTL-003", supplierName: "أرامكو لزيوت التشغيل", status: "SENT", orderedDaysAgo: 6, expectedDaysFromNow: 10,
    lines: [{ sku: "HOTEL-006", qty: 80, unitCost: "6.80" }] },
  { tenantSlug: "hourani-hotels", poNumber: "PO-HTL-004", supplierName: "مستلزمات الضيافة القاهرة", status: "DRAFT", orderedDaysAgo: 1,
    lines: [{ sku: "HOTEL-005", qty: 200, unitCost: "3.40" }] },

  { tenantSlug: "loran-agri", poNumber: "PO-LRN-001", supplierName: "أجري برو مصر", status: "RECEIVED", orderedDaysAgo: 30,
    lines: [{ sku: "AGRI-001", qty: 1500, unitCost: "0.22" }, { sku: "AGRI-002", qty: 1000, unitCost: "0.18" }] },
  { tenantSlug: "loran-agri", poNumber: "PO-LRN-002", supplierName: "حصاد الأردن للأعلاف", status: "RECEIVED", orderedDaysAgo: 15,
    lines: [{ sku: "AGRI-003", qty: 300, unitCost: "5.80" }, { sku: "AGRI-004", qty: 120, unitCost: "3.20" }] },
  { tenantSlug: "loran-agri", poNumber: "PO-LRN-003", supplierName: "دمير للبيوت المحمية", status: "DRAFT", orderedDaysAgo: 2,
    lines: [{ sku: "AGRI-005", qty: 600, unitCost: "0.32" }] },

  { tenantSlug: "tank-incubator", poNumber: "PO-TNK-001", supplierName: "كامبريدج بريس الأردن", status: "RECEIVED", orderedDaysAgo: 40,
    lines: [{ sku: "EDU-001", qty: 150, unitCost: "12.00" }, { sku: "EDU-003", qty: 500, unitCost: "0.95" }] },
  { tenantSlug: "tank-incubator", poNumber: "PO-TNK-002", supplierName: "كامبريدج بريس الأردن", status: "SENT", orderedDaysAgo: 8, expectedDaysFromNow: 8,
    lines: [{ sku: "EDU-002", qty: 80, unitCost: "8.50" }] },
];

// ---------------------------------------------------------------------
// 9. Sales Orders — 12. Mix of statuses.
// ---------------------------------------------------------------------
type SOSeed = {
  tenantSlug: string;
  soNumber: string;
  customerName: string;
  status: "DRAFT" | "CONFIRMED" | "FULFILLED";
  orderedDaysAgo: number;
  requiredDaysFromNow?: number;
  lines: { sku: string; qty: number; unitPrice: string }[];
};

const SALES_ORDERS: SOSeed[] = [
  { tenantSlug: "maha-dairy", soNumber: "SO-MAHA-001", customerName: "كارفور الأردن", status: "FULFILLED", orderedDaysAgo: 25,
    lines: [{ sku: "DAIRY-001", qty: 300, unitPrice: "1.10" }, { sku: "DAIRY-002", qty: 450, unitPrice: "0.95" }] },
  { tenantSlug: "maha-dairy", soNumber: "SO-MAHA-002", customerName: "كوزمو ماركت", status: "FULFILLED", orderedDaysAgo: 14,
    lines: [{ sku: "DAIRY-003", qty: 120, unitPrice: "2.80" }, { sku: "DAIRY-004", qty: 200, unitPrice: "1.80" }] },
  { tenantSlug: "maha-dairy", soNumber: "SO-MAHA-003", customerName: "محمود مول الفود كورت", status: "FULFILLED", orderedDaysAgo: 7,
    lines: [{ sku: "DAIRY-005", qty: 40, unitPrice: "3.00" }, { sku: "DAIRY-006", qty: 60, unitPrice: "2.20" }] },
  { tenantSlug: "maha-dairy", soNumber: "SO-MAHA-004", customerName: "كارفور الأردن", status: "CONFIRMED", orderedDaysAgo: 2, requiredDaysFromNow: 5,
    lines: [{ sku: "DAIRY-001", qty: 200, unitPrice: "1.10" }] },

  { tenantSlug: "hourani-hotels", soNumber: "SO-HTL-001", customerName: "الملكية الأردنية — الطواقم", status: "FULFILLED", orderedDaysAgo: 20,
    lines: [{ sku: "HOTEL-001", qty: 500, unitPrice: "0.40" }, { sku: "HOTEL-003", qty: 800, unitPrice: "0.30" }] },
  { tenantSlug: "hourani-hotels", soNumber: "SO-HTL-002", customerName: "مكتب العقبة للسياحة", status: "FULFILLED", orderedDaysAgo: 11,
    lines: [{ sku: "HOTEL-002", qty: 80, unitPrice: "9.50" }, { sku: "HOTEL-004", qty: 40, unitPrice: "18.00" }] },
  { tenantSlug: "hourani-hotels", soNumber: "SO-HTL-003", customerName: "مقهى ريم", status: "CONFIRMED", orderedDaysAgo: 3, requiredDaysFromNow: 7,
    lines: [{ sku: "HOTEL-005", qty: 50, unitPrice: "7.50" }] },
  { tenantSlug: "hourani-hotels", soNumber: "SO-HTL-004", customerName: "مكتب العقبة للسياحة", status: "DRAFT", orderedDaysAgo: 1,
    lines: [{ sku: "HOTEL-006", qty: 20, unitPrice: "14.00" }] },

  { tenantSlug: "loran-agri", soNumber: "SO-LRN-001", customerName: "مجموعة فايف ستارز للمطاعم", status: "FULFILLED", orderedDaysAgo: 18,
    lines: [{ sku: "AGRI-001", qty: 500, unitPrice: "0.45" }, { sku: "AGRI-002", qty: 350, unitPrice: "0.40" }] },
  { tenantSlug: "loran-agri", soNumber: "SO-LRN-002", customerName: "المناصير مارت", status: "FULFILLED", orderedDaysAgo: 9,
    lines: [{ sku: "AGRI-003", qty: 100, unitPrice: "8.50" }, { sku: "AGRI-004", qty: 60, unitPrice: "4.00" }] },

  { tenantSlug: "tank-incubator", soNumber: "SO-TNK-001", customerName: "كلية إدارة الأعمال — الأهلية", status: "FULFILLED", orderedDaysAgo: 32,
    lines: [{ sku: "EDU-001", qty: 60, unitPrice: "22.00" }, { sku: "EDU-003", qty: 200, unitPrice: "2.00" }] },
  { tenantSlug: "tank-incubator", soNumber: "SO-TNK-002", customerName: "مركز الابتكار في PSUT", status: "DRAFT", orderedDaysAgo: 4,
    lines: [{ sku: "EDU-002", qty: 30, unitPrice: "16.00" }] },
];

// ---------------------------------------------------------------------
// 10. Bookings — 8 across the 3 hotels. realistic check-in/out, 80-300/night.
// ---------------------------------------------------------------------
const BOOKINGS = [
  { hotelId: "demo-hotel-amman",  reference: "DEMO-BK-AMM-001", guestName: "خالد العمري",         roomType: "DELUXE",    rooms: 1, guests: 2, checkInDaysFromNow: -7,  nights: 3, nightly: 130, status: "COMPLETED" },
  { hotelId: "demo-hotel-amman",  reference: "DEMO-BK-AMM-002", guestName: "Sara Hourani",        roomType: "STANDARD",  rooms: 2, guests: 4, checkInDaysFromNow: -3,  nights: 2, nightly: 110, status: "COMPLETED" },
  { hotelId: "demo-hotel-amman",  reference: "DEMO-BK-AMM-003", guestName: "محمد الحمصي",         roomType: "SUITE",     rooms: 1, guests: 2, checkInDaysFromNow:  5,  nights: 4, nightly: 200, status: "CONFIRMED" },
  { hotelId: "demo-hotel-amman",  reference: "DEMO-BK-AMM-004", guestName: "Ahmed Tarawneh",      roomType: "STANDARD",  rooms: 1, guests: 1, checkInDaysFromNow: 12,  nights: 1, nightly:  95, status: "CONFIRMED" },
  { hotelId: "demo-hotel-aqaba",  reference: "DEMO-BK-AQB-001", guestName: "Linda Marshall",      roomType: "OCEAN_VIEW",rooms: 1, guests: 2, checkInDaysFromNow: -10, nights: 5, nightly: 220, status: "COMPLETED" },
  { hotelId: "demo-hotel-aqaba",  reference: "DEMO-BK-AQB-002", guestName: "سامي القرعان",        roomType: "FAMILY",    rooms: 2, guests: 5, checkInDaysFromNow:  8,  nights: 4, nightly: 180, status: "CONFIRMED" },
  { hotelId: "demo-hotel-aqaba",  reference: "DEMO-BK-AQB-003", guestName: "Erica Yilmaz",        roomType: "OCEAN_VIEW",rooms: 1, guests: 2, checkInDaysFromNow: 18,  nights: 3, nightly: 250, status: "CONFIRMED" },
  { hotelId: "demo-hotel-deadsea",reference: "DEMO-BK-DS-001",  guestName: "Robert Klein",        roomType: "SPA_SUITE", rooms: 1, guests: 2, checkInDaysFromNow:  3,  nights: 2, nightly: 300, status: "CONFIRMED" },
];

// ---------------------------------------------------------------------
// 11. Chart of accounts — same 8 codes per tenant.
// ---------------------------------------------------------------------
const COA = [
  { code: "1001", name: "المخزون",                type: "ASSET" },
  { code: "1101", name: "النقد",                  type: "ASSET" },
  { code: "1201", name: "ذمم العملاء",            type: "ASSET" },
  { code: "2001", name: "ذمم الموردين",           type: "LIABILITY" },
  { code: "3001", name: "أرباح محتجزة",            type: "EQUITY" },
  { code: "4001", name: "إيرادات المبيعات",        type: "REVENUE" },
  { code: "5001", name: "كلفة البضاعة المباعة",    type: "COGS" },
  { code: "5002", name: "تسويات المخزون",         type: "EXPENSE" },
] as const;

const A = {
  INVENTORY: "1001", CASH: "1101", AR: "1201", AP: "2001",
  RE: "3001", REVENUE: "4001", COGS: "5001", INV_ADJ: "5002",
} as const;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

// Deterministic id helper so re-runs upsert the same row.
const did = (...parts: (string | number)[]) => `demo-${parts.join("-")}`;

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------
async function main() {
  console.log("• Seeding demo data against current DATABASE_URL …\n");

  // ===== Tenants + Theme + Packs =====
  const tenantBySlug = new Map<string, { id: string }>();
  for (const t of TENANTS) {
    const row = await prisma.tenant.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug, name: t.name, adminEmail: t.adminEmail,
        region: "MENA", tier: "standard", status: "ACTIVE",
        activatedAt: new Date(),
      },
      update: { name: t.name, adminEmail: t.adminEmail, status: "ACTIVE" },
    });
    tenantBySlug.set(t.slug, { id: row.id });

    await prisma.tenantTheme.upsert({
      where: { tenantId: row.id },
      create: { tenantId: row.id, preset: t.theme, emblem: t.emblem },
      update: { preset: t.theme, emblem: t.emblem },
    });

    for (const pk of t.packs) {
      await prisma.tenantPack.upsert({
        where: { tenantId_packKey: { tenantId: row.id, packKey: pk } },
        create: { tenantId: row.id, packKey: pk, enabled: true },
        update: { enabled: true },
      });
    }
  }
  const tenants = await prisma.tenant.count();

  // ===== Companies =====
  const companyByCode = new Map<string, { id: string }>();
  for (const c of COMPANIES) {
    const row = await prisma.company.upsert({
      where: { code: c.code },
      create: c,
      update: {
        name: c.name, nameEn: c.nameEn, sector: c.sector, city: c.city,
        foundedYear: c.foundedYear, employees: c.employees,
        brandColor: c.brandColor, description: c.description,
        status: "ACTIVE",
      },
    });
    companyByCode.set(c.code, { id: row.id });
  }

  // ===== Hotels =====
  for (const h of HOTELS) {
    const co = companyByCode.get(h.companyCode)!;
    await prisma.hotel.upsert({
      where: { id: h.id },
      create: { id: h.id, companyId: co.id, name: h.name, nameEn: h.nameEn, city: h.city, tier: h.tier, totalRooms: h.totalRooms, starRating: h.starRating, baselineADR: h.baselineADR, description: h.description },
      update: { companyId: co.id, name: h.name, nameEn: h.nameEn, city: h.city, tier: h.tier, totalRooms: h.totalRooms, starRating: h.starRating, baselineADR: h.baselineADR, description: h.description },
    });
  }

  // ===== Warehouses =====
  const warehouseByCode = new Map<string, { id: string }>(); // key = tenantSlug + ":" + code
  for (const w of WAREHOUSES) {
    const tn = tenantBySlug.get(w.tenantSlug)!;
    const row = await prisma.warehouse.upsert({
      where: { tenantId_code: { tenantId: w.tenantSlug, code: w.code } },
      create: { tenantId: w.tenantSlug, code: w.code, name: w.name, type: w.type, address: w.address, active: true },
      update: { name: w.name, type: w.type, address: w.address, active: true },
    });
    warehouseByCode.set(`${w.tenantSlug}:${w.code}`, { id: row.id });
    void tn;
  }

  // ===== Suppliers =====
  const supplierByName = new Map<string, { id: string }>(); // key = tenantSlug + ":" + name
  for (const s of SUPPLIERS) {
    const row = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId: s.tenantSlug, name: s.name } },
      create: { tenantId: s.tenantSlug, name: s.name, email: s.email, phone: s.phone, address: s.address, paymentTerms: s.paymentTerms },
      update: { email: s.email, phone: s.phone, address: s.address, paymentTerms: s.paymentTerms },
    });
    supplierByName.set(`${s.tenantSlug}:${s.name}`, { id: row.id });
  }

  // ===== Customers =====
  const customerByName = new Map<string, { id: string }>(); // key = tenantSlug + ":" + name
  for (const c of CUSTOMERS) {
    const row = await prisma.customer.upsert({
      where: { tenantId_name: { tenantId: c.tenantSlug, name: c.name } },
      create: { tenantId: c.tenantSlug, name: c.name, email: c.email, phone: c.phone, address: c.address, paymentTerms: c.paymentTerms },
      update: { email: c.email, phone: c.phone, address: c.address, paymentTerms: c.paymentTerms },
    });
    customerByName.set(`${c.tenantSlug}:${c.name}`, { id: row.id });
  }

  // ===== Chart of accounts (per tenant) =====
  const accByTenantCode = new Map<string, { id: string }>(); // key = tenantSlug + ":" + code
  for (const t of TENANTS) {
    for (const a of COA) {
      const row = await prisma.ledgerAccount.upsert({
        where: { tenantId_code: { tenantId: t.slug, code: a.code } },
        create: { tenantId: t.slug, code: a.code, name: a.name, type: a.type, active: true },
        update: { name: a.name, type: a.type, active: true },
      });
      accByTenantCode.set(`${t.slug}:${a.code}`, { id: row.id });
    }
  }

  // ===== Products =====
  const productBySku = new Map<string, { id: string; warehouseId: string; tenantSlug: string; unitCost: string }>();
  for (const p of PRODUCTS) {
    const wh = warehouseByCode.get(`${p.tenantSlug}:${p.warehouseCode}`)!;
    const sup = p.supplierName ? supplierByName.get(`${p.tenantSlug}:${p.supplierName}`) : null;
    const row = await prisma.product.upsert({
      where: { tenantId_sku_warehouseId: { tenantId: p.tenantSlug, sku: p.sku, warehouseId: wh.id } },
      create: {
        tenantId: p.tenantSlug, sku: p.sku, name: p.name, warehouseId: wh.id,
        quantity: p.quantity, unitCost: D(p.unitCost), reorderPoint: p.reorderPoint,
        supplierId: sup?.id ?? null,
      },
      update: {
        name: p.name, warehouseId: wh.id,
        quantity: p.quantity, unitCost: D(p.unitCost), reorderPoint: p.reorderPoint,
        supplierId: sup?.id ?? null,
      },
    });
    productBySku.set(`${p.tenantSlug}:${p.sku}`, { id: row.id, warehouseId: wh.id, tenantSlug: p.tenantSlug, unitCost: p.unitCost });
  }

  // ===== Purchase orders + lines + (if RECEIVED) movements + JE =====
  for (const po of PURCHASE_ORDERS) {
    const sup = supplierByName.get(`${po.tenantSlug}:${po.supplierName}`)!;
    const orderedAt = daysAgo(po.orderedDaysAgo);
    const expectedAt = po.expectedDaysFromNow !== undefined ? daysFromNow(po.expectedDaysFromNow) : null;
    const poRow = await prisma.purchaseOrder.upsert({
      where: { poNumber: po.poNumber },
      create: { tenantId: po.tenantSlug, poNumber: po.poNumber, supplierId: sup.id, status: po.status, orderedAt, expectedAt, note: po.note },
      update: { tenantId: po.tenantSlug, supplierId: sup.id, status: po.status, orderedAt, expectedAt, note: po.note },
    });
    let lineIdx = 0;
    for (const ln of po.lines) {
      lineIdx++;
      const prod = productBySku.get(`${po.tenantSlug}:${ln.sku}`)!;
      const linePk = did("pol", po.poNumber, lineIdx);
      await prisma.purchaseOrderLine.upsert({
        where: { id: linePk },
        create: { id: linePk, poId: poRow.id, productId: prod.id, quantity: ln.qty, receivedQty: po.status === "RECEIVED" ? ln.qty : 0, unitCost: D(ln.unitCost) },
        update: { poId: poRow.id, productId: prod.id, quantity: ln.qty, receivedQty: po.status === "RECEIVED" ? ln.qty : 0, unitCost: D(ln.unitCost) },
      });
      if (po.status === "RECEIVED") {
        const movId = did("mov", po.poNumber, lineIdx);
        await prisma.inventoryMovement.upsert({
          where: { id: movId },
          create: { id: movId, tenantId: po.tenantSlug, productId: prod.id, type: "RECEIVED", delta: ln.qty, reason: `PO ${po.poNumber}`, occurredAt: orderedAt, documentRef: po.poNumber, unitCost: D(ln.unitCost), warehouseId: prod.warehouseId },
          update: { tenantId: po.tenantSlug, productId: prod.id, type: "RECEIVED", delta: ln.qty, reason: `PO ${po.poNumber}`, occurredAt: orderedAt, documentRef: po.poNumber, unitCost: D(ln.unitCost), warehouseId: prod.warehouseId },
        });
      }
    }

    if (po.status === "RECEIVED") {
      const date = orderedAt;
      const period = await prisma.financialPeriod.upsert({
        where: { tenantId_year_month: { tenantId: po.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } },
        create: { tenantId: po.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, status: "OPEN" },
        update: {},
      });
      const total = po.lines.reduce((sum, ln) => sum.plus(D(ln.unitCost).times(ln.qty)), new Prisma.Decimal(0)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const jeId = did("je", po.poNumber);
      await prisma.journalEntry.upsert({
        where: { id: jeId },
        create: { id: jeId, tenantId: po.tenantSlug, periodId: period.id, description: `استلام بضاعة ${po.poNumber}`, reference: po.poNumber, status: "POSTED", postedAt: date },
        update: { tenantId: po.tenantSlug, periodId: period.id, description: `استلام بضاعة ${po.poNumber}`, reference: po.poNumber, status: "POSTED", postedAt: date },
      });
      const acctInv = accByTenantCode.get(`${po.tenantSlug}:${A.INVENTORY}`)!;
      const acctAp  = accByTenantCode.get(`${po.tenantSlug}:${A.AP}`)!;
      const jlDr = did("jl", po.poNumber, "dr");
      const jlCr = did("jl", po.poNumber, "cr");
      await prisma.journalLine.upsert({
        where: { id: jlDr },
        create: { id: jlDr, journalEntryId: jeId, accountId: acctInv.id, debit: total, credit: D(0), memo: "Inventory in" },
        update: { journalEntryId: jeId, accountId: acctInv.id, debit: total, credit: D(0), memo: "Inventory in" },
      });
      await prisma.journalLine.upsert({
        where: { id: jlCr },
        create: { id: jlCr, journalEntryId: jeId, accountId: acctAp.id, debit: D(0), credit: total, memo: "AP supplier" },
        update: { journalEntryId: jeId, accountId: acctAp.id, debit: D(0), credit: total, memo: "AP supplier" },
      });
    }
  }

  // ===== Sales orders + lines + (if FULFILLED) movements + JE (4 lines: AR/REV + COGS/INV) =====
  for (const so of SALES_ORDERS) {
    const cust = customerByName.get(`${so.tenantSlug}:${so.customerName}`)!;
    const orderedAt = daysAgo(so.orderedDaysAgo);
    const requiredBy = so.requiredDaysFromNow !== undefined ? daysFromNow(so.requiredDaysFromNow) : null;
    const soRow = await prisma.salesOrder.upsert({
      where: { soNumber: so.soNumber },
      create: { tenantId: so.tenantSlug, soNumber: so.soNumber, customerId: cust.id, status: so.status, orderedAt, requiredBy },
      update: { tenantId: so.tenantSlug, customerId: cust.id, status: so.status, orderedAt, requiredBy },
    });
    let lineIdx = 0;
    let revenue = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);
    for (const ln of so.lines) {
      lineIdx++;
      const prod = productBySku.get(`${so.tenantSlug}:${ln.sku}`)!;
      const linePk = did("sol", so.soNumber, lineIdx);
      await prisma.salesOrderLine.upsert({
        where: { id: linePk },
        create: { id: linePk, soId: soRow.id, productId: prod.id, quantity: ln.qty, fulfilledQty: so.status === "FULFILLED" ? ln.qty : 0, unitPrice: D(ln.unitPrice) },
        update: { soId: soRow.id, productId: prod.id, quantity: ln.qty, fulfilledQty: so.status === "FULFILLED" ? ln.qty : 0, unitPrice: D(ln.unitPrice) },
      });
      if (so.status === "FULFILLED") {
        const movId = did("mov", so.soNumber, lineIdx);
        await prisma.inventoryMovement.upsert({
          where: { id: movId },
          create: { id: movId, tenantId: so.tenantSlug, productId: prod.id, type: "SOLD", delta: -ln.qty, reason: `SO ${so.soNumber}`, occurredAt: orderedAt, documentRef: so.soNumber, warehouseId: prod.warehouseId },
          update: { tenantId: so.tenantSlug, productId: prod.id, type: "SOLD", delta: -ln.qty, reason: `SO ${so.soNumber}`, occurredAt: orderedAt, documentRef: so.soNumber, warehouseId: prod.warehouseId },
        });
        revenue = revenue.plus(D(ln.unitPrice).times(ln.qty));
        cogs = cogs.plus(D(prod.unitCost).times(ln.qty));
      }
    }
    if (so.status === "FULFILLED") {
      revenue = revenue.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      cogs = cogs.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const date = orderedAt;
      const period = await prisma.financialPeriod.upsert({
        where: { tenantId_year_month: { tenantId: so.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } },
        create: { tenantId: so.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, status: "OPEN" },
        update: {},
      });
      const jeId = did("je", so.soNumber);
      await prisma.journalEntry.upsert({
        where: { id: jeId },
        create: { id: jeId, tenantId: so.tenantSlug, periodId: period.id, description: `بيع ${so.soNumber}`, reference: so.soNumber, status: "POSTED", postedAt: date },
        update: { tenantId: so.tenantSlug, periodId: period.id, description: `بيع ${so.soNumber}`, reference: so.soNumber, status: "POSTED", postedAt: date },
      });
      const aAR = accByTenantCode.get(`${so.tenantSlug}:${A.AR}`)!;
      const aREV = accByTenantCode.get(`${so.tenantSlug}:${A.REVENUE}`)!;
      const aCOGS = accByTenantCode.get(`${so.tenantSlug}:${A.COGS}`)!;
      const aINV = accByTenantCode.get(`${so.tenantSlug}:${A.INVENTORY}`)!;
      const lines = [
        { suffix: "dr-ar",   accountId: aAR.id,   debit: revenue, credit: D(0), memo: "AR customer" },
        { suffix: "cr-rev",  accountId: aREV.id,  debit: D(0),    credit: revenue, memo: "Revenue" },
        { suffix: "dr-cogs", accountId: aCOGS.id, debit: cogs,    credit: D(0), memo: "COGS" },
        { suffix: "cr-inv",  accountId: aINV.id,  debit: D(0),    credit: cogs,  memo: "Inventory out" },
      ];
      for (const l of lines) {
        const id = did("jl", so.soNumber, l.suffix);
        await prisma.journalLine.upsert({
          where: { id },
          create: { id, journalEntryId: jeId, accountId: l.accountId, debit: l.debit, credit: l.credit, memo: l.memo },
          update: { journalEntryId: jeId, accountId: l.accountId, debit: l.debit, credit: l.credit, memo: l.memo },
        });
      }
    }
  }

  // ===== Extra inventory movements (damaged / adjustment) for variety =====
  const adjustments: { tenantSlug: string; sku: string; type: string; delta: number; reason: string; daysAgo: number; cost: string }[] = [
    { tenantSlug: "maha-dairy",     sku: "DAIRY-002", type: "DAMAGED",   delta: -20, reason: "كسر في خط التعبئة",    daysAgo: 10, cost: "0.45" },
    { tenantSlug: "hourani-hotels", sku: "HOTEL-003", type: "DAMAGED",   delta: -60, reason: "تلف نقل",                daysAgo: 12, cost: "0.12" },
    { tenantSlug: "loran-agri",     sku: "AGRI-001",  type: "DAMAGED",   delta: -80, reason: "ثلج غير متوقع",          daysAgo: 16, cost: "0.22" },
    { tenantSlug: "loran-agri",     sku: "AGRI-005",  type: "ADJUSTMENT", delta: 30,  reason: "تسوية جرد",              daysAgo: 4,  cost: "0.32" },
    { tenantSlug: "tank-incubator", sku: "EDU-003",   type: "ADJUSTMENT", delta: -15, reason: "تسوية جرد ربعية",       daysAgo: 6,  cost: "0.95" },
    { tenantSlug: "hourani-hotels", sku: "HOTEL-001", type: "ADJUSTMENT", delta: 100, reason: "إعادة عد",                daysAgo: 8,  cost: "0.18" },
  ];
  for (let i = 0; i < adjustments.length; i++) {
    const a = adjustments[i];
    const prod = productBySku.get(`${a.tenantSlug}:${a.sku}`)!;
    const date = daysAgo(a.daysAgo);
    const movId = did("mov-adj", a.tenantSlug, a.sku, i);
    await prisma.inventoryMovement.upsert({
      where: { id: movId },
      create: { id: movId, tenantId: a.tenantSlug, productId: prod.id, type: a.type, delta: a.delta, reason: a.reason, occurredAt: date, warehouseId: prod.warehouseId, unitCost: D(a.cost) },
      update: { tenantId: a.tenantSlug, productId: prod.id, type: a.type, delta: a.delta, reason: a.reason, occurredAt: date, warehouseId: prod.warehouseId, unitCost: D(a.cost) },
    });

    // Adjustment JE — DR INV_ADJ (loss) / CR INVENTORY (when delta<0), or
    // DR INVENTORY / CR INV_ADJ (when delta>0).
    const value = D(a.cost).times(Math.abs(a.delta)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const period = await prisma.financialPeriod.upsert({
      where: { tenantId_year_month: { tenantId: a.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } },
      create: { tenantId: a.tenantSlug, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, status: "OPEN" },
      update: {},
    });
    const jeId = did("je-adj", a.tenantSlug, a.sku, i);
    await prisma.journalEntry.upsert({
      where: { id: jeId },
      create: { id: jeId, tenantId: a.tenantSlug, periodId: period.id, description: `تسوية مخزون ${a.sku}`, reference: `ADJ-${a.sku}`, status: "POSTED", postedAt: date },
      update: { tenantId: a.tenantSlug, periodId: period.id, description: `تسوية مخزون ${a.sku}`, reference: `ADJ-${a.sku}`, status: "POSTED", postedAt: date },
    });
    const aINV  = accByTenantCode.get(`${a.tenantSlug}:${A.INVENTORY}`)!;
    const aADJ  = accByTenantCode.get(`${a.tenantSlug}:${A.INV_ADJ}`)!;
    if (a.delta < 0) {
      // loss
      await prisma.journalLine.upsert({ where: { id: did("jl-adj", a.tenantSlug, a.sku, i, "dr") }, create: { id: did("jl-adj", a.tenantSlug, a.sku, i, "dr"), journalEntryId: jeId, accountId: aADJ.id, debit: value, credit: D(0), memo: "Loss" }, update: { journalEntryId: jeId, accountId: aADJ.id, debit: value, credit: D(0), memo: "Loss" } });
      await prisma.journalLine.upsert({ where: { id: did("jl-adj", a.tenantSlug, a.sku, i, "cr") }, create: { id: did("jl-adj", a.tenantSlug, a.sku, i, "cr"), journalEntryId: jeId, accountId: aINV.id, debit: D(0), credit: value, memo: "Inventory write-off" }, update: { journalEntryId: jeId, accountId: aINV.id, debit: D(0), credit: value, memo: "Inventory write-off" } });
    } else {
      // gain
      await prisma.journalLine.upsert({ where: { id: did("jl-adj", a.tenantSlug, a.sku, i, "dr") }, create: { id: did("jl-adj", a.tenantSlug, a.sku, i, "dr"), journalEntryId: jeId, accountId: aINV.id, debit: value, credit: D(0), memo: "Inventory gain" }, update: { journalEntryId: jeId, accountId: aINV.id, debit: value, credit: D(0), memo: "Inventory gain" } });
      await prisma.journalLine.upsert({ where: { id: did("jl-adj", a.tenantSlug, a.sku, i, "cr") }, create: { id: did("jl-adj", a.tenantSlug, a.sku, i, "cr"), journalEntryId: jeId, accountId: aADJ.id, debit: D(0), credit: value, memo: "Inventory true-up" }, update: { journalEntryId: jeId, accountId: aADJ.id, debit: D(0), credit: value, memo: "Inventory true-up" } });
    }
  }

  // ===== Bookings =====
  for (const b of BOOKINGS) {
    const checkIn = daysFromNow(b.checkInDaysFromNow);
    const checkOut = new Date(checkIn);
    checkOut.setUTCDate(checkOut.getUTCDate() + b.nights);
    const revenue = b.rooms * b.nights * b.nightly;
    // Phase F4 — Booking now requires tenantId. All seeded hotels live
    // under the HOTELS Company → tenant "hourani-hotels".
    await prisma.booking.upsert({
      where: { reference: b.reference },
      create: { hotelId: b.hotelId, tenantId: "hourani-hotels", reference: b.reference, guestName: b.guestName, roomType: b.roomType, rooms: b.rooms, guests: b.guests, checkIn, checkOut, revenue, status: b.status },
      update: { hotelId: b.hotelId, tenantId: "hourani-hotels", guestName: b.guestName, roomType: b.roomType, rooms: b.rooms, guests: b.guests, checkIn, checkOut, revenue, status: b.status },
    });
  }

  // ===== Counts =====
  const counts = {
    tenants:           await prisma.tenant.count(),
    tenantThemes:      await prisma.tenantTheme.count(),
    tenantPacks:       await prisma.tenantPack.count(),
    companies:         await prisma.company.count(),
    hotels:            await prisma.hotel.count(),
    warehouses:        await prisma.warehouse.count(),
    suppliers:         await prisma.supplier.count(),
    customers:         await prisma.customer.count(),
    products:          await prisma.product.count(),
    purchaseOrders:    await prisma.purchaseOrder.count(),
    purchaseOrderLines:await prisma.purchaseOrderLine.count(),
    salesOrders:       await prisma.salesOrder.count(),
    salesOrderLines:   await prisma.salesOrderLine.count(),
    inventoryMovements:await prisma.inventoryMovement.count(),
    ledgerAccounts:    await prisma.ledgerAccount.count(),
    financialPeriods:  await prisma.financialPeriod.count(),
    journalEntries:    await prisma.journalEntry.count(),
    journalLines:      await prisma.journalLine.count(),
    bookings:          await prisma.booking.count(),
  };

  console.log("\nDone. Counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }
  void tenants;
}

export { main as seedDemo };

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed/seed-demo.ts")) {
  main()
    .catch((e) => { console.error("SEED FAILED:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
