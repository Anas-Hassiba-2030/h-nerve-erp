// Single source of truth for the Orrery navigation groups used by the React
// surfaces — the mini-orbit popup (components/orrery/MiniOrrery.tsx) and the
// sibling rail (components/orrery/ConstellationRail.tsx).
//
// These five groups MUST stay 1-to-1 (same set, same ORDER) with the main
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

export interface OrreryGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  children: OrreryChild[];
}

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
    id: "intel",
    nameAr: "العقل",
    nameEn: "The Brain",
    children: [
      { label: "الدماغ", labelEn: "Brain", route: "/brain" },
      { label: "الرؤى", labelEn: "Insights", route: "/insights" },
      { label: "التنبيهات", labelEn: "Alerts", route: "/alerts" },
      { label: "الخطط", labelEn: "Plans", route: "/plans" },
      { label: "الوثائق", labelEn: "Documents", route: "/documents" },
      { label: "الرسم السببي", labelEn: "Graph", route: "/brain/graph" },
      { label: "ماذا لو", labelEn: "What-If", route: "/brain/scenarios" },
      { label: "المجلس", labelEn: "Council", route: "/brain/council" },
      { label: "الذاكرة", labelEn: "Memory", route: "/brain/memory" },
      { label: "التعلّم", labelEn: "Learning", route: "/brain/learning" },
      { label: "المخرجات", labelEn: "Narrate", route: "/brain/narrate" },
      { label: "الثقة", labelEn: "Trust", route: "/brain/trust" },
      { label: "ذكاء الدماغ", labelEn: "IQ", route: "/brain/iq" },
    ],
  },
  {
    id: "finance",
    nameAr: "المالية",
    nameEn: "Finance",
    children: [
      { label: "المركز المالي", labelEn: "Finance", route: "/finance" },
      { label: "التحليلات", labelEn: "Analytics", route: "/analytics" },
      { label: "مقارنة", labelEn: "Compare", route: "/compare" },
      { label: "الأسواق", labelEn: "Markets", route: "/markets" },
      { label: "التقارير", labelEn: "Reports", route: "/reports" },
      { label: "الاستدامة", labelEn: "Sustainability", route: "/sustainability" },
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
