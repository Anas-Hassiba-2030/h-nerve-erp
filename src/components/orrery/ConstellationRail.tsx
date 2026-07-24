"use client";

// ConstellationRail — horizontal pill-strip nav showing all sections in the
// current group, with the active section highlighted. Placed just below the
// page's ribbon/header in app/(app)/layout.tsx.
//
// Uses usePathname() directly (not a prop) so the rail updates on every
// client-side navigation without needing a page refresh.
//
// Groups come from the shared lib/orrery/groups source so the rail, the
// mini-orbit, and the main Orrery hub never drift apart again.

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { detectOrreryGroup, detectOrrerySubgroup } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

export function ConstellationRail({ locale }: { locale: Locale }) {
  const [collapsed, setCollapsed] = useState(false);
  // Which cluster the operator has opened by hand. `null` = follow the page.
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const currentPath = usePathname() ?? "";
  const group = detectOrreryGroup(currentPath);
  const currentSub = detectOrrerySubgroup(group, currentPath);

  // No group match → don't render anything.
  if (!group) return null;

  const groupLabel = locale === "ar" ? group.nameAr : group.nameEn;

  // Most-specific match wins. A plain prefix test marked BOTH "/brain" and
  // "/brain/council" as current on /brain/council — two highlighted pills,
  // so the user couldn't tell which section they were in.
  const matches = group.children.filter(
    (c) => currentPath === c.route || currentPath.startsWith(c.route + "/"),
  );
  const current =
    matches.length > 0
      ? matches.reduce((a, b) => (b.route.length > a.route.length ? b : a))
      : null;

  return (
    <nav
      id="al-rail"
      className="al-rail light"
      aria-label={groupLabel}
      data-collapsed={collapsed ? "true" : undefined}
    >
      <span className="rail-grp">{groupLabel}</span>

      {/* Clustered rail — Intelligence only (the one group with 14 sections).
          Showing all 14 wrapped the header into ragged rows. Instead: four
          cluster chips, and ONLY the open cluster's sections expanded. The
          page's own cluster is open by default, so you always see where you
          are plus its siblings — never 14 pills, never a pill made smaller.
          Every group without `subgroups` renders exactly as before. */}
      {group.subgroups && !collapsed
        ? group.subgroups.map((sub) => {
            const subLabel = locale === "ar" ? sub.nameAr : sub.nameEn;
            const isOpen = openCluster ? openCluster === sub.id : sub === currentSub;
            const holdsCurrent = sub === currentSub;

            return (
              <span key={sub.id} className="rail-cluster">
                <button
                  type="button"
                  className={`rail-chip${isOpen ? " open" : ""}${holdsCurrent ? " here" : ""}`}
                  aria-expanded={isOpen}
                  // Clicking the open cluster collapses it back to the page's
                  // own cluster rather than leaving the rail empty.
                  onClick={() => setOpenCluster(isOpen && !holdsCurrent ? null : sub.id)}
                >
                  {subLabel}
                  <span className="rail-chip-n" aria-hidden="true">
                    {sub.children.length}
                  </span>
                </button>

                {isOpen
                  ? sub.children.map((child) => {
                      const label = locale === "ar" ? child.label : child.labelEn;
                      const isCurrent = child === current;
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
                    })
                  : null}
              </span>
            );
          })
        : group.children.map((child) => {
            const label = locale === "ar" ? child.label : child.labelEn;
            const isCurrent = child === current;

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
