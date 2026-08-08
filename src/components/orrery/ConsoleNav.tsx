"use client";

// ConsoleNav — the Console shell's navigation.
//
// The Orbit shell shows you the group you are ALREADY in (ConstellationRail).
// That is beautiful and it is also why it can feel like a maze: to reach a
// section in another group you first have to leave for the hub. The Console
// shell answers the opposite need — every group, every section, two clicks,
// always in the same place on screen.
//
// Reads the SAME ORRERY_GROUPS source as the rail and the hub, so the two
// shells can never offer different destinations. Adding a section to that file
// ships it into both.

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ORRERY_GROUPS, detectOrreryGroup } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

export function ConsoleNav({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const currentPath = usePathname() ?? "";
  const activeGroup = detectOrreryGroup(currentPath);
  // null = follow the page. A string pins the menu the operator opened by hand.
  const [open, setOpen] = useState<string | null>(null);

  // Most-specific match wins, same rule as the rail: a plain prefix test marks
  // both /brain and /brain/council current on /brain/council.
  const currentRoute = (() => {
    const all = ORRERY_GROUPS.flatMap((g) => g.children);
    const hits = all.filter(
      (c) => currentPath === c.route || currentPath.startsWith(c.route + "/"),
    );
    return hits.length ? hits.reduce((a, b) => (b.route.length > a.route.length ? b : a)).route : null;
  })();

  return (
    <nav className="hn-console" aria-label={ar ? "التنقل" : "Navigation"}>
      {/* The brand is the way home, and in THIS shell home is /console — the
          everything-at-once board. Pointing it at /orrery (as it did) threw the
          operator back into the other shell's metaphor on every logo click. */}
      <Link href="/console" className="hn-console-brand">
        <span className="hn-console-mark" aria-hidden>✦</span>
        <span className="hn-console-wordmark">H-Nerve</span>
      </Link>

      <ul className="hn-console-groups">
        {ORRERY_GROUPS.map((g) => {
          const isActive = activeGroup?.id === g.id;
          const isOpen = open === g.id;
          const label = ar ? g.nameAr : g.nameEn;

          return (
            <li
              key={g.id}
              className="hn-console-group"
              // Hover opens on pointer devices; the button keeps it usable by
              // keyboard and touch, where hover does not exist.
              onMouseEnter={() => setOpen(g.id)}
              onMouseLeave={() => setOpen((o) => (o === g.id ? null : o))}
            >
              <button
                type="button"
                className={`hn-console-trigger${isActive ? " here" : ""}${isOpen ? " open" : ""}`}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : g.id)}
              >
                {label}
                <span className="hn-console-caret" aria-hidden>▾</span>
              </button>

              {isOpen ? (
                <div className="hn-console-menu" role="menu">
                  {g.subgroups
                    ? g.subgroups.map((sub) => (
                        <div key={sub.id} className="hn-console-col">
                          <span className="hn-console-col-label">
                            {ar ? sub.nameAr : sub.nameEn}
                          </span>
                          {sub.children.map((c) => (
                            <Link
                              key={c.route}
                              href={c.route}
                              role="menuitem"
                              className={`hn-console-link${c.route === currentRoute ? " cur" : ""}`}
                              onClick={() => setOpen(null)}
                            >
                              {ar ? c.label : c.labelEn}
                            </Link>
                          ))}
                        </div>
                      ))
                    : (
                        <div className="hn-console-col">
                          {g.children.map((c) => (
                            <Link
                              key={c.route}
                              href={c.route}
                              role="menuitem"
                              className={`hn-console-link${c.route === currentRoute ? " cur" : ""}`}
                              onClick={() => setOpen(null)}
                            >
                              {ar ? c.label : c.labelEn}
                            </Link>
                          ))}
                        </div>
                      )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="hn-console-tail">
        <Link href="/search" className="hn-console-tail-btn" title={ar ? "بحث" : "Search"}>
          <span aria-hidden>⌕</span>
        </Link>
        <Link href="/settings" className="hn-console-tail-btn" title={ar ? "الإعدادات" : "Settings"}>
          <span aria-hidden>⚙</span>
        </Link>
      </div>
    </nav>
  );
}
