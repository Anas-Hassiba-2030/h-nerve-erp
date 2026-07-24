// Single source of truth for the Orrery navigation groups used by the React
// surfaces — the mini-orbit popup (components/orrery/MiniOrrery.tsx) and the
// sibling rail (components/orrery/ConstellationRail.tsx).
//
// These SEVEN groups MUST stay 1-to-1 (same set, same ORDER) with the main
// Orrery hub served at public/hub/index.html (the GROUPS array there). The
// hub uses design-export section hrefs; here we use real Next routes — same
// destinations, different href scheme. PR #256 merged the old standalone
// "Sectors" anchor into "Group Board", so the sector businesses (Arena, Maha,
// Loran, …) live under the board that governs them. Before this file the two
// React components hand-duplicated the list and had drifted back to 6 groups —
// that is the divergence this module removes.
//
// 2026-06-28 light trim: Workspace moved into Group Board (it is company-level)
// and Roadmap dropped from the menu. This file is the source of truth for the
// React mini-orbit, which now appears in EVERY section. The public/orrery hub
// bloom's own group arrays were intentionally NOT edited in the same change —
// that file is the animated signature surface and its kid arrays are
// index-aligned AR/EN, so sync it there only as a deliberate, isolated step.

export interface OrreryChild {
  label: string;
  labelEn: string;
  route: string;
}

/**
 * A named cluster inside a group.
 *
 * Only Intelligence has these, and only because it has 14 children — double
 * the next-largest group. Fourteen flat pills overflowed the header rail into
 * ragged rows and scattered the mini-orbit ring (owner, 2026-07-24: "the
 * sections appear like that in the small orbit… the header sections are too
 * much"). The constraint was explicit: keep every section IN Intelligence,
 * don't shrink anything — organize it.
 *
 * So the 14 are clustered by the QUESTION each section answers, not by route:
 * what's happening (الرؤى) → what to do (الإجراءات) → decide (القرار) → can I
 * trust it (الثقة). That is also the order an operator moves through them.
 */
export interface OrrerySubgroup {
  id: string;
  nameAr: string;
  nameEn: string;
  children: OrreryChild[];
}

export interface OrreryGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  /**
   * Every section in the group, flat. Stays the canonical list — route
   * matching (`detectOrreryGroup`), the collapse toggle, and any future
   * consumer read this and need no knowledge of clustering.
   */
  children: OrreryChild[];
  /** Optional presentation clustering. Absent on the six small groups. */
  subgroups?: OrrerySubgroup[];
}

/**
 * Intelligence's four clusters. `children` on the group below is DERIVED from
 * this array, so the flat list and the clustered view can never drift apart —
 * adding a section here is the single edit that ships it everywhere.
 */
const INTEL_SUBGROUPS: OrrerySubgroup[] = [
  {
    // What is happening — the read-only picture.
    id: "insight",
    nameAr: "الرؤى",
    nameEn: "Insight",
    children: [
      { label: "مركز الذكاء", labelEn: "Intelligence Hub", route: "/brain" },
      { label: "رؤى الأعمال", labelEn: "Business Insights", route: "/insights" },
      { label: "الملخصات التنفيذية", labelEn: "Executive Briefings", route: "/brain/narrate" },
      { label: "مقارنات القطاع", labelEn: "Industry Benchmarks", route: "/brain/benchmarks" },
    ],
  },
  {
    // What to do about it — the surfaces that demand an action.
    id: "act",
    nameAr: "الإجراءات",
    nameEn: "Act",
    children: [
      { label: "التنبيهات", labelEn: "Alerts", route: "/alerts" },
      { label: "خطط العمل", labelEn: "Action Plans", route: "/plans" },
      { label: "الوثائق", labelEn: "Documents", route: "/documents" },
    ],
  },
  {
    // Weighing a decision before making it.
    id: "decide",
    nameAr: "القرار",
    nameEn: "Decide",
    children: [
      { label: "تحليل التأثير", labelEn: "Impact Analysis", route: "/brain/graph" },
      { label: "تخطيط السيناريوهات", labelEn: "Scenario Planning", route: "/brain/scenarios" },
      { label: "المجلس الاستشاري", labelEn: "Advisory Council", route: "/brain/council" },
      { label: "ذاكرة القرارات", labelEn: "Decision Memory", route: "/brain/memory" },
    ],
  },
  {
    // Whether the answer can be trusted, and whether it is getting better.
    id: "trust",
    nameAr: "الثقة",
    nameEn: "Trust",
    children: [
      { label: "التحقق من البيانات", labelEn: "Data Verification", route: "/brain/trust" },
      { label: "مؤشر الذكاء", labelEn: "Intelligence Score", route: "/brain/iq" },
      { label: "التعلّم المستمر", labelEn: "Learning", route: "/brain/learning" },
    ],
  },
];

export const ORRERY_GROUPS: OrreryGroup[] = [
  {
    // Group Board — the holding board + the sector businesses it governs
    // (Sectors folded in per #256, matching the hub's "overview" anchor).
    id: "board",
    nameAr: "لوحة المجموعة",
    nameEn: "Group Board",
    children: [
      { label: "لوحة الإدارة", labelEn: "Dashboard", route: "/dashboard" },
      { label: "الشركات", labelEn: "Companies", route: "/companies" },
      { label: "مساحة العمل", labelEn: "Workspace", route: "/workspace" },
      { label: "أرينا", labelEn: "Arena", route: "/hotels" },
      { label: "المها", labelEn: "Maha", route: "/dairy" },
      { label: "لوران", labelEn: "Loran", route: "/farms" },
      { label: "الأهلية", labelEn: "Education", route: "/education" },
      { label: "سلسلة التوريد", labelEn: "Supply Chain", route: "/supply-chain" },
    ],
  },
  {
    // Professional ERP naming pass (2026-07-24, owner-directed): the poetic
    // brain names (Narrate, What-If, IQ, Memory Lake…) confused operators.
    // Every section now carries the standard BI/ERP term it corresponds to;
    // routes are unchanged. Keep hub GROUPS/KIDS_EN + Sidebar + page <h1>s in
    // lockstep with this list.
    id: "intel",
    nameAr: "الذكاء",
    nameEn: "Intelligence",
    // Derived — never hand-maintained. See INTEL_SUBGROUPS above.
    children: INTEL_SUBGROUPS.flatMap((s) => s.children),
    subgroups: INTEL_SUBGROUPS,
  },
  // ERP taxonomy split (2026-07-23, owner-directed): the finance group had
  // swallowed 22 children (every front-office surface from PR #346) — the rail
  // wrapped into three cramped rows and the mini-orbit bloom scattered 22 pills
  // in one ring. Standard ERP practice (NetSuite/Odoo) separates the money
  // ledger from order-to-cash and procure-to-make, so the 22 split into three
  // honest groups: Finance (accounting/treasury/reporting), Sales (CRM→cash),
  // and Purchasing & Production (procure-to-pay + make/maintain).
  {
    id: "finance",
    nameAr: "المالية",
    nameEn: "Finance",
    children: [
      { label: "المركز المالي", labelEn: "Finance", route: "/finance" },
      { label: "القوائم المالية", labelEn: "Statements", route: "/statements" },
      { label: "التقارير", labelEn: "Reports", route: "/reports" },
      { label: "الخزائن", labelEn: "Treasuries", route: "/treasuries" },
      { label: "الأصول الثابتة", labelEn: "Fixed Assets", route: "/assets" },
      { label: "التحليلات", labelEn: "Analytics", route: "/analytics" },
      { label: "مقارنة", labelEn: "Compare", route: "/compare" },
      { label: "الأسواق", labelEn: "Markets", route: "/markets" },
      { label: "الاستدامة", labelEn: "Sustainability", route: "/sustainability" },
    ],
  },
  {
    id: "sales",
    nameAr: "المبيعات",
    nameEn: "Sales",
    children: [
      { label: "العلاقات", labelEn: "CRM", route: "/crm" },
      { label: "العملاء", labelEn: "Customers", route: "/customers" },
      { label: "عروض الأسعار", labelEn: "Estimates", route: "/estimates" },
      { label: "الفواتير", labelEn: "Invoices", route: "/invoices" },
      { label: "دفعات العملاء", labelEn: "Payments", route: "/payments" },
      { label: "نقطة البيع", labelEn: "Point of Sale", route: "/pos" },
      { label: "الفوترة الإلكترونية", labelEn: "E-Invoicing", route: "/e-invoicing" },
    ],
  },
  {
    id: "ops",
    nameAr: "المشتريات والإنتاج",
    nameEn: "Purchasing & Production",
    children: [
      { label: "الموردون", labelEn: "Suppliers", route: "/suppliers" },
      { label: "فواتير المشتريات", labelEn: "Purchase Invoices", route: "/purchase-invoices" },
      { label: "دفعات الموردين", labelEn: "Supplier Payments", route: "/purchase-payments" },
      { label: "التصنيع", labelEn: "Manufacturing", route: "/manufacturing" },
      { label: "الصيانة", labelEn: "Maintenance", route: "/maintenance" },
      { label: "المشاريع", labelEn: "Projects", route: "/projects" },
    ],
  },
  {
    id: "team",
    nameAr: "الفريق",
    nameEn: "Team",
    children: [
      { label: "المراسلات", labelEn: "Messages", route: "/messages" },
      { label: "المهام", labelEn: "Tasks", route: "/tasks" },
      { label: "صندوق الوارد", labelEn: "Inbox", route: "/inbox" },
      { label: "الموجز", labelEn: "Digest", route: "/digest" },
      { label: "الموظفون", labelEn: "Employees", route: "/employees" },
      { label: "الإنجازات", labelEn: "Achievements", route: "/achievements" },
      { label: "المستخدمون", labelEn: "Users", route: "/users" },
      // /hr/* is the newer HR console family (docs/HOURANI-ERP-GAPS.md), a
      // separate route tree from the legacy /employees page above — same
      // missing-rail gap as the finance additions above.
      { label: "سجل الموظفين", labelEn: "HR — Employees", route: "/hr/employees" },
      { label: "طلبات الإجازة", labelEn: "Leave", route: "/hr/leave" },
      { label: "مسير الرواتب", labelEn: "Payroll", route: "/hr/payroll" },
      { label: "الحضور والورديات", labelEn: "Attendance & Shifts", route: "/hr/attendance" },
    ],
  },
  {
    id: "system",
    nameAr: "النظام",
    nameEn: "System",
    children: [
      // Mission Control — the PLATFORM superadmin deck ONLY: tenants, users,
      // permissions, audit, raw data browser. The business/ERP consoles used to
      // be duplicated here too; they now live solely under Operations (below),
      // so each thing has exactly one home.
      { label: "غرفة العمليات", labelEn: "Mission Control", route: "/admin/system" },
      // Operations — the ERP business hub: one pill fronting every operator
      // console under /admin/* + the front-office surfaces (invoicing, POS,
      // treasury, payroll, inventory, orders, …). Renamed from "The Core".
      { label: "العمليات", labelEn: "Operations", route: "/admin" },
      { label: "الأتمتة", labelEn: "Workflows", route: "/workflows" },
      { label: "التكاملات", labelEn: "Integrations", route: "/integrations" },
      { label: "التدقيق", labelEn: "Audit", route: "/audit-360" },
      { label: "سجل النشاط", labelEn: "Activity", route: "/activity" },
      // IA split (PR #288, approved): Search / Pinned / Trash / Settings / Help
      // moved OUT of the section grid into the header UserMenu
      // (components/nav/UserMenu.tsx) — they are personal utilities, not
      // "system" surfaces. System is now 6 honest pills.
    ],
  },
];

/** Return the cluster inside `group` that owns `currentPath`, or null. */
export function detectOrrerySubgroup(
  group: OrreryGroup | null,
  currentPath: string,
): OrrerySubgroup | null {
  if (!group?.subgroups) return null;
  const path = currentPath.split("?")[0].split("#")[0] || "/";
  // Most-specific wins: "/brain" and "/brain/council" live in DIFFERENT
  // clusters, so a plain prefix test would put you in Insight while you are
  // looking at the Advisory Council.
  let best: { sub: OrrerySubgroup; len: number } | null = null;
  for (const sub of group.subgroups) {
    for (const child of sub.children) {
      if (path === child.route || path.startsWith(child.route + "/")) {
        if (!best || child.route.length > best.len) best = { sub, len: child.route.length };
      }
    }
  }
  return best?.sub ?? null;
}

/** Return the group that owns `currentPath`, or null if no match. */
export function detectOrreryGroup(currentPath: string): OrreryGroup | null {
  const path = currentPath.split("?")[0].split("#")[0] || "/";
  for (const group of ORRERY_GROUPS) {
    if (group.children.some((c) => path === c.route || path.startsWith(c.route + "/"))) {
      return group;
    }
  }
  return null;
}
