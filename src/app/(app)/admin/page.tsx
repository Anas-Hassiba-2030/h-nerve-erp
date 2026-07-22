// /admin — "العمليات / Operations" hub (renamed from "The Core"). The single
// business entry point into the ERP: the front-office operator surfaces
// (invoicing, POS, treasury,
// purchasing, payroll, assets, manufacturing) FIRST, then the raw back-office
// consoles (imports, inventory, orders, books). Same conventions as the admin
// family ((app) group, Heritage Modern daylight register, auth inherited from
// the (app) layout, server component). Query-free — each console carries its
// own KPIs — plus a one-click demo-data seed for the whole back office.

import Link from "next/link";
import {
  Inbox, Map as MapIcon, Package, ArrowLeftRight, Warehouse, Truck,
  ShoppingCart, ShoppingBag, Users, UserSquare, BookOpen, Library,
  BrainCircuit, FileText, GitBranch, ReceiptText, CreditCard, Landmark,
  Banknote, Scale, Building2, Factory, CalendarDays, CalendarRange, Wallet, PackageSearch,
  Handshake, Hourglass, ClipboardCheck, Wrench, CalendarClock,
} from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { SeedErpButton } from "@/components/genesis/SeedErpButton";
import "../daylight.css";

type GroupId =
  | "sales" | "purchasing" | "treasury" | "inventory" | "hr" | "parties" | "data";

type Console = {
  href: string;
  ar: string;
  en: string;
  desc_ar: string;
  desc_en: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  group: GroupId;
};

// Front office FIRST (the operator surfaces the user reaches every day), then
// the raw back-office consoles. Every href is a real, reachable route.
const CONSOLES: Console[] = [
  // ── Sales & invoicing (front-office sales cycle, incl. sales orders) ──
  { href: "/invoices",     ar: "الفواتير",         en: "Invoices",        icon: FileText,    group: "sales",        desc_ar: "إصدار فواتير المبيعات وتحصيلها.",              desc_en: "Issue and collect sales invoices." },
  { href: "/estimates",    ar: "عروض الأسعار",     en: "Estimates",       icon: GitBranch,   group: "sales",        desc_ar: "عروض أسعار قابلة للتحويل إلى فواتير.",         desc_en: "Quotes that convert into invoices." },
  { href: "/pos",          ar: "نقطة البيع",       en: "Point of Sale",   icon: ShoppingCart,group: "sales",        desc_ar: "جلسات نقدية وبيع مباشر.",                      desc_en: "Cash sessions and direct retail sales." },
  { href: "/e-invoicing",  ar: "الفوترة الإلكترونية", en: "E-Invoicing",  icon: ReceiptText, group: "sales",        desc_ar: "الفوترة الإلكترونية المتوافقة (الأردن).",       desc_en: "Compliant e-invoicing (Jordan)." },
  { href: "/admin/sales-orders",    ar: "أوامر البيع",  en: "Sales Orders",    icon: ShoppingBag,  group: "sales", desc_ar: "أوامر البيع للعملاء ودورة التنفيذ.",          desc_en: "Customer sales orders and fulfilment." },
  // ── Purchasing (front-office purchase cycle, incl. purchase orders) ──
  { href: "/purchase-invoices", ar: "فواتير المشتريات", en: "Purchase Invoices", icon: ShoppingBag, group: "purchasing", desc_ar: "فواتير المورّدين والالتزامات.",           desc_en: "Supplier bills and payables." },
  { href: "/purchase-payments", ar: "دفعات الموردين",   en: "Supplier Payments", icon: Banknote,    group: "purchasing", desc_ar: "سداد المورّدين من الخزائن.",              desc_en: "Pay suppliers from the treasuries." },
  { href: "/admin/purchase-orders", ar: "أوامر الشراء", en: "Purchase Orders", icon: ShoppingCart, group: "purchasing", desc_ar: "أوامر الشراء من المورّدين ودورة الاستلام.",   desc_en: "Supplier purchase orders and receiving." },
  { href: "/admin/replenishment",   ar: "إعادة التزويد", en: "Replenishment",  icon: PackageSearch, group: "purchasing", desc_ar: "قواعد الحد الأدنى/الأقصى ومسودات الشراء التلقائية.", desc_en: "Min/max reorder rules and one-click draft POs." },
  // ── Treasury & accounting (cash + the books) ──
  { href: "/treasuries",   ar: "الخزائن",          en: "Treasuries",      icon: Landmark,    group: "treasury",     desc_ar: "الصناديق النقدية والحسابات البنكية.",          desc_en: "Cash boxes and bank accounts." },
  { href: "/payments",     ar: "دفعات العملاء",    en: "Payments",        icon: CreditCard,  group: "treasury",     desc_ar: "تحصيل دفعات العملاء على الفواتير.",            desc_en: "Collect customer payments on invoices." },
  { href: "/statements",   ar: "القوائم المالية",  en: "Statements",      icon: Scale,       group: "treasury",     desc_ar: "الميزانية وقائمة الدخل من دفتر الأستاذ.",       desc_en: "Balance sheet and P&L from the ledger." },
  { href: "/finance/ageing", ar: "أعمار الذمم",   en: "AR/AP Ageing",    icon: Hourglass,   group: "treasury",     desc_ar: "من يدين لي ولمن أدين، وكم تأخّر السداد.",       desc_en: "Who owes you, who you owe, and how overdue." },
  { href: "/admin/reconciliation", ar: "التسوية البنكية", en: "Bank Reconciliation", icon: Landmark, group: "treasury", desc_ar: "طابق كشوفات الحساب البنكي بالدفعات المسجّلة.", desc_en: "Match bank statements against recorded payments." },
  { href: "/admin/cost-centers", ar: "مراكز التكلفة", en: "Cost Centres", icon: Building2, group: "treasury", desc_ar: "بُعد تحليلي على القيود — أرباح وخسائر لكل وحدة عمل.", desc_en: "Analytic dimension on journal entries — per-unit P&L." },
  { href: "/admin/journal",ar: "القيود",           en: "Journal",         icon: BookOpen,    group: "treasury",     desc_ar: "قيود اليومية المحاسبية مزدوجة القيد.",          desc_en: "Double-entry accounting journal." },
  { href: "/admin/accounts",ar: "الحسابات",        en: "Accounts",        icon: Library,     group: "treasury",     desc_ar: "شجرة الحسابات ودفتر الأستاذ العام.",            desc_en: "Chart of accounts and general ledger." },
  // ── Parties ──
  { href: "/crm",          ar: "إدارة العلاقات",   en: "CRM",             icon: Handshake,   group: "parties",      desc_ar: "العملاء المحتملون وخط أنابيب الفرص حتى الإغلاق.", desc_en: "Leads and the opportunity pipeline through to close." },
  { href: "/customers",    ar: "العملاء",          en: "Customers",       icon: UserSquare,  group: "parties",      desc_ar: "سجل العملاء وشروط الدفع.",                     desc_en: "Customer registry and payment terms." },
  { href: "/suppliers",    ar: "الموردون",         en: "Suppliers",       icon: Truck,       group: "parties",      desc_ar: "سجل المورّدين وشروط الدفع.",                   desc_en: "Supplier registry and payment terms." },
  // ── Inventory, assets & manufacturing (everything that's physical stock) ──
  { href: "/admin/products",   ar: "المنتجات",     en: "Products",        icon: Package,     group: "inventory",    desc_ar: "كتالوج المنتجات ووحدات القياس والأسعار.",     desc_en: "Product catalog, units, and pricing." },
  { href: "/admin/movements",  ar: "الحركات",      en: "Movements",       icon: ArrowLeftRight, group: "inventory", desc_ar: "سجل حركات المخزون الداخلة والخارجة.",         desc_en: "Ledger of inbound/outbound stock." },
  { href: "/admin/lots",       ar: "الدفعات والصلاحية", en: "Lots & Expiry", icon: PackageSearch, group: "inventory", desc_ar: "تتبّع الدفعات وتواريخ الانتهاء والصرف بالأقدم انتهاءً.", desc_en: "Batch tracking, expiry dates, and first-expired-first-out issuing." },
  { href: "/admin/quality",   ar: "إدارة الجودة",  en: "Quality (QMS)", icon: ClipboardCheck, group: "inventory", desc_ar: "نقاط فحص بحدود رقمية — الفشل يوقف الدفعة تلقائياً.", desc_en: "Checkpoints with numeric thresholds — a failure auto-quarantines the lot." },
  { href: "/admin/warehouses", ar: "المستودعات",   en: "Warehouses",      icon: Warehouse,   group: "inventory",    desc_ar: "مواقع التخزين ومستويات المخزون.",             desc_en: "Storage locations and stock levels." },
  { href: "/admin/transfers",  ar: "التحويلات",    en: "Transfers",       icon: Truck,       group: "inventory",    desc_ar: "تحويلات المخزون بين المستودعات.",             desc_en: "Stock transfers between warehouses." },
  { href: "/assets",       ar: "الأصول الثابتة",   en: "Fixed Assets",    icon: Building2,   group: "inventory",    desc_ar: "الأصول واستهلاكها الشهري.",                    desc_en: "Assets and monthly depreciation." },
  { href: "/manufacturing",ar: "التصنيع",          en: "Manufacturing",   icon: Factory,     group: "inventory",    desc_ar: "قوائم المواد وأوامر التصنيع.",                 desc_en: "Bills of materials and work orders." },
  { href: "/maintenance",  ar: "الصيانة",          en: "Maintenance",     icon: Wrench,      group: "inventory",    desc_ar: "أوامر صيانة للأصول ومراكز العمل.",             desc_en: "Maintenance orders for assets and work centres." },
  { href: "/admin/mps",    ar: "جدول الإنتاج",     en: "MPS",             icon: CalendarRange, group: "inventory",  desc_ar: "توقّع الطلب ورول-فورورد التزويد لكل منتج/فترة.", desc_en: "Demand forecast + rolling replenishment per product/period." },
  // ── HR & payroll ──
  { href: "/hr/employees", ar: "سجل الموظفين",     en: "Employees",       icon: Users,       group: "hr",           desc_ar: "سجل الموظفين ورواتبهم الأساسية.",              desc_en: "Employee records and base salaries." },
  { href: "/hr/leave",     ar: "طلبات الإجازة",    en: "Leave",           icon: CalendarDays,group: "hr",           desc_ar: "طلبات الإجازة والموافقات.",                    desc_en: "Leave requests and approvals." },
  { href: "/hr/payroll",   ar: "مسير الرواتب",     en: "Payroll",         icon: Wallet,      group: "hr",           desc_ar: "تشغيل الرواتب الشهرية وترحيلها.",              desc_en: "Run and post monthly payroll." },
  { href: "/hr/attendance", ar: "الحضور والورديات", en: "Attendance & Shifts", icon: CalendarClock, group: "hr",     desc_ar: "الورديات والحضور — يغذّي العمل الإضافي في الرواتب.", desc_en: "Shifts and clock-in/out — feeds overtime into payroll." },
  // ── Data & intelligence (ingest + AI insights) ──
  { href: "/admin/imports",  ar: "الاستيراد",      en: "Imports",         icon: Inbox,       group: "data",         desc_ar: "استيراد ملفات البيانات ومتابعة معالجتها.",    desc_en: "Import data files and track processing." },
  { href: "/admin/mappings", ar: "الربط",          en: "Mappings",        icon: MapIcon,     group: "data",         desc_ar: "ربط أعمدة الملفات المستوردة بحقول النظام.",    desc_en: "Map imported columns to system fields." },
  { href: "/admin/brain",    ar: "دماغ النواة",    en: "Core Brain",      icon: BrainCircuit,group: "data",         desc_ar: "رؤى ذكية على دفاتر الباك أوفيس.",              desc_en: "AI insights over the back-office books." },
];

const GROUP_LABELS: Record<GroupId, { ar: string; en: string }> = {
  sales:      { ar: "المبيعات والفوترة",       en: "Sales & Invoicing" },
  purchasing: { ar: "المشتريات",               en: "Purchasing" },
  treasury:   { ar: "الخزينة والمحاسبة",       en: "Treasury & Accounting" },
  parties:    { ar: "الأطراف",                 en: "Parties" },
  inventory:  { ar: "المخزون والأصول والتصنيع", en: "Inventory, Assets & Manufacturing" },
  hr:         { ar: "الموارد البشرية",         en: "Human Resources" },
  data:       { ar: "البيانات والذكاء",        en: "Data & Intelligence" },
};
const GROUP_ORDER: GroupId[] = [
  "sales", "purchasing", "treasury", "parties", "inventory", "hr", "data",
];

export default async function CoreHubPage() {
  const ar = (await getLocale()) === "ar";
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={ar ? "النظام · الباك أوفيس" : "System · Back office"}
        title={ar ? "العمليات" : "Operations"}
        subtitle={
          ar
            ? "الباك أوفيس التشغيلي الكامل — من الفوترة ونقطة البيع والخزائن إلى المحاسبة والرواتب والتصنيع. كل وحدة على بُعد نقرة."
            : "The full operational back office — from invoicing, POS, and treasuries to accounting, payroll, and manufacturing. Every console one click away."
        }
        status={ar ? `${CONSOLES.length} وحدة` : `${CONSOLES.length} consoles`}
      />

      {isAdmin ? (
        <div
          className="panel"
          style={{ marginBottom: 20, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>
              {ar ? "بيانات تجريبية للباك أوفيس" : "Back-office demo data"}
            </div>
            <div className="text-xs" style={{ color: "var(--ink-muted)", marginTop: 2 }}>
              {ar
                ? "تعبئة عملاء ومورّدين وفواتير ودفعات وخزائن وأصول ورواتب — بنقرة واحدة. آمن لإعادة التشغيل."
                : "Populate customers, suppliers, invoices, payments, treasuries, assets, and payroll in one click. Safe to re-run."}
            </div>
          </div>
          <SeedErpButton ar={ar} />
        </div>
      ) : null}

      {/* True masonry: CSS multi-column, not CSS grid. A grid's row TRACK
          height is set by the tallest cell in that row band, so uneven
          section heights (5-item Sales next to 2-item Parties) leave dead
          whitespace under every shorter column. Columns instead let each
          section stack tight in whichever column has room next. */}
      {/* ONE card per column-row — never a nested 2-up grid. The nested grid
          put 6 tiles across the canvas, collapsing each to ~250px so copy
          wrapped after two words. But the real lever is the COLUMN COUNT, not
          full-width cards: at 3 columns a tile is ~537px holding a ~35-char
          description, which reads as an empty shelf rather than as luxury.
          Owner picked 5 columns (denser, closer to one screen). The breakpoints
          below are NOT Tailwind's defaults, deliberately: the default ladder
          (md/lg/xl/2xl = 768/1024/1280/1536) puts 5 columns at 1536px, where a
          tile computes to 264px — narrower than the nested-grid layout this
          whole redesign replaced, and right back to wrapping Arabic titles
          mid-word.

          Each breakpoint below is derived from the arithmetic instead:
            tile = (min(vw, 2080) − 2×40 padding − 34×(n−1) gaps) ÷ n
          and every step is placed at the width where its column count first
          clears ~337px — the tile width #322 shipped and the owner accepted,
          NOT a rounder-looking 350, because a stricter floor pushes 4 columns
          past 1536 and a 125%-scaled 1920 monitor then drops to THREE. Fewer
          columns is the opposite of what was asked for.
            2 cols from  820px → ~368px      4 cols from 1530px → ~337px
            3 cols from 1180px → ~347px      5 cols from 1900px → ~337px
          So a 1920 monitor at 100% scaling gets 5 columns at ~341px, and the
          same monitor at 125% (1536 CSS px) gets 4 at ~338px. */}
      <div
        className="columns-1 min-[820px]:columns-2 min-[1180px]:columns-3 min-[1530px]:columns-4 min-[1900px]:columns-5"
        style={{ columnGap: 34 }}
      >
        {GROUP_ORDER.map((g) => {
          const items = CONSOLES.filter((c) => c.group === g);
          if (items.length === 0) return null;
          return (
            <section key={g} className="break-inside-avoid" style={{ marginBottom: 40 }}>
              {/* Emerald, NOT gold: gold (#c2a35a) on cream (#fefcf7) is only
                  2.36:1 — it fails WCAG AA (4.5:1) outright, so a gold group
                  label buys decoration at the cost of legibility. Emerald is
                  9.35:1 and still on-brand; gold survives as the tick rule. */}
              {/* Arabic is CURSIVE — letter-spacing wedges gaps into joined
                  glyph runs and visually shreds the word, and uppercase is a
                  no-op for a script with no case. Both are Latin-only affordances,
                  so they are applied only when the locale is English. Arabic
                  gets a slightly larger size instead, which is how that script
                  actually gains presence. */}
              <div
                className="flex items-center gap-2.5 font-bold"
                style={{
                  color: "var(--emerald)",
                  fontSize: ar ? 15.5 : 13,
                  letterSpacing: ar ? 0 : ".13em",
                  textTransform: ar ? "none" : "uppercase",
                  marginBottom: 14,
                  paddingInlineStart: 2,
                }}
              >
                <span
                  aria-hidden
                  style={{ width: 18, height: 2, background: "var(--gold)", borderRadius: 2, flexShrink: 0 }}
                />
                <span>{ar ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en}</span>
                <span className="font-semibold normal-case" style={{ letterSpacing: 0, color: "var(--ink-muted)" }}>
                  {items.length}
                </span>
              </div>
              <div className="grid" style={{ gap: 18 }}>
                {items.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="panel reveal flex items-start"
                      style={{ marginBottom: 0, padding: "24px 26px", gap: 16 }}
                    >
                      <Icon
                        className="shrink-0"
                        style={{ color: "var(--emerald)", width: 28, height: 28, marginTop: 2 }}
                      />
                      {/* Arabic needs ~20-25% more size than Latin at the same
                          nominal px to read equally well (connected letterforms,
                          diacritics, ligatures) — so each slot is sized by the
                          SCRIPT it actually carries, not by one flat number.
                          In Arabic locale the title/description are Arabic and
                          the companion label is Latin; in English it is the
                          reverse, so the two sizes swap with the locale. */}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline" style={{ columnGap: 9 }}>
                          <span
                            className="font-extrabold"
                            style={{ color: "var(--ink)", fontSize: ar ? 23 : 19, letterSpacing: ar ? 0 : "-.01em" }}
                          >
                            {ar ? c.ar : c.en}
                          </span>
                          <span style={{ color: "var(--ink-muted)", fontSize: ar ? 14 : 15.5 }}>
                            {ar ? c.en : c.ar}
                          </span>
                        </span>
                        <span
                          className="block"
                          style={{
                            color: "var(--ink-muted)",
                            fontSize: ar ? 18 : 15,
                            lineHeight: ar ? 1.8 : 1.6,
                            marginTop: 7,
                          }}
                        >
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
      </div>
    </DaylightShell>
  );
}
