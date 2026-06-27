"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ORRERY_GROUPS, type OrreryGroup } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

interface PopupCoords {
  left: number;
  top: number;
}

export function MiniOrrery({ locale }: { locale: Locale }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopupCoords>({ left: 0, top: 0 });
  const [activeGroup, setActiveGroup] = useState<OrreryGroup | null>(null);

  const coreLabelAr = activeGroup ? activeGroup.nameAr : "المدار";
  const coreLabelEn = activeGroup ? activeGroup.nameEn : "Orbit";
  const coreLabel = locale === "ar" ? coreLabelAr : coreLabelEn;

  // The popup is a focused radial-menu modal: it opens centered in the
  // viewport (with a dimmed scrim behind it) rather than clamped beside the
  // trigger, which used to drop the ring on top of page content.
  const openPopup = useCallback(() => {
    setCoords({ left: window.innerWidth / 2, top: window.innerHeight / 2 });
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

  const handleGroupClick = (group: OrreryGroup) => {
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
      : ORRERY_GROUPS.map((g) => ({
          key: g.id,
          label: locale === "ar" ? g.nameAr : g.nameEn,
          onPick: () => handleGroupClick(g),
        }));

  // Radius and popup size scale with node count so labels get breathing room
  // instead of crowding. The 13-node intel ring spreads wide enough that no
  // two pills collide.
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

      {/* Scrim — dims page content so the radial menu reads as a focused modal */}
      {open && (
        <div
          className="mo-scrim"
          aria-hidden="true"
          onClick={closePopup}
        />
      )}

      {/* Popup — position:fixed, centered in the viewport via JS coords */}
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
