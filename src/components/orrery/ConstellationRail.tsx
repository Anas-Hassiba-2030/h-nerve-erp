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
