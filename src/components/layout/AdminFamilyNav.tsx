// Shared section nav for the ERP back-office family — the 12 admin pages
// (Imports, Mappings, Products, Movements, Warehouses, Transfers,
// Purchase/Sales Orders, Suppliers, Customers, Journal, Accounts).
//
// The previous version was a flat row of small ghost pills that HID the
// current section (filter), which left the operator with no "you are here"
// signal. The redesign clusters the tabs by accountant-meaning
// (Ingest · Inventory · Orders · Parties · Books), gives each tab an icon
// + a real active state, and uses the Heritage Daylight tokens already
// scoped under .dl-page (every page in the family is daylight-shelled).

import Link from "next/link";
import {
  Inbox,
  Map as MapIcon,
  Package,
  ArrowLeftRight,
  Warehouse,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Users,
  UserSquare,
  BookOpen,
  Library,
  PackageSearch,
  CalendarRange,
  Handshake,
  Hourglass,
  Landmark,
} from "lucide-react";

type Item = {
  href: string;
  ar: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
  group: GroupId;
};
type GroupId = "ingest" | "inventory" | "orders" | "parties" | "books";

const FAMILY: Item[] = [
  { href: "/admin/imports",         ar: "الاستيراد",   en: "Imports",         icon: Inbox,          group: "ingest" },
  { href: "/admin/mappings",        ar: "الخرائط",      en: "Mappings",        icon: MapIcon,        group: "ingest" },
  { href: "/admin/products",        ar: "المنتجات",     en: "Products",        icon: Package,        group: "inventory" },
  { href: "/admin/movements",       ar: "الحركات",      en: "Movements",       icon: ArrowLeftRight, group: "inventory" },
  { href: "/admin/lots",              ar: "الدفعات والصلاحية", en: "Lots & Expiry", icon: PackageSearch,  group: "inventory" },
  { href: "/admin/warehouses",      ar: "المستودعات",  en: "Warehouses",      icon: Warehouse,      group: "inventory" },
  { href: "/admin/transfers",       ar: "التحويلات",   en: "Transfers",       icon: Truck,          group: "inventory" },
  { href: "/admin/purchase-orders", ar: "أوامر الشراء", en: "Purchase Orders", icon: ShoppingCart,   group: "orders" },
  { href: "/admin/sales-orders",    ar: "أوامر البيع",  en: "Sales Orders",    icon: ShoppingBag,    group: "orders" },
  { href: "/admin/replenishment",   ar: "إعادة التزويد", en: "Replenishment",  icon: PackageSearch,  group: "orders" },
  { href: "/admin/mps",             ar: "جدول الإنتاج",  en: "MPS",             icon: CalendarRange,  group: "orders" },
  { href: "/crm",                   ar: "إدارة العلاقات", en: "CRM",             icon: Handshake,      group: "parties" },
  { href: "/suppliers",             ar: "المورّدون",    en: "Suppliers",       icon: Users,          group: "parties" },
  { href: "/customers",             ar: "العملاء",      en: "Customers",       icon: UserSquare,     group: "parties" },
  { href: "/admin/journal",         ar: "اليومية",      en: "Journal",         icon: BookOpen,       group: "books" },
  { href: "/admin/accounts",        ar: "الحسابات",     en: "Accounts",        icon: Library,        group: "books" },
  { href: "/finance/ageing",        ar: "أعمار الذمم",  en: "AR/AP Ageing",    icon: Hourglass,      group: "books" },
  { href: "/admin/reconciliation",  ar: "التسوية البنكية", en: "Bank Reconciliation", icon: Landmark, group: "books" },
];

const GROUP_LABELS: Record<GroupId, { ar: string; en: string }> = {
  ingest:    { ar: "الاستيعاب", en: "Ingest" },
  inventory: { ar: "المخزون",  en: "Inventory" },
  orders:    { ar: "الطلبات",  en: "Orders" },
  parties:   { ar: "الأطراف",  en: "Parties" },
  books:     { ar: "الدفاتر",  en: "Books" },
};
const GROUP_ORDER: GroupId[] = ["ingest", "inventory", "orders", "parties", "books"];

export function AdminFamilyNav({
  current,
  ar,
  extra,
}: {
  /** The current page's href — highlighted in place, never hidden. */
  current: string;
  ar: boolean;
  /** Page-specific action(s) rendered at the end of the bar. */
  extra?: React.ReactNode;
}) {
  return (
    <nav className="afn-bar" aria-label={ar ? "أقسام الإدارة" : "Back-office sections"}>
      {GROUP_ORDER.map((g) => {
        const items = FAMILY.filter((f) => f.group === g);
        const label = ar ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en;
        return (
          <div key={g} className="afn-cluster">
            <div className="afn-cluster-head">{label}</div>
            <div className="afn-cluster-tabs">
              {items.map((f) => {
                const Icon = f.icon;
                const isCurrent = f.href === current;
                return (
                  <Link
                    key={f.href}
                    href={f.href}
                    className={`afn-tab${isCurrent ? " afn-cur" : ""}`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    <Icon className="afn-tab-icon h-4 w-4" />
                    <span>{ar ? f.ar : f.en}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      {extra ? <div className="afn-extra">{extra}</div> : null}
    </nav>
  );
}
