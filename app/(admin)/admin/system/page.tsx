// /admin/system — superadmin SYSTEM HUB (Phase 11). Entry point into
// the operator admin family. Sleek Operator vocabulary (DESIGN-SKILL
// §1.F) to match the (admin) shell it renders inside — cyan on
// near-black, no operator chrome. NOT Heritage: this surface is the
// superadmin console, one vocabulary per surface.
//
// Keeps the federation totals header, then a 13-card grid linking every
// operator admin sub-route. Counts are best-effort badges: each is
// caught independently so a single failing query degrades to "no
// badge" instead of crashing the hub.

import Link from "next/link";
import {
  Upload, Package, ArrowLeftRight, Warehouse, Repeat, Shuffle,
  ShoppingCart, Receipt, Truck, Users, BookOpen, Landmark, Brain,
} from "lucide-react";
import { prisma, prismaUnscoped } from "@/lib/db";

export const dynamic = "force-dynamic";

type Card = {
  href: string;
  title: string;
  desc: string;
  icon: any;
  count: number | null;
};

async function n(p: Promise<number>): Promise<number | null> {
  return p.then((v) => v).catch(() => null);
}

export default async function AdminSystemPage() {
  const [tenants, brainPatterns, iqRows, memories] = await Promise.all([
    prisma.tenant.count().catch(() => 0),
    prisma.brainPattern.count().catch(() => 0),
    prisma.brainIQHistory.count().catch(() => 0),
    prisma.memory.count().catch(() => 0),
  ]);

  // 13 best-effort count badges. Plain count() (no field filters) so a
  // schema drift can never crash the hub; transfers is the one filtered
  // count (paired movements carry a transferRef — Phase 9).
  const [
    cImports, cProducts, cMovements, cWarehouses, cTransfers, cMappings,
    cPO, cSO, cSuppliers, cCustomers, cJournal, cAccounts, cBrain,
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
  ]);

  const cards: Card[] = [
    { href: "/admin/imports", title: "سجل الاستيراد", desc: "دفعات الاستيراد ومعاينتها", icon: Upload, count: cImports },
    { href: "/admin/products", title: "المنتجات", desc: "كتالوج الأصناف والمخزون", icon: Package, count: cProducts },
    { href: "/admin/movements", title: "الحركات", desc: "حركات المخزون بأنواعها", icon: ArrowLeftRight, count: cMovements },
    { href: "/admin/warehouses", title: "المستودعات", desc: "مواقع المخزون الفعلية", icon: Warehouse, count: cWarehouses },
    { href: "/admin/transfers", title: "التحويلات", desc: "نقل المخزون بين المستودعات", icon: Repeat, count: cTransfers },
    { href: "/admin/mappings", title: "التخطيطات", desc: "ترجمة حقول أنظمة المصدر", icon: Shuffle, count: cMappings },
    { href: "/admin/purchase-orders", title: "أوامر الشراء", desc: "طلبات الشراء من المورّدين", icon: ShoppingCart, count: cPO },
    { href: "/admin/sales-orders", title: "أوامر البيع", desc: "أوامر البيع للعملاء", icon: Receipt, count: cSO },
    { href: "/admin/suppliers", title: "الموردون", desc: "سجل المورّدين", icon: Truck, count: cSuppliers },
    { href: "/admin/customers", title: "العملاء", desc: "سجل العملاء", icon: Users, count: cCustomers },
    { href: "/admin/journal", title: "اليومية", desc: "قيود اليومية المحاسبية", icon: BookOpen, count: cJournal },
    { href: "/admin/accounts", title: "الحسابات", desc: "شجرة الحسابات (الأستاذ)", icon: Landmark, count: cAccounts },
    { href: "/admin/brain", title: "رؤى العقل", desc: "إشارات وتحليلات الذكاء", icon: Brain, count: cBrain },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">SUPERADMIN · SYSTEM</span>
          <h1 className="admin-h1">نظام الإدارة</h1>
          <p className="admin-sub">
            بوابة عائلة الإدارة التشغيلية — كل المسارات الإدارية في مكان واحد.
            مع إجماليات الاتحاد عبر كل مستأجر وكل نظام عقل.
          </p>
        </div>
      </header>

      <section className="admin-stats">
        <Stat label="TENANTS" value={tenants} />
        <Stat label="LEARNED PATTERNS" value={brainPatterns} accent="cyan" />
        <Stat label="IQ SNAPSHOTS" value={iqRows} accent="cyan" />
        <Stat label="MEMORIES" value={memories} accent="cyan" />
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-h2">المسارات الإدارية</h2>
          <p className="admin-section-sub">
            ١٣ مساراً — الاستيراد، المخزون، الطلبات، المحاسبة، والذكاء.
          </p>
        </div>

        <div className="admin-grid">
          {cards.map((c) => {
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
                    <span className="admin-tenant-name">{c.title}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--admin-text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.desc}
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
