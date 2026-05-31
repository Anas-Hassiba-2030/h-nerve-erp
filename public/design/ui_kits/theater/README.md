# UI Kit — Decision Theater

A fullscreen, sidebar-less **editorial magazine spread** (`BMV2026/app/(theater)/`). The Brain presents one decision as four narrative spreads. Cinematic, calm, Arabic-first.

## Run it
Open `index.html`. React 18 + Babel + Lucide from CDN; tokens from `../../colors_and_type.css`.

## The four spreads
1. **The situation** — display headline + terracotta drop-cap + justified prose + a 4-cell hairline data rail.
2. **The council** — four AI advisor cards (support / qualify / oppose) each with a thesis + evidence chip and a colored health rail.
3. **The what-if** — the causal simulation, prose + delta rail, surfacing the Brain's `impact = Δ × weight × confidence × attenuation^hop` formula.
4. **The recommendation** — big confidence numeral + Approve / Schedule actions.

## Interactive
- **← / →** arrow keys or the on-screen nav buttons move between spreads (RTL-aware: in Arabic, Right advances backward as expected).
- **Language toggle** (globe) flips EN ⇄ RTL Arabic, swapping Fraunces ⇄ Aref Ruqaa display + the drop-cap glyph.
- Progress rail + spread counter in the top bar; ESC exit control (cosmetic).

## Fidelity notes
- Pure Heritage Modern: warm ivory stage, sharp 0px cards, hairline rails, display-serif tabular numerals, terracotta drop-cap — no chrome, no shadow.
- The prose voice is lifted from the product: numbers embedded in story, "the Brain proposes, it does not move the numbers."
- Cosmetic only: static decision content; no live reasoning engine.
