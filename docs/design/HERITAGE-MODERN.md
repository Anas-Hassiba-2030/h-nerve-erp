# Heritage Modern — the portable design system

The look H-Nerve wears, extracted so it can travel to another product without
bringing H-Nerve with it.

- **`heritage-modern.css`** — the whole system in one framework-free file.
  No Tailwind, no Next.js, no build step. Copy it, link two fonts, done.
- This document — the rules behind it. **The rules matter more than the hexes.**
  Anyone can paste a palette; the reason this reads as designed rather than
  themed is the six constraints below.

## Install

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Reem+Kufi:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="heritage-modern.css">
```

Everything is scoped under `.hm`, so it can sit next to an existing stylesheet
without bleeding into it:

```html
<div class="hm" dir="rtl">…</div>
```

## The six rules

1. **One vocabulary per surface.** Never mix Heritage with a second look on one
   page. Two design languages in one screen reads as a bug, not as variety.
2. **Emerald is structure, gold is attention.** Gold is never decorative. If
   something is gold, it is asking a human for something. The moment gold
   becomes a garnish, the interface loses its ability to point.
3. **Display serif for headings and numbers only.** Body copy stays sans.
   Fraunces at 13px is unreadable; Fraunces at 42px on a KPI is the whole look.
4. **Numbers are tabular** (`font-variant-numeric: tabular-nums`). Figures that
   re-flow between renders read as unstable, and an ERP that looks unstable
   does not get trusted with money.
5. **Animation carries meaning.** Entrance motion is free. Anything that *loops*
   must encode a state — the breathing dot means "waiting on you", the travelling
   pulse means "this flows downward". A loop that means nothing is noise that
   never stops.
6. **Every animation has a `prefers-reduced-motion` escape.** Not optional.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--emerald` | `#1f4d3f` | Structure: headings, primary buttons, borders that matter |
| `--emerald-soft` | `#2e6b57` | Secondary structure, hover states |
| `--gold` | `#c2a35a` | Attention only — see rule 2 |
| `--gold-ink` | `#8a5d12` | Gold **text**. The swatch itself fails contrast on cream |
| `--ink` | `#2a2a26` | Body copy |
| `--ink-muted` | `#6b6459` | Secondary copy |
| `--ink-faint` | `#9a9484` | Metadata, timestamps, path labels |
| `--cream` | `#fefcf7` | Page and card background |
| `--ivory` | `#f6f1e7` | Recessed background |
| `--line` | `#e4dccb` | Every border |
| `--sage` | `#7e9b86` | Healthy / positive |
| `--brick` | `#a86a5c` | Fault / needs attention |

Two colours are load-bearing and easy to get wrong:

- `--gold` (`#c2a35a`) as **text** on cream fails WCAG AA. Use `--gold-ink`
  (`#8a5d12`) for any gold word; keep `--gold` for fills, dots, and rules.
- `--brick` is deliberately muted. A saturated red on a cream ERP reads as an
  outage; this reads as "look at this today".

## Components

`heritage-modern.css` ships: `.hm-panel`, `.hm-card`, `.hm-kpi-grid` / `.hm-kpi`,
`.hm-btn` / `.hm-btn-primary`, `.hm-tag-*`, `.hm-dot-*`, `.hm-table`, `.hm-eyebrow`,
and the org-chart connectors `.hm-trunk` / `.hm-fan` / `.hm-branch`.

The connectors are worth calling out: they are pure CSS pseudo-elements, not SVG.
A tree drawn with `::before` stubs reflows with its grid for free, so the chart
stays correct at every breakpoint with no measuring code and no JavaScript.

## Bilingual / RTL

Arabic is the primary language; English is secondary.

- Use **logical properties** (`padding-inline`, `inset-inline-start`,
  `margin-inline`) and RTL costs nothing.
- Two things never flip automatically and must be handled by hand:
  **gradients** (`90deg` → `270deg`) and any **literal arrow glyph** (`→` → `←`).
- Fraunces has no Arabic glyphs; Arabic display text resolves to Reem Kufi
  per-glyph. This is why the font stack lists both — dropping Reem Kufi makes
  Arabic headings fall back to a system serif and look broken.

## Where it came from

Extracted 2026-08-08 from `src/app/(app)/daylight.css` (the work surface) and the
VOAC surfaces (`src/app/(app)/voac/**`). If the app's look changes, this file
does not follow automatically — it is a **snapshot for porting**, not a shared
dependency. Re-extract deliberately.
