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
    id: "brain",
    nameAr: "العقل",
    nameEn: "Brain",
    children: [
      { label: "الدماغ",        labelEn: "Brain",   route: "/brain" },
      { label: "الرسم السببي",  labelEn: "Graph",   route: "/brain/graph" },
      { label: "ماذا لو",       labelEn: "What-If", route: "/brain/scenarios" },
      { label: "المجلس",        labelEn: "Council", route: "/brain/council" },
      { label: "الذاكرة",       labelEn: "Memory",  route: "/brain/memory" },
      { label: "التعلّم",       labelEn: "Learning",route: "/brain/learning" },
      { label: "ذكاء الدماغ",   labelEn: "IQ",      route: "/brain/iq" },
    ],
  },
  {
    id: "finance",
    nameAr: "المالية",
    nameEn: "Finance",
    children: [
      { label: "المركز المالي", labelEn: "Finance",   route: "/finance" },
      { label: "التحليلات",    labelEn: "Analytics",  route: "/analytics" },
      { label: "مقارنة",       labelEn: "Compare",    route: "/compare" },
      { label: "التقارير",     labelEn: "Reports",    route: "/reports" },
    ],
  },
  {
    id: "team",
    nameAr: "الفريق",
    nameEn: "Team",
    children: [
      { label: "المراسلات",    labelEn: "Messages",  route: "/messages" },
      { label: "المهام",       labelEn: "Tasks",     route: "/tasks" },
      { label: "صندوق الوارد", labelEn: "Inbox",     route: "/inbox" },
      { label: "الموجز",       labelEn: "Digest",    route: "/digest" },
      { label: "الفريق",       labelEn: "Employees", route: "/employees" },
    ],
  },
  {
    id: "system",
    nameAr: "النظام",
    nameEn: "System",
    children: [
      { label: "التنبيهات",  labelEn: "Alerts",       route: "/alerts" },
      { label: "الخطط",      labelEn: "Plans",        route: "/plans" },
      { label: "الوثائق",    labelEn: "Docs",         route: "/documents" },
      { label: "التدقيق",    labelEn: "Audit",        route: "/audit-360" },
      { label: "الإنجازات",  labelEn: "Achievements", route: "/achievements" },
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

  // Position the popup near the button using viewport coordinates
  const openPopup = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const bx = r.left + r.width / 2;
    // Keep the 360px popup fully on screen horizontally
    const cx = Math.min(Math.max(bx, 190), window.innerWidth - 190);
    const topPos = Math.max(
      64,
      Math.min(r.bottom + 8, window.innerHeight - 380)
    );
    setCoords({ left: cx - 180, top: topPos });
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

  // Radius: 110 for groups, 130 for children (matches reference)
  const radius = activeGroup ? 130 : 110;

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
          style={{ left: coords.left, top: coords.top }}
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
            // Positions relative to popup center (180, 180)
            const x = 180 + Math.cos(angle) * radius;
            const y = 180 + Math.sin(angle) * radius;
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
