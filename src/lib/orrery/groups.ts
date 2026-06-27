// Single source of truth for the Orrery navigation groups used by the React
// surfaces — the mini-orbit popup (components/orrery/MiniOrrery.tsx) and the
// sibling rail (components/orrery/ConstellationRail.tsx).
//
// These five groups MUST stay 1-to-1 (same set, same ORDER) with the main
// Orrery hub served at public/orrery/index.html (the GROUPS array there). The
// hub uses design-export section hrefs; here we use real Next routes — same
// destinations, different href scheme. PR #256 merged the old standalone
// "Sectors" anchor into "Group Board", so the sector businesses (Arena, Maha,
// Loran, …) live under the board that governs them. Before this file the two
// React components hand-duplicated the list and had drifted back to 6 groups —
// that is the divergence this module removes.

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
      // Mission Control — the admin command deck.
      { label: "غرفة العمليات", labelEn: "Mission Control", route: "/admin/system" },
      { label: "الإمبراطورية", labelEn: "Empire", route: "/admin/empire" },
      { label: "المستأجرون", labelEn: "Tenants", route: "/admin/tenants" },
      { label: "مساحة العمل", labelEn: "Workspace", route: "/workspace" },
      { label: "الأتمتة", labelEn: "Workflows", route: "/workflows" },
      { label: "التكاملات", labelEn: "Integrations", route: "/integrations" },
      { label: "التدقيق", labelEn: "Audit", route: "/audit-360" },
      { label: "سجل النشاط", labelEn: "Activity", route: "/activity" },
      { label: "البحث", labelEn: "Search", route: "/search" },
      { label: "المثبّت", labelEn: "Pinned", route: "/pinned" },
      { label: "المحذوفات", labelEn: "Trash", route: "/trash" },
      { label: "الإعدادات", labelEn: "Settings", route: "/settings" },
      { label: "المساعدة", labelEn: "Help", route: "/help" },
      { label: "خارطة الطريق", labelEn: "Roadmap", route: "/roadmap" },
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
