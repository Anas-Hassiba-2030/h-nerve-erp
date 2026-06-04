// /admin/system — superadmin MISSION CONTROL (Phase 11). The back-office
// command deck and entry point into the operator admin family. Sleek Operator
// vocabulary (DESIGN-SKILL §1.F) to match the (admin) shell — cyan on
// near-black, no operator chrome. NOT Heritage: one vocabulary per surface.
//
// Federation totals header, then the admin routes CLUSTERED into command
// groups (Data & Ingest · Inventory · Orders & Parties · Accounting ·
// Intelligence · Access & Audit) instead of a flat 17-card wall. Counts are
// best-effort badges, each caught independently.

import Link from "next/link";
import {
  Upload, Package, ArrowLeftRight, Warehouse, Repeat, Shuffle,
  ShoppingCart, Receipt, Truck, Users, BookOpen, Landmark, Brain,
  UsersRound, ShieldCheck, ScrollText, Database,
} from "lucide-react";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { listModels } from "@/lib/db.introspect";
import { SeedDemoButton } from "@/components/SeedDemoButton";

export const dynamic = "force-dynamic";

type GroupId = "data" | "inventory" | "trade" | "books" | "intel" | "access";

type Card = {
  href: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: any;
  count: number | null;
  group: GroupId;
};

const GROUPS: { id: GroupId; ar: string; en: string }[] = [
  { id: "data",      ar: "البيانات والاستيراد", en: "Data & Ingest" },
  { id: "inventory", ar: "المخزون",            en: "Inventory" },
  { id: "trade",     ar: "الطلبات والأطراف",   en: "Orders & Parties" },
  { id: "books",     ar: "المحاسبة",           en: "Accounting" },
  { id: "intel",     ar: "الذكاء",             en: "Intelligence" },
  { id: "access",    ar: "الوصول والتدقيق",    en: "Access & Audit" },
];

async function n(p: Promise<number>): Promise<number | null> {
  return p.then((v) => v).catch(() => null);
}

export default async function AdminSystemPage() {
  const ar = getLocale() === "ar";

  const [tenants, brainPatterns, iqRows, memories] = await Promise.all([
    prisma.tenant.count().catch(() => 0),
    prisma.brainPattern.count().catch(() => 0),
    prisma.brainIQHistory.count().catch(() => 0),
    prisma.memory.count().catch(() => 0),
  ]);

  // 17 best-effort count badges. Plain count() (no field filters) so a
  // schema drift can never crash the hub; transfers is the one filtered
  // count (paired movements carry a transferRef — Phase 9).
  const [
    cImports, cProducts, cMovements, cWarehouses, cTransfers, cMappings,
    cPO, cSO, cSuppliers, cCustomers, cJournal, cAccounts, cBrain,
    cUsers, cAudit,
  ] = await Promise.all([
    n(prismaUnscoped.importLog.count()),
    n(prismaUnscoped.product.count()),
    n(prismaUnscoped.inventoryMovement.count()),
    n(prismaUnscoped.warehouse.count()),
    n(prismaUnscoped.inventoryMovement.count({ where: { transferRef: { not: null } } })),
    n(prismaUnscoped.tenantImportMapping.count()),
    n(prismaUnscoped.purchaseOrder.count()),
    n(prismaUnscoped.salesOrder.count()),
    n(prismaUnscoped.supplier.count()),
    n(prismaUnscoped.customer.count()),
    n(prismaUnscoped.journalEntry.count()),
    n(prismaUnscoped.ledgerAccount.count()),
    n(prismaUnscoped.brainInsight.count()),
    n(prismaUnscoped.user.count()),
    n(prismaUnscoped.activityLog.count()),
  ]);

  const dbModelCount = listModels().length;

  const cards: Card[] = [
    { href: "/admin/db",              titleAr: "متصفّح البيانات",   titleEn: "Data Browser",       descAr: "كل جداول قاعدة البيانات — للقراءة",     descEn: "Every database table — read-only",         icon: Database,     count: dbModelCount, group: "data" },
    { href: "/admin/imports",         titleAr: "سجل الاستيراد",    titleEn: "Import Log",         descAr: "دفعات الاستيراد ومعاينتها",            descEn: "Import batches and previews",              icon: Upload,       count: cImports, group: "data" },
    { href: "/admin/mappings",        titleAr: "التخطيطات",         titleEn: "Mappings",           descAr: "ترجمة حقول أنظمة المصدر",              descEn: "Source-system field translations",         icon: Shuffle,      count: cMappings, group: "data" },
    { href: "/admin/products",        titleAr: "المنتجات",          titleEn: "Products",           descAr: "كتالوج الأصناف والمخزون",              descEn: "Item catalogue and inventory",             icon: Package,      count: cProducts, group: "inventory" },
    { href: "/admin/movements",       titleAr: "الحركات",           titleEn: "Movements",          descAr: "حركات المخزون بأنواعها",               descEn: "All inventory movement types",             icon: ArrowLeftRight, count: cMovements, group: "inventory" },
    { href: "/admin/warehouses",      titleAr: "المستودعات",        titleEn: "Warehouses",         descAr: "مواقع المخزون الفعلية",                descEn: "Physical stock locations",                 icon: Warehouse,    count: cWarehouses, group: "inventory" },
    { href: "/admin/transfers",       titleAr: "التحويلات",         titleEn: "Transfers",          descAr: "نقل المخزون بين المستودعات",           descEn: "Inter-warehouse stock transfers",          icon: Repeat,       count: cTransfers, group: "inventory" },
    { href: "/admin/purchase-orders", titleAr: "أوامر الشراء",      titleEn: "Purchase Orders",    descAr: "طلبات الشراء من المورّدين",            descEn: "Supplier purchase requests",               icon: ShoppingCart, count: cPO, group: "trade" },
    { href: "/admin/sales-orders",    titleAr: "أوامر البيع",       titleEn: "Sales Orders",       descAr: "أوامر البيع للعملاء",                  descEn: "Customer sales orders",                    icon: Receipt,      count: cSO, group: "trade" },
    { href: "/admin/suppliers",       titleAr: "الموردون",          titleEn: "Suppliers",          descAr: "سجل المورّدين",                        descEn: "Supplier registry",                        icon: Truck,        count: cSuppliers, group: "trade" },
    { href: "/admin/customers",       titleAr: "العملاء",           titleEn: "Customers",          descAr: "سجل العملاء",                          descEn: "Customer registry",                        icon: Users,        count: cCustomers, group: "trade" },
    { href: "/admin/journal",         titleAr: "اليومية",           titleEn: "Journal",            descAr: "قيود اليومية المحاسبية",               descEn: "Accounting journal entries",               icon: BookOpen,     count: cJournal, group: "books" },
    { href: "/admin/accounts",        titleAr: "الحسابات",          titleEn: "Accounts",           descAr: "شجرة الحسابات (الأستاذ)",              descEn: "Chart of accounts (general ledger)",       icon: Landmark,     count: cAccounts, group: "books" },
    { href: "/admin/brain",           titleAr: "رؤى العقل",         titleEn: "Brain Insights",     descAr: "إشارات وتحليلات الذكاء",               descEn: "AI signals and analytics",                 icon: Brain,        count: cBrain, group: "intel" },
    { href: "/admin/users",           titleAr: "المستخدمون",        titleEn: "Users",              descAr: "الحسابات والأدوار والصلاحيات",         descEn: "Accounts, roles, and access",              icon: UsersRound,   count: cUsers, group: "access" },
    { href: "/admin/permissions-preview", titleAr: "معاينة الصلاحيات", titleEn: "Permissions",     descAr: "ما يصل إليه كل دور (تدقيق)",            descEn: "What each role can reach (audit)",         icon: ShieldCheck,  count: null, group: "access" },
    { href: "/admin/audit",           titleAr: "سجل التدقيق",       titleEn: "Audit Log",          descAr: "من فعل ماذا ومتى",                     descEn: "Who did what, when",                       icon: ScrollText,   count: cAudit, group: "access" },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">SUPERADMIN · MISSION CONTROL</span>
          <h1 className="admin-h1">{ar ? "غرفة العمليات" : "Mission Control"}</h1>
          <p className="admin-sub">
            {ar
              ? "مركز قيادة المكتب الخلفي — كل أدوات إدارة النظام في مكان واحد: البيانات، المخزون، الطلبات، المحاسبة، الذكاء، والوصول. مع إجماليات الاتحاد عبر كل مستأجر."
              : "The back-office command deck — every system-management tool in one place: data, inventory, orders, accounting, intelligence, and access. Federation totals across every tenant."}
          </p>
          <SeedDemoButton ar={ar} />
        </div>
      </header>

      <section className="admin-stats">
        <Stat label="TENANTS" value={tenants} />
        <Stat label="LEARNED PATTERNS" value={brainPatterns} accent="cyan" />
        <Stat label="IQ SNAPSHOTS" value={iqRows} accent="cyan" />
        <Stat label="MEMORIES" value={memories} accent="cyan" />
      </section>

      {GROUPS.map((g) => {
        const groupCards = cards.filter((c) => c.group === g.id);
        if (groupCards.length === 0) return null;
        return (
          <section key={g.id} className="admin-section">
            <div className="admin-section-head">
              <h2 className="admin-h2">{ar ? g.ar : g.en}</h2>
            </div>
            <div className="admin-grid">
              {groupCards.map((c) => {
                const Icon = c.icon;
                return (
                  <Link key={c.href} href={c.href} className="admin-tenant-card">
                    <div
                      className="admin-tenant-card-body"
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          border: "1px solid var(--admin-rule)",
                          color: "var(--admin-cyan)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span style={{ display: "grid", gap: 3, minWidth: 0, flex: 1 }}>
                        <span className="admin-tenant-name">{ar ? c.titleAr : c.titleEn}</span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--admin-text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ar ? c.descAr : c.descEn}
                        </span>
                      </span>
                      {c.count !== null ? (
                        <span
                          className="admin-stat-label"
                          style={{ color: "var(--admin-cyan)", flexShrink: 0 }}
                        >
                          {c.count.toLocaleString("en-US")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-h2">
            {ar ? "النسخ الاحتياطي والتعافي" : "Backup & disaster recovery"}
          </h2>
          <p className="admin-section-sub">
            {ar
              ? "تفريغ كامل لقاعدة البيانات (JSON) — لقطة تعافٍ تشمل صفوف المصادقة (تجزئات bcrypt). للمدير فقط. التصدير لكل مورد (CSV) متاح من صفحات الوحدات."
              : "Full database dump (JSON) — a recovery snapshot incl. auth rows (bcrypt hashes). ADMIN only. Per-resource CSV export lives on each module page."}
          </p>
        </div>
        <a
          href="/api/export/system-dump"
          className="admin-cta-primary"
          style={{ width: "fit-content" }}
        >
          {ar ? "تنزيل التفريغ الكامل" : "Download full system dump"}
        </a>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "cyan" }) {
  return (
    <div className="admin-stat-tile">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value" data-accent={accent ?? "neutral"}>
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}
