// Shared cross-link cluster for the import/inventory/orders admin family
// (Phase 6). This family lives under (app) but is NOT in the main
// Sidebar (only /admin/tenants is) — discoverability is via this Topbar
// `actions` cluster, the established pattern. One definition so the set
// can't drift as the family grows.

import Link from "next/link";

const FAMILY: { href: string; ar: string; en: string }[] = [
  { href: "/admin/imports", ar: "الاستيراد", en: "Imports" },
  { href: "/admin/products", ar: "المنتجات", en: "Products" },
  { href: "/admin/movements", ar: "الحركات", en: "Movements" },
  { href: "/admin/mappings", ar: "الخرائط", en: "Mappings" },
  { href: "/admin/purchase-orders", ar: "أوامر الشراء", en: "Purchase Orders" },
  { href: "/admin/sales-orders", ar: "أوامر البيع", en: "Sales Orders" },
  { href: "/admin/suppliers", ar: "المورّدون", en: "Suppliers" },
  { href: "/admin/customers", ar: "العملاء", en: "Customers" },
];

export function AdminFamilyNav({
  current,
  ar,
  extra,
}: {
  /** The current page's href — omitted from its own cluster. */
  current: string;
  ar: boolean;
  /** Page-specific action(s) to render alongside the links (e.g. the
   *  imports "Clear test imports" button). */
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FAMILY.filter((f) => f.href !== current).map((f) => (
        <Link key={f.href} href={f.href} className="btn-ghost btn-sm">
          {ar ? f.ar : f.en}
        </Link>
      ))}
      {extra}
    </div>
  );
}
