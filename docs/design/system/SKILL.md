---
name: h-nerve-design
description: Use this skill to generate well-branded interfaces and assets for H-Nerve — the bilingual (Arabic-first, RTL) "thinking ERP" for Hourani Group (مجموعة الحوراني). Contains essential design guidelines, the dual-register "Heritage Modern / Heritage Luxury" system, colors, type, fonts, brand SVGs, the cinematic "Orrery" navigation, shared living-background / interaction / ambient layers, and high-fidelity UI kit components for prototyping.
user-invocable: true
---

# H-Nerve Design Skill

Read **`README.md`** first — it is the canonical reference (company context, content + visual foundations, iconography, and a full file manifest). Then explore the other files as needed.

## What's here
- **`colors_and_type.css`** + **`fonts/fonts.css`** — all color/type/easing/elevation tokens and the Google-Fonts import. The source of truth. Import fonts first.
- **`assets/`** — brand SVGs: the H-Nerve nerve mark (`logo-hnerve.svg`, `-white`) and five company logos (HH / Arena / Maha / Loran / AAU). Use these; never redraw them.
- **`preview/`** — the design-system gallery cards (colors, type, spacing, components, brand).
- **`ui_kits/`** — interactive, pixel-faithful recreations: `dashboard/` (executive web), `mobile/` (daily-brief in an iOS frame), `theater/` (Decision Theater editorial spread). Each kit's `index.html` is a runnable demo; the `.jsx` files are reusable components.
- **The Orrery system** — `orrery.html` (cosmic home + two-tier orbital navigation), plus shared includes you can drop into any page: `living-bg.css/js` (global ambient), `interactions.css` (buttons/cards/links + ripple), `ambient.css/js` (per-section signature backgrounds). `sections/` holds the ivory "daylight" work surfaces and a parametric placeholder.

## The one thing to get right
H-Nerve runs **two coherent registers under one roof**: an **emerald-night** world for *navigation/chrome/brand* and an **ivory-daylight** world for *work/content*, with **gold (#C2A35A / #c69345)** as the connective accent in both. Pick the right register for the surface, keep body fonts constant across registers, and only shift accent palette + spacing + corner radius. Arabic-first, RTL, sentence case, Western digits in data, mono uppercase eyebrows, display-serif tabular numerals for KPIs. Motion is rich but calm (transform + opacity only; always honor `prefers-reduced-motion`).

## How to work
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets and tokens you need out of this skill and produce static/standalone HTML the user can open. Start from a UI kit or a `sections/` page to inherit the look for free.
- **Production code:** read the rules here and lift exact token values, type stacks, and component patterns to become an expert in the brand.
- If invoked with no specific brief: ask what they want to build, ask a few focused questions (surface, register, EN/AR, variations), then act as an expert designer who outputs HTML artifacts *or* production code as the need dictates.
