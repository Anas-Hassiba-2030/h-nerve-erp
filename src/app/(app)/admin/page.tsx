// /admin — "النواة / The Core" hub. The landing page of the ERP
// back-office family: a static, light directory of the 13 consoles
// (imports → mappings → inventory → orders → parties → books → brain).
// Same conventions as the admin family ((app) group, Heritage Modern
// daylight register, auth inherited from the (app) layout, server
// component). Deliberately query-free — this page must stay light;
// each console carries its own KPIs.

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
  BrainCircuit,
} from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import "../daylight.css";

type GroupId = "ingest" | "inventory" | "orders" | "parties" | "books" | "intelligence";

type Console = {
  href: string;
  ar: string;
  en: string;
  desc_ar: string;
  desc_en: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  group: GroupId;
};

// The 13 back-office consoles, clustered by accountant-meaning — the same
// grouping AdminFamilyNav uses on every console page.
const CONSOLES: Console[] = [
  { href: "/admin/imports",         ar: "الاستيراد",    en: "Imports",         icon: Inbox,          group: "ingest",       desc_ar: "استيراد ملفات البيانات ومتابعة معالجتها.",            desc_en: "Import data files and track their processing." },
  { href: "/admin/mappings",        ar: "الربط",        en: "Mappings",        icon: MapIcon,        group: "ingest",       desc_ar: "ربط أعمدة الملفات المستوردة بحقول النظام.",           desc_en: "Map imported file columns to system fields." },
  { href: "/admin/products",        ar: "المنتجات",     en: "Products",        icon: Package,        group: "inventory",    desc_ar: "كتالوج المنتجات ووحدات القياس والأسعار.",             desc_en: "Product catalog, units, and pricing." },
  { href: "/admin/movements",       ar: "الحركات",      en: "Movements",       icon: ArrowLeftRight, group: "inventory",    desc_ar: "سجل حركات المخزون الداخلة والخارجة.",                 desc_en: "Ledger of inbound and outbound stock movements." },
  { href: "/admin/warehouses",      ar: "المستودعات",   en: "Warehouses",      icon: Warehouse,      group: "inventory",    desc_ar: "مواقع التخزين ومستويات المخزون لكل مستودع.",          desc_en: "Storage locations and per-warehouse stock levels." },
  { href: "/admin/transfers",       ar: "التحويلات",    en: "Transfers",       icon: Truck,          group: "inventory",    desc_ar: "تحويلات المخزون بين المستودعات.",                     desc_en: "Stock transfers between warehouses." },
  { href: "/admin/purchase-orders", ar: "أوامر الشراء", en: "Purchase Orders", icon: ShoppingCart,   group: "orders",       desc_ar: "أوامر الشراء من المورّدين ودورة الاستلام.",           desc_en: "Supplier purchase orders and the receiving cycle." },
  { href: "/admin/sales-orders",    ar: "أوامر البيع",  en: "Sales Orders",    icon: ShoppingBag,    group: "orders",       desc_ar: "أوامر البيع للعملاء ودورة التنفيذ.",                  desc_en: "Customer sales orders and the fulfilment cycle." },
  { href: "/admin/suppliers",       ar: "الموردون",     en: "Suppliers",       icon: Users,          group: "parties",      desc_ar: "سجل المورّدين وشروط الدفع.",                          desc_en: "Supplier registry and payment terms." },
  { href: "/admin/customers",       ar: "العملاء",      en: "Customers",       icon: UserSquare,     group: "parties",      desc_ar: "سجل العملاء وأوامر البيع المرتبطة بهم.",              desc_en: "Customer registry and their linked sales orders." },
  { href: "/admin/journal",         ar: "القيود",       en: "Journal",         icon: BookOpen,       group: "books",        desc_ar: "قيود اليومية المحاسبية مزدوجة القيد.",                desc_en: "Double-entry accounting journal." },
  { href: "/admin/accounts",        ar: "الحسابات",     en: "Accounts",        icon: Library,        group: "books",        desc_ar: "شجرة الحسابات ودفتر الأستاذ العام.",                  desc_en: "Chart of accounts and the general ledger." },
  { href: "/admin/brain",           ar: "دماغ النواة",  en: "Core Brain",      icon: BrainCircuit,   group: "intelligence", desc_ar: "رؤى ذكية على دفاتر الباك أوفيس — مخزون منخفض وتوصيات.", desc_en: "AI insights over the back-office books — low stock, reorders." },
];

const GROUP_LABELS: Record<GroupId, { ar: string; en: string }> = {
  ingest:       { ar: "الاستيعاب", en: "Ingest" },
  inventory:    { ar: "المخزون",   en: "Inventory" },
  orders:       { ar: "الطلبات",   en: "Orders" },
  parties:      { ar: "الأطراف",   en: "Parties" },
  books:        { ar: "الدفاتر",   en: "Books" },
  intelligence: { ar: "الذكاء",    en: "Intelligence" },
};
const GROUP_ORDER: GroupId[] = ["ingest", "inventory", "orders", "parties", "books", "intelligence"];

export default async function CoreHubPage() {
  const ar = (await getLocale()) === "ar";

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "النظام · الباك أوفيس" : "System · Back office"}
        title={ar ? "النواة" : "The Core"}
        subtitle={
          ar
            ? "الباك أوفيس التشغيلي — 13 وحدة تُدار منها دفاتر المجموعة: من الاستيراد إلى القيود."
            : "The operational back office — 13 consoles running the group's books, from imports to journal entries."
        }
        status={ar ? "13 وحدة" : "13 consoles"}
      />

      {GROUP_ORDER.map((g) => {
        const items = CONSOLES.filter((c) => c.group === g);
        return (
          <section key={g} className="mb-6">
            <div
              className="mb-2 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="panel reveal flex items-start gap-3"
                    style={{ marginBottom: 0, padding: "18px 20px" }}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--emerald)" }} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                          {ar ? c.ar : c.en}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {ar ? c.en : c.ar}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                        {ar ? c.desc_ar : c.desc_en}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </DaylightShell>
  );
}
