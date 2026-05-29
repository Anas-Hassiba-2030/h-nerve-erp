// lib/design/tokens.ts — the machine-readable inventory of the H-Nerve
// design system. This is the SINGLE file "Claude Design" references when
// generating new variants: it lists every CSS variable, every animation
// class, every component primitive, and every theme preset the system knows.
//
// Rules of the road:
//   • Every string here MUST correspond to a real rule in app/globals.css
//     (or a real preset in lib/theme.ts / lib/brand/themes.ts). Nothing is
//     aspirational — if it's listed, it ships.
//   • Default values are the Heritage Modern (harmony) defaults from :root.
//     Theme presets override a subset of these at the route-group root.
//   • Pure data + a couple of derive helpers. No IO, safe to import anywhere
//     (server or client).
//
// See docs/DESIGN-SKILL.md for the *why* behind each token; this file is the
// *what*.

import { THEME_PRESETS, type ThemeKey } from "@/lib/brand/themes";
import { THEMES, type ThemeId } from "@/lib/theme";

/* ────────────────────────────────────────────────────────────────────────
   1 · CSS VARIABLES — name → default value
   The defaults below are the canonical Heritage / harmony :root values.
   ──────────────────────────────────────────────────────────────────────── */

/** Canonical operator-chrome tokens. Theme presets in lib/theme.ts override
 *  these via themeCssVars(). These are what the Topbar, Sidebar, cards, and
 *  every Heritage Modern surface read. */
export const CORE_VARS = {
  "--surface": "#f8f6ef",
  "--surface-elevated": "#ffffff",
  "--text": "#0f2e2a",
  "--text-muted": "#5b6f6a",
  "--border": "#e6e2d3",
  "--brand": "#0f7a5a",
  "--brand-deep": "#0a4d3a",
  "--brand-soft": "#e6f5ee",
  "--accent": "#c69345",
  "--ring": "color-mix(in srgb, var(--brand) 30%, transparent)",
  "--shadow-soft":
    "0 1px 2px rgb(0 0 0 / 0.04), 0 6px 24px color-mix(in srgb, var(--brand-deep) 8%, transparent)",
  "--shadow-glow":
    "0 0 0 1px color-mix(in srgb, var(--brand) 12%, transparent)",
} as const;

/** Heritage editorial palette. Tenant presets in lib/brand/themes.ts override
 *  the 12 keys the registry baseline ships (the *-2 / *-3 / sage shades fall
 *  back to these defaults). Used by the brain, theater, and editorial surfaces
 *  (the .heri-* utility family). */
export const HERITAGE_VARS = {
  "--heri-cream": "#f5efe6",
  "--heri-cream-2": "#ede5d6",
  "--heri-cream-3": "#e0d3bb",
  "--heri-ink": "#1a1612",
  "--heri-ink-2": "#2c2620",
  "--heri-ink-3": "#4a4138",
  "--heri-terracotta": "#b85c38",
  "--heri-terracotta-2": "#9c4a2c",
  "--heri-ochre": "#c69345",
  "--heri-ochre-2": "#a87a32",
  "--heri-rose": "#c98b8b",
  "--heri-teal": "#1f4e4a",
  "--heri-teal-2": "#143734",
  "--heri-copper": "#7d5a3a",
  "--heri-sage": "#7a9b7a",
  "--heri-rule": "#d8cdb9",
  "--heri-rule-strong": "#b8a98c",
} as const;

/** Multi-layer depth + branded stroke tokens (additive layer in globals.css). */
export const DEPTH_VARS = {
  "--depth-1": "0 1px 0 …, 0 1px 2px -1px … (subtle)",
  "--depth-2": "0 6px 12px -8px …, 0 12px 24px -12px … (raised)",
  "--depth-3": "0 12px 24px -12px …, 0 24px 48px -16px … (floating)",
  "--depth-glow":
    "0 0 0 1px …, 0 12px 30px -8px … (branded glow)",
  "--stroke-brand":
    "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
} as const;

export const CSS_VARS = {
  core: CORE_VARS,
  heritage: HERITAGE_VARS,
  depth: DEPTH_VARS,
} as const;

/* ────────────────────────────────────────────────────────────────────────
   2 · ANIMATION CLASSES — grouped by behaviour
   Entrance = play once on mount (`both` fill). Continuous = infinite loop.
   Attention = single-shot micro-interaction. Hover = transition on :hover.
   ──────────────────────────────────────────────────────────────────────── */

export const ANIMATIONS = {
  /** Play once on mount, hold final frame. */
  entrance: [
    "hn-anim-fade",
    "hn-anim-rise",
    "hn-anim-fall",
    "hn-anim-slide-l",
    "hn-anim-slide-r",
    "hn-anim-zoom",
    "hn-anim-zoom-bounce",
    "hn-anim-flip",
    "hn-anim-blur",
    "hn-anim-reveal",
    "hn-anim-reveal-r",
    "hn-anim-counter",
    "hn-anim-success",
  ],
  /** Infinite loops — ambient life. */
  continuous: [
    "hn-anim-pulse-soft",
    "hn-anim-pulse-ring",
    "hn-anim-float",
    "hn-anim-bob",
    "hn-anim-orbit",
    "hn-anim-spin",
    "hn-anim-spin-slow",
    "hn-anim-grad",
    "hn-anim-aurora",
    "hn-anim-glow",
    "hn-anim-sparkle",
  ],
  /** Single-shot attention pulses (re-trigger by remount). */
  attention: ["hn-anim-wiggle", "hn-anim-shake"],
  /** :hover-triggered micro-interactions. */
  hover: ["hn-hover-lift", "hn-hover-tilt", "hn-hover-glow", "hn-hover-shine"],
  /** Auto-delay children (apply to a parent of entrance-animated kids). */
  stagger: ["hn-stagger", "skel-stagger", "heri-stagger"],
} as const;

/* ────────────────────────────────────────────────────────────────────────
   3 · COMPONENT CLASSES — grouped by primitive type
   ──────────────────────────────────────────────────────────────────────── */

export const COMPONENTS = {
  buttons: [
    "btn",
    "btn-primary",
    "btn-secondary",
    "btn-gold",
    "btn-danger",
    "btn-ghost",
    "btn-sm",
    "btn-lg",
    "btn-icon",
  ],
  cards: ["card", "exec-card", "exec-glass", "kpi", "metric-tile", "company-cover"],
  badges: [
    "badge",
    "badge-emerald",
    "badge-blue",
    "badge-amber",
    "badge-red",
    "badge-slate",
    "badge-violet",
    "badge-gold",
    "badge-sky",
    "badge-indigo",
  ],
  typography: [
    "font-display",
    "font-mono-tech",
    "h-display-xl",
    "h-display-lg",
    "h-display-md",
    "h-display-sm",
    "eyebrow",
    "exec-title",
    "exec-display",
  ],
  backgrounds: ["nerve-bg", "nerve-bg-mesh", "glow-blob"],
  effects: [
    "glass",
    "sheen",
    "hn-hover-lift",
    "hn-hover-tilt",
    "hn-hover-glow",
    "hn-hover-shine",
  ],
  progress: ["bar", "bar-fill"],
  skeletons: [
    "skel",
    "skel-line",
    "skel-line-sm",
    "skel-text",
    "skel-title",
    "skel-eyebrow",
    "skel-pill",
    "skel-circle",
    "skel-header",
    "skel-header-stripe",
    "skel-stagger",
  ],
} as const;

/** The `data-tone` variants the .exec-card primitive understands (left-stroke). */
export const EXEC_CARD_TONES = [
  "emerald",
  "amber",
  "rose",
  "blue",
  "violet",
  "slate",
  "brand",
] as const;

/* ────────────────────────────────────────────────────────────────────────
   4 · THEME PRESETS
   Two registries, deliberately: operator chrome (lib/theme.ts, drives the
   canonical --brand/--surface tokens, cookie-switched in Settings) and tenant
   white-label presets (lib/brand/themes.ts, drives the --heri-* family,
   assigned per-tenant). Derived live so this file never drifts.
   ──────────────────────────────────────────────────────────────────────── */

/** Operator-chrome theme ids (Settings & header ThemeSwitch). */
export const OPERATOR_THEMES = Object.keys(THEMES) as ThemeId[];

/** Tenant white-label preset keys (admin /tenants, view-as). */
export const TENANT_THEMES = Object.keys(THEME_PRESETS) as ThemeKey[];

export const THEME_REGISTRY = {
  operator: OPERATOR_THEMES,
  tenant: TENANT_THEMES,
} as const;

/* ────────────────────────────────────────────────────────────────────────
   5 · THE TOKENS OBJECT — single export the rest of the system references
   ──────────────────────────────────────────────────────────────────────── */

export const DESIGN_TOKENS = {
  cssVars: CSS_VARS,
  animations: ANIMATIONS,
  components: COMPONENTS,
  execCardTones: EXEC_CARD_TONES,
  themes: THEME_REGISTRY,
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
export type AnimationCategory = keyof typeof ANIMATIONS;
export type ComponentCategory = keyof typeof COMPONENTS;
export type ExecCardTone = (typeof EXEC_CARD_TONES)[number];

export default DESIGN_TOKENS;
