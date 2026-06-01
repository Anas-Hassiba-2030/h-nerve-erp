"use client";

// ConstellationRail — horizontal pill-strip nav showing all sections in the
// current group, with the active section highlighted. Equivalent of the
// #al-rail auto-mounted by app-layer.js (lines 262-285). Placed just below
// the page's ribbon/header in app/(app)/layout.tsx.
//
// Uses usePathname() directly (not a prop) so the rail updates on every
// client-side navigation without needing a page refresh — fixes the bug
// where the previous group's rail would stick after navigating.

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type Locale = "ar" | "en";

interface Child {
  label: string;
  labelEn: string;
  route: string;
}

interface Group {
  id: string;
  nameAr: string;
  nameEn: string;
  children: Child[];
}

// GROUPS mirrors the orrery hub groupings so every route shows its sibling rail.
const GROUPS: Group[] = [
  {
    id: "sectors",
    nameAr: "القطاعات",
    nameEn: "Sectors",
    children: [
      { label: "أرينا",          labelEn: "Arena",    route: "/hotels" },
      { label: "المها",          labelEn: "Maha",     route: "/dairy" },
      { label: "لوران",          labelEn: "Farms",    route: "/farms" },
      { label: "الأهلية",        labelEn: "Education",route: "/education" },
      { label: "الحوراني",       labelEn: "Holding",  route: "/companies" },
      { label: "سلسلة التوريد",  labelEn: "Supply",   route: "/supply-chain" },
    ],
  },
  {
    id: "intel",
    nameAr: "العقل",
    nameEn: "Brain",
    children: [
      { label: "الدماغ",        labelEn: "Brain",     route: "/brain" },
      { label: "الرؤى",         labelEn: "Insights",  route: "/insights" },
      { label: "التنبيهات",     labelEn: "Alerts",    route: "/alerts" },
      { label: "الخطط",         labelEn: "Plans",     route: "/plans" },
      { label: "الوثائق",       labelEn: "Documents", route: "/documents" },
      { label: "الرسم السببي",  labelEn: "Graph",     route: "/brain/graph" },
      { label: "ماذا لو",       labelEn: "What-If",   route: "/brain/scenarios" },
      { label: "المجلس",        labelEn: "Council",   route: "/brain/council" },
      { label: "الذاكرة",       labelEn: "Memory",    route: "/brain/memory" },
      { label: "التعلّم",       labelEn: "Learning",  route: "/brain/learning" },
      { label: "المخرجات",      labelEn: "Narrate",   route: "/brain/narrate" },
      { label: "الثقة",         labelEn: "Trust",     route: "/brain/trust" },
      { label: "ذكاء الدماغ",   labelEn: "IQ",        route: "/brain/iq" },
    ],
  },
  {
    id: "finance",
    nameAr: "المالية",
    nameEn: "Finance",
    children: [
      { label: "المركز المالي",  labelEn: "Finance",       route: "/finance" },
      { label: "التحليلات",     labelEn: "Analytics",     route: "/analytics" },
      { label: "مقارنة",        labelEn: "Compare",       route: "/compare" },
      { label: "الأسواق",       labelEn: "Markets",       route: "/markets" },
      { label: "التقارير",      labelEn: "Reports",       route: "/reports" },
      { label: "الاستدامة",     labelEn: "Sustainability", route: "/sustainability" },
      { label: "المشاريع",      labelEn: "Projects",      route: "/projects" },
    ],
  },
  {
    id: "team",
    nameAr: "الفريق",
    nameEn: "Team",
    children: [
      { label: "المراسلات",    labelEn: "Messages",     route: "/messages" },
      { label: "المهام",       labelEn: "Tasks",        route: "/tasks" },
      { label: "صندوق الوارد", labelEn: "Inbox",        route: "/inbox" },
      { label: "الموجز",       labelEn: "Digest",       route: "/digest" },
      { label: "الموظفون",     labelEn: "Employees",    route: "/employees" },
      { label: "الإنجازات",    labelEn: "Achievements", route: "/achievements" },
      { label: "المستخدمون",   labelEn: "Users",        route: "/users" },
    ],
  },
  {
    id: "system",
    nameAr: "النظام",
    nameEn: "System",
    children: [
      { label: "مساحة العمل",  labelEn: "Workspace",    route: "/workspace" },
      { label: "الأتمتة",      labelEn: "Workflows",    route: "/workflows" },
      { label: "التكاملات",    labelEn: "Integrations", route: "/integrations" },
      { label: "التدقيق",      labelEn: "Audit",        route: "/audit-360" },
      { label: "سجل النشاط",   labelEn: "Activity",     route: "/activity" },
      { label: "الإعدادات",    labelEn: "Settings",     route: "/settings" },
      { label: "المساعدة",     labelEn: "Help",         route: "/help" },
      { label: "خارطة الطريق", labelEn: "Roadmap",      route: "/roadmap" },
    ],
  },
];

/** Return the group that owns `currentPath`, or null if no match. */
function detectGroup(currentPath: string): Group | null {
  // Normalise: strip query/hash, ensure leading slash
  const path = currentPath.split("?")[0].split("#")[0] || "/";
  for (const group of GROUPS) {
    if (group.children.some((c) => path === c.route || path.startsWith(c.route + "/"))) {
      return group;
    }
  }
  return null;
}

export function ConstellationRail({ locale }: { locale: Locale }) {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = usePathname() ?? "";
  const group = detectGroup(currentPath);

  // No group match → don't render anything.
  if (!group) return null;

  const groupLabel = locale === "ar" ? group.nameAr : group.nameEn;

  return (
    <nav
      id="al-rail"
      className="al-rail light"
      aria-label={groupLabel}
      data-collapsed={collapsed ? "true" : undefined}
    >
      <span className="rail-grp">{groupLabel}</span>

      {group.children.map((child) => {
        const label = locale === "ar" ? child.label : child.labelEn;
        const isCurrent =
          currentPath === child.route ||
          currentPath.startsWith(child.route + "/");

        if (collapsed && !isCurrent) return null;

        return (
          <Link
            key={child.route}
            href={child.route}
            className={`rail-item${isCurrent ? " cur" : ""}`}
            aria-current={isCurrent ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}

      <button
        className="rail-toggle"
        title={locale === "ar" ? "طيّ/توسيع" : "Collapse / expand"}
        aria-label={locale === "ar" ? "طيّ/توسيع" : "Collapse / expand"}
        onClick={() => setCollapsed((c) => !c)}
      >
        ⇆
      </button>
    </nav>
  );
}
