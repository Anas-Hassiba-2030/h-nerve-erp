"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ORRERY_GROUPS, type OrreryGroup } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

export function MiniOrrery({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<OrreryGroup | null>(null);

  // The menu is a compact dropdown anchored under the trigger (top-right
  // control cluster) — a plain vertical list, not a centered radial popup.
  // It never covers the central page content; only a small top-right area.
  const openMenu = useCallback(() => {
    setActiveGroup(null);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveGroup(null);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeMenu]);

  const handleGroupClick = (group: OrreryGroup) => {
    setActiveGroup(group);
  };

  const handleChildClick = (route: string) => {
    closeMenu();
    router.push(route);
  };

  // Drill-in / back chevrons must respect reading direction. In Arabic (RTL,
  // the default) the "forward" arrow points left and "back" points right.
  const drillChevron = locale === "ar" ? "‹" : "›";
  const backChevron = locale === "ar" ? "›" : "‹";

  return (
    <>
      {/* The trigger button — lives inside dl-topctl (already position:fixed) */}
      <button
        className="mo-btn"
        aria-label={locale === "ar" ? "المدار المصغّر" : "Mini Orrery"}
        title={locale === "ar" ? "المدار المصغّر" : "Mini Orrery"}
        onClick={openMenu}
        style={{ zIndex: 71 }}
      >
        <span className="mo-ring" aria-hidden="true" />
        <span className="mo-core" aria-hidden="true" />
      </button>

      {/* Transparent click-catcher — closes on outside click, no dimming. */}
      {open && (
        <div className="mo-scrim" aria-hidden="true" onClick={closeMenu} />
      )}

      {/* Compact dropdown — anchored top-right, directly under the trigger. */}
      {open && (
        <div
          className="mo-panel"
          role="menu"
          aria-label={locale === "ar" ? "قائمة التنقل" : "Navigation menu"}
        >
          {activeGroup ? (
            <>
              {/* Back row → return to the groups list */}
              <button
                className="mo-row mo-back"
                onClick={() => setActiveGroup(null)}
              >
                <span className="mo-chev" aria-hidden="true">
                  {backChevron}
                </span>
                <span className="mo-row-lbl">
                  {locale === "ar" ? activeGroup.nameAr : activeGroup.nameEn}
                </span>
              </button>

              {/* Children of the active group */}
              {activeGroup.children.map((child) => (
                <button
                  key={child.route}
                  className="mo-row"
                  role="menuitem"
                  onClick={() => handleChildClick(child.route)}
                >
                  <span className="mo-dot" aria-hidden="true" />
                  <span className="mo-row-lbl">
                    {locale === "ar" ? child.label : child.labelEn}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Header */}
              <div className="mo-head">{locale === "ar" ? "المدار" : "Orbit"}</div>

              {/* The five top-level groups */}
              {ORRERY_GROUPS.map((group) => (
                <button
                  key={group.id}
                  className="mo-row"
                  role="menuitem"
                  onClick={() => handleGroupClick(group)}
                >
                  <span className="mo-dot" aria-hidden="true" />
                  <span className="mo-row-lbl">
                    {locale === "ar" ? group.nameAr : group.nameEn}
                  </span>
                  <span className="mo-chev" aria-hidden="true">
                    {drillChevron}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
