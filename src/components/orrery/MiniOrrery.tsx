"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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

// Kept in sync (manually) with the main Orrery hub (public/orrery/index.html)
// and with ConstellationRail.tsx. The mini orrery here MUST contain every
// destination the main hub exposes so the two surfaces stay coherent.
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
    id: "board",
    nameAr: "لوحة المجموعة",
    nameEn: "Group Board",
    children: [
      { label: "لوحة الإدارة",   labelEn: "Dashboard", route: "/dashboard" },
      { label: "البحث",         labelEn: "Search",    route: "/search" },
      { label: "المثبّت",        labelEn: "Pinned",    route: "/pinned" },
      { label: "الشركات",       labelEn: "Companies", route: "/companies" },
      { label: "التحليلات",     labelEn: "Analytics", route: "/analytics" },
      { label: "مقارنة",        labelEn: "Compare",   route: "/compare" },
    ],
  },
  {
    id: "system",
    nameAr: "النظام",
    nameEn: "System",
    children: [
      // Mission Control — the admin command deck (the renamed "System Hub").
      { label: "غرفة العمليات", labelEn: "Mission Control", route: "/admin/system" },
      { label: "الإمبراطورية",  labelEn: "Empire",       route: "/admin/empire" },
      { label: "المستأجرون",    labelEn: "Tenants",      route: "/admin/tenants" },
      { label: "مساحة العمل",  labelEn: "Workspace",    route: "/workspace" },
      { label: "الأتمتة",      labelEn: "Workflows",    route: "/workflows" },
      { label: "التكاملات",    labelEn: "Integrations", route: "/integrations" },
      { label: "التدقيق",      labelEn: "Audit",        route: "/audit-360" },
      { label: "سجل النشاط",   labelEn: "Activity",     route: "/activity" },
      { label: "المحذوفات",    labelEn: "Trash",        route: "/trash" },
      { label: "الإعدادات",    labelEn: "Settings",     route: "/settings" },
      { label: "المساعدة",     labelEn: "Help",         route: "/help" },
      { label: "خارطة الطريق", labelEn: "Roadmap",      route: "/roadmap" },
    ],
  },
];

interface PopupCoords {
  left: number;
  top: number;
}

export function MiniOrrery({ locale }: { locale: Locale }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopupCoords>({ left: 0, top: 0 });
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const coreLabelAr = activeGroup ? activeGroup.nameAr : "المدار";
  const coreLabelEn = activeGroup ? activeGroup.nameEn : "Orbit";
  const coreLabel = locale === "ar" ? coreLabelAr : coreLabelEn;

  // Position the popup centered on a point near the button. The popup is
  // centered via CSS transform(-50%,-50%), so coords hold the CENTER point.
  const openPopup = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const bx = r.left + r.width / 2;
    const by = r.top + r.height / 2;
    // Keep the popup center far enough from edges that the largest ring
    // (intel = 12 nodes) stays on-screen. Half the max popup is ~300px.
    const cx = Math.min(Math.max(bx, 320), window.innerWidth - 320);
    const cy = Math.min(Math.max(by, 320), window.innerHeight - 320);
    setCoords({ left: cx, top: cy });
    setActiveGroup(null);
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setOpen(false);
    setActiveGroup(null);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closePopup]);

  const handleCoreClick = () => {
    if (activeGroup) {
      // Back to groups ring
      setActiveGroup(null);
    } else {
      // On groups view → close
      closePopup();
    }
  };

  const handleGroupClick = (group: Group) => {
    setActiveGroup(group);
  };

  const handleChildClick = (route: string) => {
    closePopup();
    router.push(route);
  };

  // Build nodes to display — groups or children
  const nodes: Array<{ key: string; label: string; onPick: () => void }> =
    activeGroup
      ? activeGroup.children.map((c) => ({
          key: c.route,
          label: locale === "ar" ? c.label : c.labelEn,
          onPick: () => handleChildClick(c.route),
        }))
      : GROUPS.map((g) => ({
          key: g.id,
          label: locale === "ar" ? g.nameAr : g.nameEn,
          onPick: () => handleGroupClick(g),
        }));

  // Phase 26.3 — radius and popup size scale with node count so labels get
  // breathing room instead of crowding. A 12-node intel ring now spreads
  // wide enough that no two pills collide.
  const count = nodes.length;
  const radius = Math.round((activeGroup ? 122 : 104) + Math.max(0, count - 7) * 12);
  const popupSize = (radius + 96) * 2; // leave room for pill width + star
  const center = popupSize / 2;

  return (
    <>
      {/* The trigger button — lives inside dl-topctl (already position:fixed) */}
      <button
        ref={btnRef}
        className="mo-btn"
        aria-label={locale === "ar" ? "المدار المصغّر" : "Mini Orrery"}
        title={locale === "ar" ? "المدار المصغّر" : "Mini Orrery"}
        onClick={openPopup}
        style={{ zIndex: 71 }}
      >
        <span className="mo-ring" aria-hidden="true" />
        <span className="mo-core" aria-hidden="true" />
      </button>

      {/* Scrim — transparent, closes popup on outside click */}
      {open && (
        <div
          className="mo-scrim"
          aria-hidden="true"
          onClick={closePopup}
        />
      )}

      {/* Popup — position:fixed, positioned via JS coords */}
      {open && (
        <div
          className="mo-pop"
          style={{
            left: coords.left,
            top: coords.top,
            width: popupSize,
            height: popupSize,
            transform: "translate(-50%, -50%)",
          }}
          role="dialog"
          aria-label={locale === "ar" ? "قائمة التنقل" : "Navigation menu"}
        >
          {/* Center core button */}
          <button
            className="mo-center"
            onClick={handleCoreClick}
            aria-label={
              activeGroup
                ? locale === "ar"
                  ? "العودة للمجموعات"
                  : "Back to groups"
                : locale === "ar"
                ? "إغلاق القائمة"
                : "Close menu"
            }
          >
            {coreLabel}
          </button>

          {/* Nodes arranged in a circle */}
          {nodes.map((node, i) => {
            const angle = (-90 + i * (360 / nodes.length)) * (Math.PI / 180);
            // Positions relative to the dynamic popup center.
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            return (
              <button
                key={node.key}
                className="mo-node"
                style={{ left: x, top: y }}
                onClick={(e) => {
                  e.stopPropagation();
                  node.onPick();
                }}
              >
                <span className="mo-star" aria-hidden="true" />
                <span className="mo-lbl">{node.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
