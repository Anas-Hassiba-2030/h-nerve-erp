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
import { detectOrreryGroup } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

export function ConstellationRail({ locale }: { locale: Locale }) {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = usePathname() ?? "";
  const group = detectOrreryGroup(currentPath);

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

      {group.children.map((child) => {
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
