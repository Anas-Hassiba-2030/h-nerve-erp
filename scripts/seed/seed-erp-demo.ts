// scripts/seed/seed-erp-demo.ts
//
// ERP Demo Seed — adds comprehensive realistic data for products, warehouses,
// suppliers, customers, purchase orders, sales orders, inventory movements,
// and journal entries so every ERP back-office page has real data.
//
// Idempotent: every write upserts on the model's unique key.
// Safe to re-run after a demo seed or production seed.
//
//   npx tsx scripts/seed/seed-erp-demo.ts
//
// Requires at minimum:
//   1. Tenant "hourani-hotels" (from seed-production.ts or seed.ts)
//   2. LedgerAccounts for "hourani-hotels" (from seed-production.ts)
//   3. At least one Warehouse with code "AMM-A" (from seed-production.ts)

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Money helper
const m = (v: number) => new Prisma.Decimal(v.toFixed(2));

// Days offset from today
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysFromNow(n: number): Date { return daysAgo(-n); }

// Stable IDs
function sid(...parts: (string | number)[]): string {
  return `erp-demo-${parts.join("-")}`;
}

// ══════════════════════════════════════════════════════════════════════════
// TENANT IDs (opaque labels, NOT Tenant.id FK)
// ══════════════════════════════════════════════════════════════════════════
const T_HOTELS = "hourani-hotels";
const T_DAIRY  = "maha-dairy";
const T_AGRI   = "loran-agri";

// ══════════════════════════════════════════════════════════════════════════
// ACCOUNTING CODES (must match lib/accounting.ts ACCT constants)
// ══════════════════════════════════════════════════════════════════════════
const ACCT = {
  INVENTORY: "1001",
  CASH:      "1101",
  AR:        "1201",
  AP:        "2001",
  RETAINED:  "3001",
  REVENUE:   "4001",
  COGS:      "5001",
  ADJ:       "5002",
} as const;

async function main() {
  console.log("● ERP Demo Seed starting …\n");

  // ════════════════════════════════════════════════════════════════════════
  // 1. WAREHOUSES
  // ════════════════════════════════════════════════════════════════════════
  const WAREHOUSES = [
    { tenantId: T_HOTELS, code: "AMM-A", name: "عمّان — المستودع الرئيسي", address: "شارع المدينة الصناعية، عمّان", type: "MAIN" },
    { tenantId: T_HOTELS, code: "AQB-B", name: "العقبة — التخزين البارد",  address: "منطقة الموانئ، العقبة",          type: "COLD" },
    { tenantId: T_HOTELS, code: "DLB-C", name: "البحر الميت — مخزن جاف",  address: "منطقة السياحة، البحر الميت",     type: "DRY"  },
    { tenantId: T_DAIRY,  code: "ZRQ-A", name: "الزرقاء — المصنع الرئيسي", address: "المنطقة الصناعية، الزرقاء",     type: "MAIN" },
    { tenantId: T_DAIRY,  code: "ZRQ-B", name: "الزرقاء — التخزين المبرّد", address: "المنطقة الصناعية، الزرقاء",    type: "COLD" },
    { tenantId: T_AGRI,   code: "IZR-A", name: "إربد — مخزن المزرعة",     address: "المفرق–إربد، طريق الزراعة",     type: "MAIN" },
    { tenantId: T_AGRI,   code: "IZR-B", name: "إربد — التخزين البارد",   address: "المفرق–إربد، طريق الزراعة",     type: "COLD" },
  ];

  const warehouseIds: Record<string, string> = {};
  for (const w of WAREHOUSES) {
    const row = await prisma.warehouse.upsert({
      where: { tenantId_code: { tenantId: w.tenantId, code: w.code } },
      create: { tenantId: w.tenantId, code: w.code, name: w.name, address: w.address, type: w.type, active: true },
      update: { name: w.name, active: true },
    });
    warehouseIds[`${w.tenantId}/${w.code}`] = row.id;
  }
  console.log(`  warehouses: ${WAREHOUSES.length} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 2. LEDGER ACCOUNTS (extend for Dairy + Agri tenants)
  // ════════════════════════════════════════════════════════════════════════
  const COA = [
    { code: ACCT.INVENTORY, name: "المخزون",               type: "ASSET",     description: "Inventory" },
    { code: ACCT.CASH,      name: "النقد",                  type: "ASSET",     description: "Cash" },
    { code: ACCT.AR,        name: "الذمم المدينة",          type: "ASSET",     description: "Accounts Receivable" },
    { code: ACCT.AP,        name: "الذمم الدائنة",          type: "LIABILITY", description: "Accounts Payable" },
    { code: ACCT.RETAINED,  name: "الأرباح المحتجزة",       type: "EQUITY",    description: "Retained Earnings" },
    { code: ACCT.REVENUE,   name: "الإيرادات",              type: "REVENUE",   description: "Revenue" },
    { code: ACCT.COGS,      name: "تكلفة البضاعة المباعة",  type: "COGS",      description: "Cost of Goods Sold" },
    { code: ACCT.ADJ,       name: "تسويات المخزون",         type: "EXPENSE",   description: "Inventory Adjustment" },
  ];

  const acctIds: Record<string, string> = {}; // "{tenantId}/{code}" -> id
  for (const tenant of [T_HOTELS, T_DAIRY, T_AGRI]) {
    for (const a of COA) {
      const row = await prisma.ledgerAccount.upsert({
        where: { tenantId_code: { tenantId: tenant, code: a.code } },
        create: { tenantId: tenant, code: a.code, name: a.name, type: a.type, description: a.description, active: true },
        update: { name: a.name, active: true },
      });
      acctIds[`${tenant}/${a.code}`] = row.id;
    }
  }
  console.log(`  ledger accounts: ${COA.length * 3} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 3. SUPPLIERS
  // ════════════════════════════════════════════════════════════════════════
  const SUPPLIERS = [
    // Hotels
    { id: sid("sup","hotels","linen"),   tenantId: T_HOTELS, name: "شركة الكوثر للأقمشة الفندقية", email: "kawthar@linens.jo",   phone: "+962-6-5551234", paymentTerms: "Net 30", notes: "مزود رئيسي للمناشف والشراشف" },
    { id: sid("sup","hotels","food"),    tenantId: T_HOTELS, name: "بريدو لتوريد المواد الغذائية",  email: "supply@breedo.com",    phone: "+962-6-5552345", paymentTerms: "Net 15", notes: "مواد غذائية لمطاعم الفنادق" },
    { id: sid("sup","hotels","tech"),    tenantId: T_HOTELS, name: "الحلول التقنية المتكاملة",      email: "info@itsolve.jo",     phone: "+962-6-5553456", paymentTerms: "Net 45", notes: "معدات IT وشاشات الغرف" },
    { id: sid("sup","hotels","clean"),   tenantId: T_HOTELS, name: "الشموع لمستلزمات النظافة",     email: "orders@shumua.jo",    phone: "+962-6-5554567", paymentTerms: "Net 30", notes: "مستلزمات التنظيف والضيافة" },
    { id: sid("sup","hotels","water"),   tenantId: T_HOTELS, name: "مياه رم المعبّأة",              email: "b2b@rum-water.jo",    phone: "+962-3-2011001", paymentTerms: "COD",    notes: "مياه معدنية — التسليم الأسبوعي" },
    { id: sid("sup","hotels","maha"),    tenantId: T_HOTELS, name: "المها للألبان",                  email: "b2b@maha.jo",         phone: "+962-5-3822200", paymentTerms: "Net 15", notes: "ألبان وأجبان للمطاعم الفندقية", linkedTenantId: T_DAIRY },
    { id: sid("sup","hotels","loran"),   tenantId: T_HOTELS, name: "لوران للزراعة",                 email: "supply@loran.jo",     phone: "+962-2-7241100", paymentTerms: "Net 15", notes: "خضروات وفواكه طازجة", linkedTenantId: T_AGRI  },
    // Dairy
    { id: sid("sup","dairy","feed"),     tenantId: T_DAIRY,  name: "مزارع الأعلاف الوطنية",        email: "sales@natfeed.jo",    phone: "+962-5-3820100", paymentTerms: "Net 30", notes: "أعلاف حيوانية ومواد خام" },
    { id: sid("sup","dairy","pack"),     tenantId: T_DAIRY,  name: "شركة التغليف الحديث",           email: "orders@modpack.com",  phone: "+962-6-5556780", paymentTerms: "Net 45", notes: "عبوات تغليف وزجاجات" },
    { id: sid("sup","dairy","equip"),    tenantId: T_DAIRY,  name: "تكنو دير للمعدات الغذائية",    email: "info@technodairy.de", phone: "+49-811-4421000", paymentTerms: "Net 60", notes: "معدات تصنيع الألبان — ألمانيا" },
    { id: sid("sup","dairy","culture"),  tenantId: T_DAIRY,  name: "Chr. Hansen الشرق الأوسط",     email: "me@chr-hansen.com",   phone: "+971-4-3601200", paymentTerms: "Net 30", notes: "كائنات حية لصناعة الجبن واللبن" },
    // Agriculture
    { id: sid("sup","agri","seeds"),     tenantId: T_AGRI,   name: "بذور ريدا الزراعية",           email: "seeds@ryda.jo",       phone: "+962-2-7240200", paymentTerms: "COD",    notes: "بذور خضروات معتمدة" },
    { id: sid("sup","agri","fert"),      tenantId: T_AGRI,   name: "شركة الخصوبة العربية",         email: "sales@arabfert.jo",   phone: "+962-6-5558900", paymentTerms: "Net 30", notes: "أسمدة عضوية ومعدنية" },
    { id: sid("sup","agri","irrig"),     tenantId: T_AGRI,   name: "نيتافيم الأردن",               email: "jordan@netafim.com",  phone: "+962-6-5559900", paymentTerms: "Net 45", notes: "أنظمة ري بالتنقيط" },
  ];

  const supplierIds: Record<string, string> = {};
  let suppCount = 0;
  for (const s of SUPPLIERS) {
    const { id, tenantId, ...data } = s;
    const row = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId, name: data.name } },
      create: { id, tenantId, ...data },
      update: { email: data.email, phone: data.phone, paymentTerms: data.paymentTerms, notes: data.notes, linkedTenantId: data.linkedTenantId ?? null },
    });
    supplierIds[id] = row.id;
    suppCount++;
  }
  console.log(`  suppliers: ${suppCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 4. CUSTOMERS
  // ════════════════════════════════════════════════════════════════════════
  const CUSTOMERS = [
    // Hotels
    { id: sid("cust","hotels","rj"),    tenantId: T_HOTELS, name: "الملكية الأردنية — سفريات الأعمال", email: "corp@rj.jo",          phone: "+962-6-5100000", paymentTerms: "Net 30" },
    { id: sid("cust","hotels","golden"),tenantId: T_HOTELS, name: "وكالة الذهب للسياحة",             email: "bookings@goldenjo.com",phone: "+962-6-5201234", paymentTerms: "Net 15" },
    { id: sid("cust","hotels","jbank"), tenantId: T_HOTELS, name: "مجموعة البنوك الأردنية",           email: "corp@jbg.jo",          phone: "+962-6-5620000", paymentTerms: "Net 30" },
    { id: sid("cust","hotels","embassy"),tenantId: T_HOTELS,name: "السفارة الأمريكية عمّان",           email: "admin@usembassy.gov",  phone: "+962-6-5906000", paymentTerms: "Net 45" },
    { id: sid("cust","hotels","un"),    tenantId: T_HOTELS, name: "مكتب الأمم المتحدة عمّان",         email: "admin@un.org",         phone: "+962-6-5200100", paymentTerms: "Net 45" },
    // Dairy
    { id: sid("cust","dairy","crf"),    tenantId: T_DAIRY,  name: "كارفور الأردن",                   email: "procurement@carrefour.jo",phone:"+962-6-5620100",paymentTerms: "Net 30" },
    { id: sid("cust","dairy","sfy"),    tenantId: T_DAIRY,  name: "سيفوي",                           email: "orders@safeway.jo",    phone: "+962-6-5603000", paymentTerms: "Net 30" },
    { id: sid("cust","dairy","coop"),   tenantId: T_DAIRY,  name: "جمعية الأردن التعاونية",           email: "supply@coop.jo",       phone: "+962-6-5501000", paymentTerms: "Net 15" },
    { id: sid("cust","dairy","arena"),  tenantId: T_DAIRY,  name: "أرينا سبيس للضيافة",              email: "b2b@arena.jo",         phone: "+962-6-5531000", paymentTerms: "Net 15" },
    { id: sid("cust","dairy","rest"),   tenantId: T_DAIRY,  name: "سلسلة مطاعم أكل",                email: "supply@akul.jo",       phone: "+962-6-5541000", paymentTerms: "COD"   },
    // Agriculture
    { id: sid("cust","agri","hotels"),  tenantId: T_AGRI,   name: "أرينا سبيس — مطابخ الفنادق",     email: "kitchen@arena.jo",     phone: "+962-6-5531200", paymentTerms: "Net 15" },
    { id: sid("cust","agri","mkt"),     tenantId: T_AGRI,   name: "سوق عمّان المركزي",              email: "wholesale@ammkt.jo",   phone: "+962-6-5480000", paymentTerms: "COD"   },
    { id: sid("cust","agri","export"),  tenantId: T_AGRI,   name: "شركة الخير للتصدير",             email: "export@khayr.jo",      phone: "+962-6-5490000", paymentTerms: "Net 45" },
  ];

  const customerIds: Record<string, string> = {};
  let custCount = 0;
  for (const c of CUSTOMERS) {
    const { id, tenantId, ...data } = c;
    const row = await prisma.customer.upsert({
      where: { tenantId_name: { tenantId, name: data.name } },
      create: { id, tenantId, ...data },
      update: { email: data.email, phone: data.phone, paymentTerms: data.paymentTerms },
    });
    customerIds[id] = row.id;
    custCount++;
  }
  console.log(`  customers: ${custCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 5. PRODUCTS (tenantId, sku, warehouseId unique)
  // ════════════════════════════════════════════════════════════════════════
  const wh = (tenant: string, code: string) => warehouseIds[`${tenant}/${code}`];

  const PRODUCTS = [
    // Hotels — AMM-A main store
    { id: sid("prod","hotels","towel-w"), tenantId: T_HOTELS, sku: "HTL-TOWEL-W",  name: "مناشف قطنية بيضاء فاخرة",        warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","linen")],  quantity: 1240, reorderPoint: 300, unitCost: 3.80 },
    { id: sid("prod","hotels","sheet-k"), tenantId: T_HOTELS, sku: "HTL-SHEET-K",  name: "شراشف سرير كينج مزدوج",          warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","linen")],  quantity:  580, reorderPoint: 100, unitCost: 12.50 },
    { id: sid("prod","hotels","soap-l"),  tenantId: T_HOTELS, sku: "HTL-SOAP-L",   name: "صابون استحمام فاخر 50غ",          warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","clean")],  quantity: 3800, reorderPoint: 500, unitCost: 0.75 },
    { id: sid("prod","hotels","shamp"),   tenantId: T_HOTELS, sku: "HTL-SHAMP-P",  name: "شامبو وبلسم فاخر 30مل",           warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","clean")],  quantity: 2200, reorderPoint: 400, unitCost: 0.90 },
    { id: sid("prod","hotels","coffee"),  tenantId: T_HOTELS, sku: "HTL-COFFE-G",  name: "قهوة مطحونة فاخرة 500غ",          warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","food")],   quantity:  280, reorderPoint:  50, unitCost: 4.20 },
    { id: sid("prod","hotels","water"),   tenantId: T_HOTELS, sku: "HTL-WATER-B",  name: "مياه معدنية رم 500مل",            warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","water")],  quantity: 6400, reorderPoint: 1000, unitCost: 0.22 },
    { id: sid("prod","hotels","ptowel"),  tenantId: T_HOTELS, sku: "HTL-TOWEL-P",  name: "مناشف المسبح الكبيرة",            warehouseId: () => wh(T_HOTELS,"AQB-B"), supplierId: () => supplierIds[sid("sup","hotels","linen")],  quantity:  920, reorderPoint: 200, unitCost: 5.50 },
    { id: sid("prod","hotels","amenity"), tenantId: T_HOTELS, sku: "HTL-AMENI-K",  name: "مجموعة مستلزمات الضيوف الفاخرة", warehouseId: () => wh(T_HOTELS,"AMM-A"), supplierId: () => supplierIds[sid("sup","hotels","clean")],  quantity:  420, reorderPoint:  80, unitCost: 2.80 },
    // Dairy — ZRQ-A main
    { id: sid("prod","dairy","milk-f"),   tenantId: T_DAIRY,  sku: "MHA-MLK-F",    name: "حليب كامل الدسم 1 لتر",           warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","feed")],   quantity: 8400, reorderPoint: 1000, unitCost: 0.55 },
    { id: sid("prod","dairy","milk-s"),   tenantId: T_DAIRY,  sku: "MHA-MLK-S",    name: "حليب خالي الدسم 1 لتر",           warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","feed")],   quantity: 4200, reorderPoint:  500, unitCost: 0.52 },
    { id: sid("prod","dairy","laban"),    tenantId: T_DAIRY,  sku: "MHA-LBN-H",    name: "لبنة كاملة الدسم 500غ",           warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","culture")], quantity: 2800, reorderPoint:  400, unitCost: 0.85 },
    { id: sid("prod","dairy","cheese"),   tenantId: T_DAIRY,  sku: "MHA-JBN-W",    name: "جبن أبيض 500غ",                   warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","culture")], quantity: 1600, reorderPoint:  200, unitCost: 1.40 },
    { id: sid("prod","dairy","yogurt-p"), tenantId: T_DAIRY,  sku: "MHA-YGT-P",    name: "زبادي طبيعي 500غ",               warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","culture")], quantity: 2100, reorderPoint:  300, unitCost: 0.72 },
    { id: sid("prod","dairy","butter"),   tenantId: T_DAIRY,  sku: "MHA-BUT-A",    name: "زبدة طبيعية 250غ",               warehouseId: () => wh(T_DAIRY,"ZRQ-A"),  supplierId: () => supplierIds[sid("sup","dairy","feed")],   quantity:  640, reorderPoint:  100, unitCost: 1.10 },
    { id: sid("prod","dairy","cream"),    tenantId: T_DAIRY,  sku: "MHA-CRM-H",    name: "قشطة ثقيلة 200مل",               warehouseId: () => wh(T_DAIRY,"ZRQ-B"),  supplierId: () => supplierIds[sid("sup","dairy","feed")],   quantity:  480, reorderPoint:   80, unitCost: 0.90 },
    // Agriculture — IZR-A main
    { id: sid("prod","agri","tomato"),    tenantId: T_AGRI,   sku: "LRN-TOM-F",    name: "طماطم طازجة درجة أولى (كغ)",       warehouseId: () => wh(T_AGRI,"IZR-B"),  supplierId: () => supplierIds[sid("sup","agri","seeds")],   quantity: 4200, reorderPoint:  500, unitCost: 0.28 },
    { id: sid("prod","agri","cucumber"),  tenantId: T_AGRI,   sku: "LRN-CUC-F",    name: "خيار طازج (كغ)",                  warehouseId: () => wh(T_AGRI,"IZR-B"),  supplierId: () => supplierIds[sid("sup","agri","seeds")],   quantity: 2800, reorderPoint:  300, unitCost: 0.22 },
    { id: sid("prod","agri","lettuce"),   tenantId: T_AGRI,   sku: "LRN-LET-R",    name: "خس روماني (رأس)",                 warehouseId: () => wh(T_AGRI,"IZR-B"),  supplierId: () => supplierIds[sid("sup","agri","seeds")],   quantity:  960, reorderPoint:  150, unitCost: 0.45 },
    { id: sid("prod","agri","olive"),     tenantId: T_AGRI,   sku: "LRN-OLV-X",    name: "زيت زيتون بكر ممتاز 1 لتر",       warehouseId: () => wh(T_AGRI,"IZR-A"),  supplierId: () => supplierIds[sid("sup","agri","seeds")],   quantity:  580, reorderPoint:   80, unitCost: 4.20 },
    { id: sid("prod","agri","wheat"),     tenantId: T_AGRI,   sku: "LRN-WHT-H",    name: "قمح صلب 50 كغ",                   warehouseId: () => wh(T_AGRI,"IZR-A"),  supplierId: () => supplierIds[sid("sup","agri","fert")],    quantity:  220, reorderPoint:   40, unitCost: 9.50 },
    { id: sid("prod","agri","pepper"),    tenantId: T_AGRI,   sku: "LRN-PEP-G",    name: "فلفل حلو أخضر (كغ)",              warehouseId: () => wh(T_AGRI,"IZR-B"),  supplierId: () => supplierIds[sid("sup","agri","seeds")],   quantity: 1400, reorderPoint:  200, unitCost: 0.55 },
  ];

  const productIds: Record<string, string> = {};
  let prodCount = 0;
  for (const p of PRODUCTS) {
    const { id, tenantId, warehouseId: whFn, supplierId: supFn, ...data } = p;
    const warehouseId = whFn();
    const supplierId  = supFn();
    if (!warehouseId) { console.warn(`  SKIP product ${id}: warehouse not found`); continue; }
    const row = await prisma.product.upsert({
      where: { tenantId_sku_warehouseId: { tenantId, sku: data.sku, warehouseId } },
      create: { id, tenantId, warehouseId, supplierId: supplierId ?? null, ...data, quantity: data.quantity, unitCost: m(data.unitCost) },
      update: { quantity: data.quantity, reorderPoint: data.reorderPoint, unitCost: m(data.unitCost) },
    });
    productIds[id] = row.id;
    prodCount++;
  }
  console.log(`  products: ${prodCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 6. INVENTORY MOVEMENTS (a historical log of stock activity)
  // ════════════════════════════════════════════════════════════════════════
  type MovDef = { pKey: string; type: string; delta: number; reason: string; daysAgoN: number; unitCost?: number };
  const MOVEMENTS: MovDef[] = [
    // Hotels — receiving stock from suppliers
    { pKey: sid("prod","hotels","towel-w"), type:"RECEIVED",   delta:+500, reason:"شحنة مناشف - PO-HTL-001", daysAgoN:45, unitCost:3.80 },
    { pKey: sid("prod","hotels","towel-w"), type:"SOLD",       delta:-120, reason:"توزيع على فنادق عمّان",    daysAgoN:30 },
    { pKey: sid("prod","hotels","water"),   type:"RECEIVED",   delta:+5000,reason:"شحنة مياه رم أسبوعية",    daysAgoN:10, unitCost:0.22 },
    { pKey: sid("prod","hotels","water"),   type:"SOLD",       delta:-1200,reason:"استهلاك الغرف — أسبوع 22", daysAgoN:5  },
    { pKey: sid("prod","hotels","coffee"),  type:"RECEIVED",   delta:+150, reason:"طلبية شهرية قهوة",         daysAgoN:20, unitCost:4.20 },
    { pKey: sid("prod","hotels","coffee"),  type:"SOLD",       delta:-70,  reason:"استهلاك مطاعم الفنادق",    daysAgoN:8  },
    { pKey: sid("prod","hotels","soap-l"),  type:"RECEIVED",   delta:+1500,reason:"شحنة مستلزمات الضيافة",    daysAgoN:30, unitCost:0.75 },
    { pKey: sid("prod","hotels","soap-l"),  type:"SOLD",       delta:-800, reason:"توزيع على الغرف — مايو",    daysAgoN:15 },
    { pKey: sid("prod","hotels","ptowel"),  type:"RECEIVED",   delta:+400, reason:"مناشف مسبح عقبة",          daysAgoN:35, unitCost:5.50 },
    { pKey: sid("prod","hotels","amenity"), type:"RECEIVED",   delta:+200, reason:"مستلزمات ضيوف VIP",        daysAgoN:25, unitCost:2.80 },
    { pKey: sid("prod","hotels","amenity"), type:"ADJUSTMENT", delta:-15,  reason:"تلف أثناء الشحن",          daysAgoN:20 },
    // Dairy — production inflows and outflows
    { pKey: sid("prod","dairy","milk-f"),   type:"RECEIVED",   delta:+3000,reason:"إنتاج حليب يومي",          daysAgoN:3,  unitCost:0.55 },
    { pKey: sid("prod","dairy","milk-f"),   type:"SOLD",       delta:-2200,reason:"شحنة كارفور الأسبوعية",     daysAgoN:2  },
    { pKey: sid("prod","dairy","laban"),    type:"RECEIVED",   delta:+1200,reason:"إنتاج لبنة — دفعة 44",     daysAgoN:5,  unitCost:0.85 },
    { pKey: sid("prod","dairy","laban"),    type:"SOLD",       delta:-800, reason:"توزيع سيفوي وجمعية",         daysAgoN:3  },
    { pKey: sid("prod","dairy","cheese"),   type:"RECEIVED",   delta:+600, reason:"دفعة جبنة بيضاء — A440",   daysAgoN:8,  unitCost:1.40 },
    { pKey: sid("prod","dairy","cheese"),   type:"SOLD",       delta:-400, reason:"طلبية أرينا الفنادق",        daysAgoN:5  },
    { pKey: sid("prod","dairy","butter"),   type:"RECEIVED",   delta:+300, reason:"إنتاج زبدة أسبوعي",         daysAgoN:7,  unitCost:1.10 },
    { pKey: sid("prod","dairy","yogurt-p"), type:"RECEIVED",   delta:+800, reason:"دفعة زبادي طبيعي",          daysAgoN:4,  unitCost:0.72 },
    { pKey: sid("prod","dairy","yogurt-p"), type:"SOLD",       delta:-500, reason:"كارفور + سيفوي",            daysAgoN:2  },
    // Agriculture — harvest inflows
    { pKey: sid("prod","agri","tomato"),    type:"RECEIVED",   delta:+2000,reason:"حصاد طماطم البيوت المحمية",  daysAgoN:6,  unitCost:0.28 },
    { pKey: sid("prod","agri","tomato"),    type:"SOLD",       delta:-1500,reason:"توريد سوق عمّان المركزي",    daysAgoN:4  },
    { pKey: sid("prod","agri","cucumber"),  type:"RECEIVED",   delta:+1000,reason:"حصاد خيار أسبوع 23",        daysAgoN:5,  unitCost:0.22 },
    { pKey: sid("prod","agri","cucumber"),  type:"SOLD",       delta:-700, reason:"مطابخ أرينا + السوق",        daysAgoN:3  },
    { pKey: sid("prod","agri","olive"),     type:"RECEIVED",   delta:+200, reason:"إنتاج زيت زيتون موسمي",     daysAgoN:60, unitCost:4.20 },
    { pKey: sid("prod","agri","olive"),     type:"SOLD",       delta:-80,  reason:"تصدير — شركة الخير",         daysAgoN:30 },
    { pKey: sid("prod","agri","pepper"),    type:"RECEIVED",   delta:+600, reason:"حصاد فلفل دفعة يونيو",       daysAgoN:4,  unitCost:0.55 },
    { pKey: sid("prod","agri","pepper"),    type:"SOLD",       delta:-350, reason:"توريد فنادق وسوق",           daysAgoN:2  },
  ];

  const wh2prod: Record<string, string> = {}; // productId -> warehouseId
  for (const p of PRODUCTS) { wh2prod[sid(...p.id.split("-"))] = ""; } // placeholder
  // Build lookup: productKey -> { id, warehouseId }
  const prodInfo: Record<string, { id: string; tenantId: string; warehouseId: string }> = {};
  for (const p of PRODUCTS) {
    const wid = p.warehouseId();
    if (wid && productIds[p.id]) {
      prodInfo[p.id] = { id: productIds[p.id], tenantId: p.tenantId, warehouseId: wid };
    }
  }

  let movCount = 0;
  for (let i = 0; i < MOVEMENTS.length; i++) {
    const mv = MOVEMENTS[i];
    const pi = prodInfo[mv.pKey];
    if (!pi) continue;
    const movId = sid("mov", i);
    await prisma.inventoryMovement.upsert({
      where: { id: movId },
      create: {
        id: movId,
        tenantId: pi.tenantId,
        productId: pi.id,
        warehouseId: pi.warehouseId,
        type: mv.type,
        delta: mv.delta,
        reason: mv.reason,
        occurredAt: daysAgo(mv.daysAgoN),
        unitCost: mv.unitCost != null ? m(mv.unitCost) : undefined,
      },
      update: {},
    });
    movCount++;
  }
  console.log(`  inventory movements: ${movCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  // 7. PURCHASE ORDERS
  // ════════════════════════════════════════════════════════════════════════
  type PODef = { id: string; tenantId: string; poNumber: string; supplierKey: string; status: string; daysAgoN: number; expectedDays?: number; lines: Array<{ pKey: string; qty: number; cost: number }> };
  const POS: PODef[] = [
    { id: sid("po","hotels","001"), tenantId: T_HOTELS, poNumber: "PO-HTL-001", supplierKey: sid("sup","hotels","linen"),  status: "RECEIVED", daysAgoN: 45, expectedDays: 38,
      lines: [ { pKey: sid("prod","hotels","towel-w"), qty: 500, cost: 3.80 }, { pKey: sid("prod","hotels","sheet-k"), qty: 200, cost: 12.50 } ] },
    { id: sid("po","hotels","002"), tenantId: T_HOTELS, poNumber: "PO-HTL-002", supplierKey: sid("sup","hotels","water"),  status: "RECEIVED", daysAgoN: 10, expectedDays: 8,
      lines: [ { pKey: sid("prod","hotels","water"), qty: 5000, cost: 0.22 } ] },
    { id: sid("po","hotels","003"), tenantId: T_HOTELS, poNumber: "PO-HTL-003", supplierKey: sid("sup","hotels","food"),   status: "RECEIVED", daysAgoN: 20, expectedDays: 16,
      lines: [ { pKey: sid("prod","hotels","coffee"), qty: 150, cost: 4.20 } ] },
    { id: sid("po","hotels","004"), tenantId: T_HOTELS, poNumber: "PO-HTL-004", supplierKey: sid("sup","hotels","clean"),  status: "PARTIAL",  daysAgoN: 8,  expectedDays: 5,
      lines: [ { pKey: sid("prod","hotels","soap-l"), qty: 2000, cost: 0.75 }, { pKey: sid("prod","hotels","shamp"), qty: 1500, cost: 0.90 }, { pKey: sid("prod","hotels","amenity"), qty: 300, cost: 2.80 } ] },
    { id: sid("po","hotels","005"), tenantId: T_HOTELS, poNumber: "PO-HTL-005", supplierKey: sid("sup","hotels","linen"),  status: "SENT",     daysAgoN: 2,
      lines: [ { pKey: sid("prod","hotels","ptowel"), qty: 300, cost: 5.50 } ] },
    // Dairy POs
    { id: sid("po","dairy","001"),  tenantId: T_DAIRY,  poNumber: "PO-MHA-001",  supplierKey: sid("sup","dairy","feed"),    status: "RECEIVED", daysAgoN: 30, expectedDays: 25,
      lines: [ { pKey: sid("prod","dairy","milk-f"), qty: 1000, cost: 0.55 }, { pKey: sid("prod","dairy","butter"), qty: 200, cost: 1.10 } ] },
    { id: sid("po","dairy","002"),  tenantId: T_DAIRY,  poNumber: "PO-MHA-002",  supplierKey: sid("sup","dairy","pack"),    status: "RECEIVED", daysAgoN: 14, expectedDays: 10,
      lines: [ { pKey: sid("prod","dairy","milk-f"), qty: 500, cost: 0.55 } ] },
    { id: sid("po","dairy","003"),  tenantId: T_DAIRY,  poNumber: "PO-MHA-003",  supplierKey: sid("sup","dairy","culture"), status: "SENT",     daysAgoN: 3,
      lines: [ { pKey: sid("prod","dairy","laban"), qty: 800, cost: 0.85 }, { pKey: sid("prod","dairy","cheese"), qty: 400, cost: 1.40 }, { pKey: sid("prod","dairy","yogurt-p"), qty: 600, cost: 0.72 } ] },
    // Agri POs
    { id: sid("po","agri","001"),   tenantId: T_AGRI,   poNumber: "PO-LRN-001",  supplierKey: sid("sup","agri","fert"),     status: "RECEIVED", daysAgoN: 60, expectedDays: 55,
      lines: [ { pKey: sid("prod","agri","wheat"), qty: 100, cost: 9.50 } ] },
    { id: sid("po","agri","002"),   tenantId: T_AGRI,   poNumber: "PO-LRN-002",  supplierKey: sid("sup","agri","irrig"),    status: "PARTIAL",  daysAgoN: 20,
      lines: [ { pKey: sid("prod","agri","tomato"), qty: 1000, cost: 0.28 }, { pKey: sid("prod","agri","cucumber"), qty: 500, cost: 0.22 } ] },
    { id: sid("po","agri","003"),   tenantId: T_AGRI,   poNumber: "PO-LRN-003",  supplierKey: sid("sup","agri","seeds"),    status: "DRAFT",    daysAgoN: 1,
      lines: [ { pKey: sid("prod","agri","pepper"), qty: 400, cost: 0.55 }, { pKey: sid("prod","agri","lettuce"), qty: 200, cost: 0.45 } ] },
  ];

  let poCount = 0, poLineCount = 0;
  const poDbIds: Record<string, string> = {}; // po.id -> actual db id
  for (const po of POS) {
    const suppId = supplierIds[po.supplierKey];
    if (!suppId) continue;
    const row = await prisma.purchaseOrder.upsert({
      where: { poNumber: po.poNumber },
      create: {
        id: po.id, tenantId: po.tenantId, poNumber: po.poNumber, supplierId: suppId,
        status: po.status, orderedAt: daysAgo(po.daysAgoN),
        expectedAt: po.expectedDays ? daysAgo(po.daysAgoN - po.expectedDays) : undefined,
      },
      update: { status: po.status },
    });
    poDbIds[po.id] = row.id;
    poCount++;
    // Lines
    for (let li = 0; li < po.lines.length; li++) {
      const l = po.lines[li];
      const pi = prodInfo[l.pKey];
      if (!pi) continue;
      const lineId = sid("po-line", po.id.slice(-6), li);
      await prisma.purchaseOrderLine.upsert({
        where: { id: lineId },
        create: { id: lineId, poId: row.id, productId: pi.id, quantity: l.qty, unitCost: m(l.cost) },
        update: { quantity: l.qty, unitCost: m(l.cost) },
      });
      poLineCount++;
    }
  }
  console.log(`  purchase orders: ${poCount}, lines: ${poLineCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 8. SALES ORDERS
  // ════════════════════════════════════════════════════════════════════════
  type SODef = { id: string; tenantId: string; soNumber: string; custKey: string; status: string; daysAgoN: number; reqDays?: number; lines: Array<{ pKey: string; qty: number; price: number }> };
  const SOS: SODef[] = [
    // Hotels selling amenities/supplies
    { id: sid("so","hotels","001"), tenantId: T_HOTELS, soNumber: "SO-HTL-001", custKey: sid("cust","hotels","rj"),     status: "FULFILLED", daysAgoN: 30, reqDays: 25,
      lines: [ { pKey: sid("prod","hotels","water"),  qty: 600, price: 0.45 }, { pKey: sid("prod","hotels","amenity"), qty: 100, price: 5.50 } ] },
    { id: sid("so","hotels","002"), tenantId: T_HOTELS, soNumber: "SO-HTL-002", custKey: sid("cust","hotels","golden"), status: "CONFIRMED", daysAgoN: 5,
      lines: [ { pKey: sid("prod","hotels","towel-w"), qty: 80, price: 7.00 } ] },
    { id: sid("so","hotels","003"), tenantId: T_HOTELS, soNumber: "SO-HTL-003", custKey: sid("cust","hotels","jbank"),  status: "FULFILLED", daysAgoN: 60, reqDays: 55,
      lines: [ { pKey: sid("prod","hotels","coffee"), qty: 40, price: 7.50 }, { pKey: sid("prod","hotels","water"), qty: 480, price: 0.45 } ] },
    // Dairy selling to retailers
    { id: sid("so","dairy","001"),  tenantId: T_DAIRY,  soNumber: "SO-MHA-001",  custKey: sid("cust","dairy","crf"),    status: "FULFILLED", daysAgoN: 5, reqDays: 3,
      lines: [ { pKey: sid("prod","dairy","milk-f"), qty: 1200, price: 0.85 }, { pKey: sid("prod","dairy","milk-s"), qty: 600, price: 0.80 } ] },
    { id: sid("so","dairy","002"),  tenantId: T_DAIRY,  soNumber: "SO-MHA-002",  custKey: sid("cust","dairy","sfy"),    status: "FULFILLED", daysAgoN: 8, reqDays: 6,
      lines: [ { pKey: sid("prod","dairy","laban"), qty: 500, price: 1.40 }, { pKey: sid("prod","dairy","yogurt-p"), qty: 400, price: 1.20 } ] },
    { id: sid("so","dairy","003"),  tenantId: T_DAIRY,  soNumber: "SO-MHA-003",  custKey: sid("cust","dairy","arena"),  status: "PARTIAL",   daysAgoN: 4,
      lines: [ { pKey: sid("prod","dairy","cheese"), qty: 200, price: 2.20 }, { pKey: sid("prod","dairy","butter"), qty: 100, price: 1.80 }, { pKey: sid("prod","dairy","cream"), qty: 80, price: 1.50 } ] },
    { id: sid("so","dairy","004"),  tenantId: T_DAIRY,  soNumber: "SO-MHA-004",  custKey: sid("cust","dairy","rest"),   status: "CONFIRMED", daysAgoN: 2,
      lines: [ { pKey: sid("prod","dairy","laban"), qty: 300, price: 1.40 }, { pKey: sid("prod","dairy","yogurt-p"), qty: 200, price: 1.20 } ] },
    // Agri selling produce
    { id: sid("so","agri","001"),   tenantId: T_AGRI,   soNumber: "SO-LRN-001",  custKey: sid("cust","agri","hotels"),  status: "FULFILLED", daysAgoN: 4, reqDays: 2,
      lines: [ { pKey: sid("prod","agri","tomato"), qty: 800, price: 0.55 }, { pKey: sid("prod","agri","cucumber"), qty: 400, price: 0.42 }, { pKey: sid("prod","agri","lettuce"), qty: 200, price: 0.80 } ] },
    { id: sid("so","agri","002"),   tenantId: T_AGRI,   soNumber: "SO-LRN-002",  custKey: sid("cust","agri","mkt"),     status: "FULFILLED", daysAgoN: 5, reqDays: 3,
      lines: [ { pKey: sid("prod","agri","tomato"), qty: 700, price: 0.48 }, { pKey: sid("prod","agri","pepper"), qty: 350, price: 0.90 } ] },
    { id: sid("so","agri","003"),   tenantId: T_AGRI,   soNumber: "SO-LRN-003",  custKey: sid("cust","agri","export"),  status: "CONFIRMED", daysAgoN: 1,
      lines: [ { pKey: sid("prod","agri","olive"), qty: 50, price: 6.80 }, { pKey: sid("prod","agri","wheat"), qty: 30, price: 14.00 } ] },
  ];

  let soCount = 0, soLineCount = 0;
  for (const so of SOS) {
    const custId = customerIds[so.custKey];
    if (!custId) continue;
    const row = await prisma.salesOrder.upsert({
      where: { soNumber: so.soNumber },
      create: {
        id: so.id, tenantId: so.tenantId, soNumber: so.soNumber, customerId: custId,
        status: so.status, orderedAt: daysAgo(so.daysAgoN),
        requiredBy: so.reqDays ? daysAgo(so.daysAgoN - so.reqDays) : undefined,
      },
      update: { status: so.status },
    });
    soCount++;
    for (let li = 0; li < so.lines.length; li++) {
      const l = so.lines[li];
      const pi = prodInfo[l.pKey];
      if (!pi) continue;
      const lineId = sid("so-line", so.id.slice(-6), li);
      const fulfilled = so.status === "FULFILLED" ? l.qty : so.status === "PARTIAL" ? Math.floor(l.qty * 0.6) : 0;
      await prisma.salesOrderLine.upsert({
        where: { id: lineId },
        create: { id: lineId, soId: row.id, productId: pi.id, quantity: l.qty, fulfilledQty: fulfilled, unitPrice: m(l.price) },
        update: { quantity: l.qty, fulfilledQty: fulfilled, unitPrice: m(l.price) },
      });
      soLineCount++;
    }
  }
  console.log(`  sales orders: ${soCount}, lines: ${soLineCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 9. FINANCIAL PERIODS + JOURNAL ENTRIES
  // ════════════════════════════════════════════════════════════════════════
  const YEAR = 2026;
  const MONTHS = [1, 2, 3, 4, 5, 6]; // Jan–Jun 2026

  // Create financial periods for each tenant
  const periodIds: Record<string, string> = {}; // "{tenant}/{year}/{month}" -> id
  for (const tenant of [T_HOTELS, T_DAIRY, T_AGRI]) {
    for (const month of MONTHS) {
      const pid = sid("period", tenant.replace(/-/g,"_"), YEAR, month);
      const row = await prisma.financialPeriod.upsert({
        where: { tenantId_year_month: { tenantId: tenant, year: YEAR, month } },
        create: { id: pid, tenantId: tenant, year: YEAR, month, status: month < 6 ? "CLOSED" : "OPEN" },
        update: { status: month < 6 ? "CLOSED" : "OPEN" },
      });
      periodIds[`${tenant}/${YEAR}/${month}`] = row.id;
    }
  }
  console.log(`  financial periods: ${Object.keys(periodIds).length} ready`);

  // Journal entries: revenue recognition, COGS, AP/AR clearing
  type JEDef = {
    id: string; tenantId: string; period: string; description: string; reference?: string; month: number;
    lines: Array<{ acct: string; debit: number; credit: number; memo?: string }>;
  };

  // Convenience: get account id
  const acc = (tenant: string, code: string) => acctIds[`${tenant}/${code}`];

  const JOURNAL_ENTRIES: JEDef[] = [
    // ── Hotels Jan ──────────────────────────────────────────────────────
    { id: sid("je","hotels","jan-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/1`, month: 1,
      description: "إيرادات الغرف — يناير 2026", reference: "REV-HTL-0126",
      lines: [ { acct: ACCT.AR,      debit: 142500, credit: 0,      memo: "الذمم المدينة — فاتورة يناير" },
               { acct: ACCT.REVENUE, debit: 0,      credit: 142500, memo: "إيرادات الغرف" } ] },
    { id: sid("je","hotels","jan-cogs"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/1`, month: 1,
      description: "تكلفة المستلزمات المباعة — يناير",
      lines: [ { acct: ACCT.COGS,      debit: 28400, credit: 0,     memo: "تكلفة مستلزمات الغرف" },
               { acct: ACCT.INVENTORY, debit: 0,     credit: 28400, memo: "خروج المخزون" } ] },
    { id: sid("je","hotels","jan-po"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/1`, month: 1,
      description: "شراء مناشف وشراشف — PO-HTL-001",  reference: "PO-HTL-001",
      lines: [ { acct: ACCT.INVENTORY, debit: 15400, credit: 0,     memo: "استلام مخزون" },
               { acct: ACCT.AP,        debit: 0,     credit: 15400, memo: "ذمم دائنة للكوثر" } ] },
    // ── Hotels Feb ──────────────────────────────────────────────────────
    { id: sid("je","hotels","feb-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/2`, month: 2,
      description: "إيرادات الغرف — فبراير 2026", reference: "REV-HTL-0226",
      lines: [ { acct: ACCT.AR,      debit: 168400, credit: 0,      memo: "الذمم المدينة" },
               { acct: ACCT.REVENUE, debit: 0,      credit: 168400, memo: "إيرادات الغرف + F&B" } ] },
    { id: sid("je","hotels","feb-cash"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/2`, month: 2,
      description: "تحصيل مدفوعات يناير",
      lines: [ { acct: ACCT.CASH, debit: 138000, credit: 0,      memo: "تحويل بنكي" },
               { acct: ACCT.AR,   debit: 0,      credit: 138000, memo: "تسوية الذمم" } ] },
    // ── Hotels Mar ──────────────────────────────────────────────────────
    { id: sid("je","hotels","mar-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/3`, month: 3,
      description: "إيرادات الغرف — مارس 2026", reference: "REV-HTL-0326",
      lines: [ { acct: ACCT.AR,      debit: 155800, credit: 0,      memo: "فاتورة مارس" },
               { acct: ACCT.REVENUE, debit: 0,      credit: 155800, memo: "إيرادات الفنادق" } ] },
    // ── Hotels Apr-Jun ─────────────────────────────────────────────────
    { id: sid("je","hotels","apr-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/4`, month: 4,
      description: "إيرادات إبريل 2026",
      lines: [ { acct: ACCT.AR,      debit: 178200, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 178200 } ] },
    { id: sid("je","hotels","may-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/5`, month: 5,
      description: "إيرادات مايو 2026",
      lines: [ { acct: ACCT.AR,      debit: 192400, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 192400 } ] },
    { id: sid("je","hotels","jun-rev"), tenantId: T_HOTELS, period: `${T_HOTELS}/${YEAR}/6`, month: 6,
      description: "إيرادات يونيو 2026 (جزئي)",
      lines: [ { acct: ACCT.AR,      debit: 84600,  credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 84600  } ] },
    // ── Dairy Jan ──────────────────────────────────────────────────────
    { id: sid("je","dairy","jan-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/1`, month: 1,
      description: "مبيعات منتجات الألبان — يناير", reference: "REV-MHA-0126",
      lines: [ { acct: ACCT.AR,      debit: 84300, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 84300 } ] },
    { id: sid("je","dairy","jan-cogs"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/1`, month: 1,
      description: "تكلفة الإنتاج — يناير",
      lines: [ { acct: ACCT.COGS,      debit: 38600, credit: 0 }, { acct: ACCT.INVENTORY, debit: 0, credit: 38600 } ] },
    { id: sid("je","dairy","feb-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/2`, month: 2,
      description: "مبيعات الألبان — فبراير",
      lines: [ { acct: ACCT.AR,      debit: 78900, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 78900 } ] },
    { id: sid("je","dairy","mar-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/3`, month: 3,
      description: "مبيعات الألبان — مارس",
      lines: [ { acct: ACCT.AR,      debit: 91200, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 91200 } ] },
    { id: sid("je","dairy","apr-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/4`, month: 4,
      description: "مبيعات الألبان — إبريل",
      lines: [ { acct: ACCT.AR,      debit: 88400, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 88400 } ] },
    { id: sid("je","dairy","may-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/5`, month: 5,
      description: "مبيعات الألبان — مايو",
      lines: [ { acct: ACCT.AR,      debit: 95600, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 95600 } ] },
    { id: sid("je","dairy","jun-rev"), tenantId: T_DAIRY, period: `${T_DAIRY}/${YEAR}/6`, month: 6,
      description: "مبيعات يونيو (جزئي)",
      lines: [ { acct: ACCT.AR,      debit: 42800, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 42800 } ] },
    // ── Agri ──────────────────────────────────────────────────────────
    { id: sid("je","agri","q1-rev"), tenantId: T_AGRI, period: `${T_AGRI}/${YEAR}/3`, month: 3,
      description: "إيرادات مبيعات الإنتاج الزراعي — ق1",
      lines: [ { acct: ACCT.AR,      debit: 38400, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 38400 } ] },
    { id: sid("je","agri","q2-rev"), tenantId: T_AGRI, period: `${T_AGRI}/${YEAR}/5`, month: 5,
      description: "إيرادات المحاصيل الموسمية — ق2",
      lines: [ { acct: ACCT.AR,      debit: 52200, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 52200 } ] },
    { id: sid("je","agri","jun-rev"), tenantId: T_AGRI, period: `${T_AGRI}/${YEAR}/6`, month: 6,
      description: "مبيعات يونيو — خضروات وزيت",
      lines: [ { acct: ACCT.AR,      debit: 28600, credit: 0 }, { acct: ACCT.REVENUE, debit: 0, credit: 28600 } ] },
  ];

  let jeCount = 0, jlCount = 0;
  for (const je of JOURNAL_ENTRIES) {
    const periodId = periodIds[je.period];
    if (!periodId) { console.warn(`  SKIP JE ${je.id}: period ${je.period} not found`); continue; }
    const hasAllAccts = je.lines.every(l => acc(je.tenantId, l.acct));
    if (!hasAllAccts) { console.warn(`  SKIP JE ${je.id}: missing ledger account`); continue; }
    // Upsert the entry header
    const jeRow = await prisma.journalEntry.upsert({
      where: { id: je.id },
      create: {
        id: je.id, tenantId: je.tenantId, periodId,
        description: je.description, reference: je.reference,
        status: "POSTED", postedAt: new Date(),
      },
      update: { status: "POSTED" },
    });
    // Create lines only if none exist yet (idempotent)
    const existingLines = await prisma.journalLine.count({ where: { journalEntryId: jeRow.id } });
    if (existingLines === 0) {
      await prisma.journalLine.createMany({
        data: je.lines.map(l => ({
          journalEntryId: jeRow.id,
          accountId: acc(je.tenantId, l.acct)!,
          debit:  m(l.debit),
          credit: m(l.credit),
          memo:   l.memo,
        })),
      });
      jlCount += je.lines.length;
    }
    jeCount++;
  }
  console.log(`  journal entries: ${jeCount}, lines: ${jlCount}`);

  // ════════════════════════════════════════════════════════════════════════
  // 10. BRAIN INSIGHTS (AI signals for the /admin/brain page)
  // ════════════════════════════════════════════════════════════════════════
  const INSIGHTS_DATA = [
    { id: sid("ins","hotels","towel-low"),    tenantId: T_HOTELS, type: "LOW_STOCK",             severity: "WARNING",  title: "مخزون المناشف منخفض",                    body: "مخزون مناشف الحمام قريب من نقطة إعادة الطلب. ارتفاع التشغيل المتوقع في الصيف يستوجب التوريد المبكر.",           productKey: sid("prod","hotels","towel-w") },
    { id: sid("ins","hotels","water-fast"),   tenantId: T_HOTELS, type: "REORDER_RECOMMENDATION",severity: "INFO",     title: "معدل دوران المياه المعبّأة مرتفع",        body: "1200 وحدة مياه بيعت في 5 أيام. يُنصح بتفعيل جدول التوريد الأسبوعي لتجنّب النقص.",                              productKey: sid("prod","hotels","water") },
    { id: sid("ins","dairy","milk-demand"),   tenantId: T_DAIRY,  type: "REORDER_RECOMMENDATION",severity: "WARNING",  title: "طلب كارفور على الحليب ارتفع 28%",         body: "زيادة طلب كارفور 28% في يونيو مقارنة بمايو. يُوصى بتوسيع طاقة الإنتاج اليومية لتلبية الطلب المتنامي.",         productKey: sid("prod","dairy","milk-f") },
    { id: sid("ins","dairy","cheese-expiry"), tenantId: T_DAIRY,  type: "STALE_PRODUCT",         severity: "CRITICAL", title: "دفعة جبن قريبة من انتهاء الصلاحية",       body: "دفعة الجبن A440 (400 وحدة) تصل نهاية صلاحيتها خلال 8 أيام. يُنصح بتسريع التوزيع فوراً.",                      productKey: sid("prod","dairy","cheese") },
    { id: sid("ins","agri","tomato-peak"),    tenantId: T_AGRI,   type: "REORDER_RECOMMENDATION",severity: "INFO",     title: "ذروة حصاد الطماطم — نافذة تصدير",        body: "الإنتاج في أعلى مستوياته. فتح قناة تصدير عبر شركة الخير خلال الأسبوعين القادمين فرصة سوقية.",                   productKey: sid("prod","agri","tomato") },
    { id: sid("ins","agri","olive-season"),   tenantId: T_AGRI,   type: "LOW_STOCK",             severity: "INFO",     title: "مخزون زيت الزيتون محدود — الموسم القادم", body: "مخزون زيت الزيتون 580 وحدة فقط. الموسم القادم في أكتوبر — التخطيط المبكر لخطوط الإنتاج مطلوب.",                 productKey: sid("prod","agri","olive") },
  ];

  let insCount = 0;
  for (const ins of INSIGHTS_DATA) {
    const pi = prodInfo[ins.productKey];
    if (!pi) continue;
    await prisma.brainInsight.upsert({
      where: { id: ins.id },
      create: {
        id: ins.id, tenantId: ins.tenantId, productId: pi.id,
        type: ins.type, severity: ins.severity,
        title: ins.title, body: ins.body,
        metadata: JSON.stringify({ source: "seed-erp-demo" }),
      },
      update: { title: ins.title, body: ins.body, severity: ins.severity },
    });
    insCount++;
  }
  console.log(`  brain insights: ${insCount} ready`);

  // ════════════════════════════════════════════════════════════════════════
  console.log("\n● ERP Demo Seed complete.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
