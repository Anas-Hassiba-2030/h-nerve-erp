# UI Kit — Executive Dashboard (web)

A high-fidelity, interactive recreation of the H-Nerve **executive web dashboard** — the hero surface of the product. Built against the live codebase (`BMV2026/app/(app)/dashboard/page.tsx` + `components/`), not from screenshots.

## Run it
Open `index.html`. It loads React 18 + Babel (in-browser) and Lucide from CDN, plus the shared design tokens from `../../colors_and_type.css` and brand SVGs from `../../assets/`.

## What's interactive
- **Language toggle** (header, globe icon) — flips the entire surface between English (LTR) and Arabic (RTL), swapping copy, font families, and layout direction. This is the single most important behaviour to demo.
- **Period selector** (30d / QTD / YTD) — recomputes all four hero KPIs (revenue, expenses, net, occupancy) and their deltas.
- **Sidebar collapse** (⌘B button) — toggles the 268px nav to a 72px icon rail with hover tooltips.
- **Nav active state** — click any sidebar link to move the emerald-soft active treatment + gold rail.
- Hover lifts on company cards, module tiles, buttons, and feed rows.

## Components (the reusable pieces)
- `components.jsx` — `Icon` (Lucide wrapper), **`Sidebar`** (grouped emerald-chrome nav, brand lockup, nerve-status badge, chess-rank user card, collapse toggle), **`PageHeader`** (gradient hairline, eyebrow + display title, utility controls).
- `app.jsx` — **`Hero`** (Heritage cream plinth, LIVE meta rail, display greeting, 4 KPI tiles with display-serif numerals + delta tags), **`Ticker`**, **`CompanyStrip`** (5 business-unit cards with `Sparkline` + health rail + ops metric), **`FinancialPulse`** (12-month revenue/expense bars), **`ActivityStream`**, **`Alerts`**, **`Modules`** (quick-nav tiles), and the `App` shell.

## Fidelity notes
- Two registers, as in production: **emerald chrome** (sidebar, header controls, status) wrapping **Heritage Modern content** (cream hero, hairline section heads, sharp cards, display-serif KPI numerals).
- Numbers, dates and all data use mono/display tabular figures. Western digits in both locales (Eastern Arabic digits used only in the AR greeting line, matching the product).
- This is a cosmetic recreation: data is static and bilingual; charts are illustrative. It demonstrates the *look, layout and interaction grammar*, not the real Brain/Prisma backend.
