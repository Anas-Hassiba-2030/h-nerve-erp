"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ORRERY_GROUPS,
  detectOrreryGroup,
  type OrreryGroup,
  type OrrerySubgroup,
} from "@/lib/orrery/groups";

type Locale = "ar" | "en";

// The mini-orbit is a small version of the main /orrery bloom: the five
// groups orbit a central core, a click "blooms" a group's children around
// the core, the core steps back. The layout is computed radially in code and
// positioned with absolute left/top — it is NEVER a vertical list, so it
// always reads as an orbit even with animation disabled.
// The orbit grows with the node count so a big group never crowds its labels.
// The Brain group has 13 children and System 12; a fixed 116px ring packed
// those pills shoulder-to-shoulder. Sets of ≤9 keep the original 116px ring,
// so the five-group view stays pixel-identical to before — only crowded child
// blooms expand. Only the geometry changes here; the pop/spin/bloom animation
// is untouched.
// The popup is position:fixed at top-right, so it MUST fit the space it has —
// a big group (Intelligence has 14 children) would otherwise compute a
// ~500px radius → ~1100px box that covers the whole page. SIZE is hard-capped
// to the viewport below; when capped, labels are allowed to wrap. Orbit labels
// are navigation chrome, NOT page content — kept legible (15px) but deliberately
// not scaled to the big body-text sizes, which is what blew the ring up before.
const BASE_R = 132; // orbit radius for ≤9 short-label nodes
const SIZE_CAP = 640; // hard ceiling on the popup square, before viewport clamp

// Bug (2026-07-23, post-ERP-split): the 7-node group ring sized itself off a
// FIXED chord (54px), which only accounts for the gold dot, not the pill text
// under it. "Purchasing & Production" (24 chars, 14px/700 pill) renders ~230px
// wide — nearly double the 108px chord the old formula guaranteed — so its
// label physically overlapped the "Sales" node next to it. Radius must now
// scale with the WIDEST label in the current node set, not just the count.
const LABEL_CHAR_PX = 9; // avg glyph width, 15px/700 system-ui pill text
const LABEL_PAD_PX = 26; // .mo-orbit-lbl padding: 13px * 2
const LABEL_MAX_PX = 150; // .mo-orbit-lbl max-width — long labels wrap instead of growing the ring forever
const NODE_GAP_PX = 20; // minimum clear gap between adjacent pill edges

function radiusFor(n: number, labels: string[]): number {
  if (n <= 1) return BASE_R;
  const maxLabelWidth = Math.max(
    0,
    ...labels.map((l) => Math.min(LABEL_MAX_PX, l.length * LABEL_CHAR_PX + LABEL_PAD_PX)),
  );
  const neededChord = maxLabelWidth + NODE_GAP_PX;
  return Math.max(BASE_R, Math.round(neededChord / (2 * Math.sin(Math.PI / n))));
}

// Decorative rings stay proportional to the live radius so they always frame
// the nodes (at BASE_R these resolve to the original 236 / 150 px).
function ringSizes(r: number): { outer: number; inner: number } {
  return { outer: Math.round(r * 2.03), inner: Math.round(r * 1.29) };
}

function radial(i: number, n: number, r: number, center: number): { left: number; top: number } {
  const angle = ((-90 + (i * 360) / n) * Math.PI) / 180; // start at 12 o'clock
  return { left: center + r * Math.cos(angle), top: center + r * Math.sin(angle) };
}

export function MiniOrrery({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<OrreryGroup | null>(null);
  // Third bloom level, used ONLY by groups that declare clusters (today:
  // Intelligence, 14 children). Blooming 14 pills into one ring is what made
  // it read as scattered — clusters cap any ring at 7 nodes, so the orbit
  // stays legible without shrinking a single label. The pop/spin/bloom
  // animation is untouched; this only changes WHICH nodes a ring holds.
  const [activeSub, setActiveSub] = useState<OrrerySubgroup | null>(null);
  // The popup is fixed at top:56 / inset-end:18 — it must fit what the viewport
  // leaves. Without this a 14-node group blooms to ~1100px and covers the page.
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const openMenu = useCallback(() => {
    // Reopening from inside a section drops you back INTO that section's branch
    // (e.g. any /admin/* or other System page → the System branch), not the
    // 5-group root — so the mini-orbit is a real "retreat to my branch", not a
    // reset. detectOrreryGroup returns null off-branch, preserving root behaviour.
    setActiveGroup(detectOrreryGroup(pathname));
    // Always open a clustered group at its CLUSTER ring, never pre-drilled
    // into one cluster — the point is to show the four choices.
    setActiveSub(null);
    setOpen(true);
  }, [pathname]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveGroup(null);
    setActiveSub(null);
  }, []);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeMenu]);

  // The core: steps back ONE level each press — cluster → group → root →
  // close. Never jumps straight out from a drilled-in ring.
  const onCore = () => {
    if (activeSub) setActiveSub(null);
    else if (activeGroup) setActiveGroup(null);
    else closeMenu();
  };

  const onChild = (route: string) => {
    closeMenu();
    router.push(route);
  };

  // Layout scales with the node count AND the widest label in the current
  // set: more/longer nodes → wider ring + panel, so the rings always frame
  // the labels and the pills never collide.
  //
  // Three possible rings, in drill order:
  //   root        → the 7 groups
  //   group       → its clusters if it has them, else its sections
  //   cluster     → that cluster's sections
  const ringItems: { key: string; label: string; onClick: () => void; child: boolean }[] =
    activeSub
      ? activeSub.children.map((c) => ({
          key: c.route,
          label: locale === "ar" ? c.label : c.labelEn,
          onClick: () => onChild(c.route),
          child: true,
        }))
      : activeGroup
        ? activeGroup.subgroups
          ? activeGroup.subgroups.map((s) => ({
              key: s.id,
              label: locale === "ar" ? s.nameAr : s.nameEn,
              onClick: () => setActiveSub(s),
              child: false,
            }))
          : activeGroup.children.map((c) => ({
              key: c.route,
              label: locale === "ar" ? c.label : c.labelEn,
              onClick: () => onChild(c.route),
              child: true,
            }))
        : ORRERY_GROUPS.map((g) => ({
            key: g.id,
            label: locale === "ar" ? g.nameAr : g.nameEn,
            onClick: () => setActiveGroup(g),
            child: false,
          }));

  const count = ringItems.length;
  const labels = ringItems.map((n) => n.label);
  // What the labels WANT, then clamp to the room the fixed popup actually has.
  const wantR = radiusFor(count, labels);
  const wantSize = 2 * (wantR + 60);
  const roomSize = Math.min(SIZE_CAP, vw - 18 - 24, vh - 56 - 24);
  const SIZE = Math.max(360, Math.round(Math.min(wantSize, roomSize)));
  const R = SIZE / 2 - 60; // ring derived back from the (possibly capped) box
  const CTR = SIZE / 2;
  const rings = ringSizes(R);

  const nodes = ringItems.map((item, i) => ({
    ...item,
    pos: radial(i, count, R, CTR),
  }));

  // In Arabic (RTL) the "back" chevron points the other way.
  const backChevron = locale === "ar" ? "›" : "‹";

  return (
    <>
      {/* Trigger — the same green orbit button on every section */}
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

      {/* Transparent click-catcher — closes on outside click. */}
      {open && <div className="mo-scrim" aria-hidden="true" onClick={closeMenu} />}

      {/* The mini bloom — a small radial field anchored top-right. */}
      {open && (
        <div
          className="mo-orbit"
          role="menu"
          aria-label={locale === "ar" ? "قائمة التنقل" : "Navigation menu"}
          style={{ width: SIZE, height: SIZE }}
        >
          {/* Ambient background — drifting nebula + starfield. Behind the
              nodes (z-0), pointer-events none, motion-reduced safe. Pure
              atmosphere; never touches the node bloom. */}
          <span className="mo-orbit-aura" aria-hidden="true" />
          <span className="mo-orbit-stars" aria-hidden="true" />

          <span
            className="mo-orbit-ring"
            aria-hidden="true"
            style={{ width: rings.outer, height: rings.outer }}
          />
          <span
            className="mo-orbit-ring mo-orbit-ring-2"
            aria-hidden="true"
            style={{ width: rings.inner, height: rings.inner }}
          />

          {/* Drilled into a cluster, the heading carries BOTH levels
              ("الذكاء · القرار") so you never lose which group you are in. */}
          <span className="mo-orbit-head">
            {activeSub && activeGroup
              ? `${locale === "ar" ? activeGroup.nameAr : activeGroup.nameEn} · ${
                  locale === "ar" ? activeSub.nameAr : activeSub.nameEn
                }`
              : activeGroup
                ? locale === "ar"
                  ? activeGroup.nameAr
                  : activeGroup.nameEn
                : locale === "ar"
                  ? "المدار"
                  : "Orbit"}
          </span>

          <button
            className="mo-orbit-core"
            onClick={onCore}
            aria-label={
              activeGroup || activeSub
                ? locale === "ar"
                  ? "رجوع"
                  : "Back"
                : locale === "ar"
                  ? "إغلاق"
                  : "Close"
            }
          >
            {activeGroup || activeSub ? backChevron : "⌗"}
          </button>

          {nodes.map((nd, i) => (
            <button
              key={nd.key}
              className={"mo-orbit-node" + (nd.child ? " is-child" : "")}
              role="menuitem"
              onClick={nd.onClick}
              style={{
                left: `${nd.pos.left}px`,
                top: `${nd.pos.top}px`,
                animationDelay: `${i * 35}ms`,
              }}
            >
              <span className="mo-orbit-dot" aria-hidden="true" />
              <span className="mo-orbit-lbl">{nd.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
