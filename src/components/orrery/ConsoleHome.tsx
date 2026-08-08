"use client";

// ConsoleHome — the Console shell's home surface.
//
// The Orbit shell's home is the Orrery: a bloom you fly through, and the reason
// people call the system beautiful. It is also why the Console shell existed
// with no home at all — flipping to Console left you on whatever page you were
// on, with a top bar that hides all 50+ sections behind hover menus. Two shells,
// one of them missing its front door.
//
// This is that front door, and it answers the opposite need to the Orrery:
// EVERYTHING VISIBLE AT ONCE. No metaphor, no hover, no drill-down. Every group,
// every section, on one screen, in the order an operator moves through them —
// plus a filter, because at 50 sections the fastest navigation is typing three
// letters, not aiming a mouse.
//
// Reads ORRERY_GROUPS, the SAME source as the rail, the hub and ConsoleNav, so
// the two shells can never offer different destinations. Adding a section to
// that file ships it here with no edit.

import Link from "next/link";
import { useMemo, useState, useDeferredValue } from "react";
import { ORRERY_GROUPS, type OrreryChild } from "@/lib/orrery/groups";

type Locale = "ar" | "en";

/** Flatten a group to (subgroup label | null, children) pairs so the clustered
 *  Intelligence group and the six flat groups render through one code path. */
function columnsOf(group: (typeof ORRERY_GROUPS)[number], ar: boolean) {
  if (group.subgroups) {
    return group.subgroups.map((s) => ({ key: s.id, label: ar ? s.nameAr : s.nameEn, children: s.children }));
  }
  return [{ key: group.id, label: null as string | null, children: group.children }];
}

function matches(child: OrreryChild, q: string): boolean {
  if (!q) return true;
  const hay = `${child.label} ${child.labelEn} ${child.route}`.toLowerCase();
  return hay.includes(q);
}

export function ConsoleHome({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [raw, setRaw] = useState("");
  // The filter runs over ~55 links on every keystroke. Deferring keeps the
  // input itself responsive on a slow device without debounce bookkeeping.
  const query = useDeferredValue(raw).trim().toLowerCase();

  const groups = useMemo(
    () =>
      ORRERY_GROUPS.map((g) => {
        const cols = columnsOf(g, ar)
          .map((c) => ({ ...c, children: c.children.filter((ch) => matches(ch, query)) }))
          .filter((c) => c.children.length > 0);
        return { group: g, cols, hits: cols.reduce((s, c) => s + c.children.length, 0) };
      }).filter((g) => g.hits > 0),
    [ar, query],
  );

  const total = groups.reduce((s, g) => s + g.hits, 0);

  return (
    <>
      <div className="ch-filter">
        <span className="ch-filter-glyph" aria-hidden>⌕</span>
        <input
          type="search"
          className="ch-filter-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={ar ? "اكتب للتصفية — الفواتير، الرواتب، المجلس…" : "Type to filter — invoices, payroll, council…"}
          aria-label={ar ? "تصفية الأقسام" : "Filter sections"}
          autoComplete="off"
        />
        <span className="ch-filter-count">
          {total} {ar ? "قسم" : total === 1 ? "section" : "sections"}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="ch-empty">
          {ar ? `لا قسم يطابق «${raw}».` : `No section matches “${raw}”.`}
        </p>
      ) : (
        <div className="ch-grid">
          {groups.map(({ group, cols, hits }, gi) => (
            <section
              key={group.id}
              className="ch-card"
              style={{ animationDelay: `${gi * 55}ms` }}
            >
              <header className="ch-card-head">
                <h2 className="ch-card-title">{ar ? group.nameAr : group.nameEn}</h2>
                <span className="ch-card-count">{hits}</span>
              </header>

              {cols.map((col) => (
                <div key={col.key} className="ch-col">
                  {col.label ? <span className="ch-col-label">{col.label}</span> : null}
                  <ul className="ch-links">
                    {col.children.map((c, ci) => (
                      <li key={c.route}>
                        <Link
                          href={c.route}
                          className="ch-link"
                          style={{ animationDelay: `${gi * 55 + ci * 18}ms` }}
                        >
                          <span className="ch-link-label">{ar ? c.label : c.labelEn}</span>
                          <span className="ch-link-route">{c.route}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
