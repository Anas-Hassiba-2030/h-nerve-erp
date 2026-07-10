# H-Nerve Design System

> **H‑Nerve ERP** — the bilingual, Arabic‑first "thinking ERP" for **مجموعة الحوراني / Hourani Group**, a diversified Jordanian holding spanning hospitality, dairy, agriculture and education. This repository is the design system distilled from the live product: tokens, type, logos, UI kits and the design playbook needed to build new H‑Nerve surfaces that look and feel native to the product.

---

## 1. What H‑Nerve is

H‑Nerve is **not a data‑entry ERP**. Beneath every screen sits a causal‑reasoning **"Brain"** — a read‑mostly intelligence layer that reads the group's domain data, debates decisions with AI advisors (a "Council" of domain experts), forecasts, simulates "what‑if" scenarios, and **narrates insights in editorial prose**, bilingually. The Brain *proposes*; it never silently mutates the books (see `docs/`‑equivalent `BLUEPRINT.md` summary below).

The group it serves, **Hourani Group (مجموعة الحوراني)**, is a multi‑generation MENA holding. Its business units each have a distinct identity:

| Unit | Code | Sector | Identity |
|---|---|---|---|
| Hourani Holding | `HH` | Governance / holding | Layered hexagonal crown — heritage, depth |
| Arena Space Hospitality | `ARENA` | Hotels / hospitality | 5‑pointed star in an arena ring — prestige |
| Maha Dairy | `MAHA` | Dairy | Water drop + ripples — purity, freshness |
| Loran Agricultural Investment | `LORAN` | Agriculture / farms | Leaf inside a sun‑ray rosette — growth |
| Al‑Ahliyya Amman University ("The Tank") | `AAU` | Education | Scholar's book before a pillared portico |

### The four surfaces

The design system covers four product surfaces, each with its own UI kit (`ui_kits/`):

1. **Executive web dashboard** — the hero of the system. The whole group's pulse on one screen: KPI hero, per‑company strip, financial pulse, activity stream, alerts, calendar, module nav. *Heritage Modern* register on *emerald* chrome.
2. **Mobile daily‑brief** (`/m`) — a calm "today" screen: three columns of at‑most‑three cards — **Know / Decide / Approve** — with a narrator line. Warm, clinical, second‑person.
3. **Decision Theater** (`/theater`) — a fullscreen, sidebar‑less *magazine spread*. The Brain presents a decision as editorial prose with a giant Arabic display headline, a terracotta drop‑cap, justified bilingual body, and a hairline data rail. ESC returns you to the dashboard.
4. **Superadmin console / Empire boardroom** (`/admin`, `/empire`) — a consolidated cross‑tenant god‑view: one revenue rollup, four sector pulse cards, the live council feed, top causal drivers, brain activity by tenant.

---

## 2. Sources (for the reader)

This system was reverse‑engineered from materials the design team was given. You may not have access to all of them, but they are recorded here so you can go deeper:

- **Production codebase** — `BMV2026/` (a Next.js App Router + Prisma monorepo). The single richest source: `app/globals.css` (~9.7k lines of design tokens + component CSS), `docs/governance/DESIGN-SKILL.md` (the canonical design playbook), `docs/governance/BLUEPRINT.md` (the Brain architecture), `lib/brand/themes.ts` (9 tenant theme presets), and `components/` (Logo, Sidebar, PageHeader, HeritageHero, mobile, empire, brand/CompanyLogo, …).
- **GitHub repo** — [`Anas-Hassiba-2030/h-nerve-erp`](https://github.com/Anas-Hassiba-2030/h-nerve-erp) *(private)*. The same product on GitHub. **Explore this repository further** to build higher‑fidelity designs — the components, theme presets and the `lib/brain/` reasoning layer are all there.
- **Pitch screenshots** — `BMV2026/docs/pitch-screenshots/` (22 PNGs of the live product). A handful are mirrored under `_ref/` here for grounding.

> The product's own design playbook (`docs/governance/DESIGN-SKILL.md`) is the spiritual parent of this README; where they conflict, **the live tokens in `app/globals.css` win** (e.g. the playbook describes an early all‑earth palette; the shipped product pairs an **emerald** chrome with the Heritage earth content layer — documented faithfully below).

---

## 3. The dual‑register system (read this first)

H‑Nerve runs **two coherent visual registers under one roof** — this is the single most important thing to understand before designing.

### A. Emerald System — *chrome, navigation, brand*
Deep emerald `#0f7a5a` + gold `#c69345` on warm off‑white `#f8f6ef`. This is the **interactive / brand signature**: the sidebar, active nav states, primary CTA buttons, the login screen, status badges, and the H‑Nerve logo all live here. It says *premium private‑bank software*.

### B. Heritage Modern — *editorial content*
Cream `#f5efe6` + ochre `#c69345` + terracotta `#b85c38` + teal `#1f4e4a`, with warm ink `#1a1612` text. This is the **calm editorial magazine** layer: the dashboard hero plinth, section cards, KPI tiles with display‑serif numerals, and the entire Decision Theater. Sharp 0px corners, hairline rules instead of borders, no shadows. It says *The New Yorker, in Arabic*.

**Gold/ochre `#c69345` is the connective tissue** — it is `--accent` in the emerald register and `--heri-ochre` in the heritage register, the one color that appears in both.

The rule (DESIGN‑SKILL §6): keep the **body font family constant** across registers; only shift the **accent palette + spacing + corner radius** between chrome and content. Never change body fonts when moving from Dashboard to Theater.

Full token reference: **`colors_and_type.css`**. Foundations gallery: the **Design System** tab (cards in `preview/`).

---

## 4. CONTENT FUNDAMENTALS — how H‑Nerve writes

H‑Nerve's voice is **confident, rooted, editorial, and calm**. It reads like a trusted advisor briefing a principal, not like enterprise software. It is **bilingual and Arabic‑first**: Arabic is the primary language and leads; English is the secondary/sister script.

**Tone & vibe**
- *Calm authority.* Never breathless, never "🎉 You're all caught up!". The mobile empty state reads: **"All clear here. Nothing needs you right now. We'll page you."** / «كل شيء هادئ هنا. لا شيء يستدعي تدخّلك الآن. سنُنبّهك.»
- *Editorial, not transactional.* The Brain narrates. A theater spread opens with prose like: *"Arena is booming and operations is studying doubling Maha cheese production in Q3… Five dairy units expire within three days, and one farm is sending warning signals."* The numbers are embedded in the story, not dumped in a table.
- *Second person, warm sign‑off.* The mobile brief closes: **"That's all. Come back when you need to."** / «هذا كل شيء. ارجع إذا احتجت.» It addresses the user by first name in the greeting ("Welcome back, Anas." / «يومٌ مُبارَك، أنس.»).

**Casing & mechanics**
- **Sentence case** for English titles and body. NO Title Case Headlines. NO ALL‑CAPS prose.
- **ALL‑CAPS is reserved for mono eyebrows / labels only** — short, wide‑tracked: `GROUP PULSE`, `EMPIRE BOARDROOM`, `REVENUE 30D`. Never for sentences.
- **Western digits (0–9)** for all data, even in Arabic UI (`JOD 97,643`, `5%`, `+1.44%`). Eastern Arabic numerals (٠–٩) only in fully‑Arabic editorial moments.
- **Currency:** `JOD` prefix, comma‑grouped, tabular figures (`JOD 137,465`).
- Section labels often come in **bilingual pairs** ("Three to know" / «ثلاثة لتعرف»), and triads are a motif: *Know · Decide · Approve*.

**I vs you**
- The system is "we" (the Brain / H‑Nerve): *"We'll page you."* The user is "you", addressed directly and respectfully.

**Emoji**
- **No emoji in product chrome or prose.** A very small set of **unicode glyphs** appears as functional markers only: `◆` (pinned/bullet), `→` (flow/causal arrow), `⚡` (side‑quest task), `↑ ↓ →` (trend). Treat these as iconographic punctuation, not decoration.

**Microcopy examples to imitate**
- KPI hint: *"Prev JOD 80,210"* / «سابقاً ٨٠٬٢١٠».
- Forecast row: *"Arena Sayss Farah → Loran Agricultural · 84%"* (source → target · confidence).
- Alert: *"Revenue drop at Al‑Ahliyya Amman University by 64.4%"* — plain, specific, no alarmism.

---

## 5. VISUAL FOUNDATIONS

The cardinal rule (DESIGN‑SKILL §0): **pick ONE aesthetic vocabulary per surface and execute it with precision.** For H‑Nerve that vocabulary is **Heritage Modern**, with **Industrial Precision** as a secondary register for the most data‑dense analytics/workflow modules (off‑black canvas, luminous cyan edges — see `globals.css` `.studio-shell`).

**Color**
- Two registers (see §3). 60% neutral base (off‑white / cream) · 30% supporting neutral · 10% single accent. Never two competing accents at equal weight.
- **Never pure `#000` / `#fff`** — always warm‑shifted (`#0f2e2a` forest text, `#1a1612` heritage ink, `#f8f6ef` / `#f5efe6` surfaces).
- Status semantics pair **color + icon** always: healthy → emerald/teal, warning → ochre, critical → terracotta, info → deep teal.

**Type** (full spec in `colors_and_type.css`, scale = 1.25 major third)
- Display Latin **Fraunces** (transitional serif) at weights **400–500** — restrained, not heavy. Display Arabic **Reem Kufi** (modern) / **Aref Ruqaa** (editorial moments).
- Body **Inter Tight / Inter** (Latin) + **IBM Plex Sans Arabic / Cairo / Tajawal** (Arabic).
- Mono **JetBrains Mono / IBM Plex Mono** for ALL numerals, eyebrows, codes — `font-variant-numeric: tabular-nums` everywhere data lives.
- **Signature move:** large KPI values set in **display‑serif Fraunces with tabular figures** (`.num-display`), not a sans. That single choice is the most "H‑Nerve" thing in the type system.
- Headlines `text-wrap: balance`; body `measure` ≈ 65ch; eyebrows mono‑uppercase tracked `0.16–0.18em`.

**Backgrounds & texture**
- Primarily **flat warm surfaces**. No photography in chrome.
- The login uses a **mesh gradient** (emerald → ochre, `radial-gradient` blobs) with faint **constellation dots** — the one place the brand goes atmospheric.
- The app background offers a subtle **24px radial dot grid** (`.nerve-bg`) and an optional **mesh blob** wash (`.nerve-bg-mesh`) at ~8–14% accent opacity. Industrial/workflow surfaces use a dark **24px cyan dot grid**.
- No repeating illustrative patterns; texture is restraint, not ornament.

**Borders, rules & cards**
- **Two card styles by register.** Emerald chrome cards: `border-radius: 1rem`, 1px warm border `--border`, layered soft shadow `--shadow-soft`, hover lifts `-2px`. Heritage cards: **sharp 0px corners**, `1px solid --heri-rule` hairline, **no shadow**, hover only strengthens the rule. Mobile cards: `14px` radius, colored 4px left **band** (sage/sky/blush/ochre), 1px rule.
- **Hairline rules do the work of borders** in Heritage: `box-shadow: inset 0 -1px 0 var(--heri-rule)` for section separators; 1px gradient rails (terracotta→ochre→teal) cap heroes and the page header.
- Optional 3px **ochre gold rail** on the inline‑start of emphasized cards (`.heri-card--gold-rail`).

**Shadows & elevation**
- **Layered, never single** (a lone 4px shadow is the AI tell). `--shadow-soft` = `0 1px 2px rgb(0 0 0/.04), 0 6px 24px (brand‑deep 8%)`. `--shadow-glow` adds a 1px brand ring + a 48px diffuse brand glow for hover/premium.
- Heritage surfaces are frequently **shadowless** — elevation reads from the hairline + cream‑step (`cream` → `cream-2`), not blur.

**Glass & transparency**
- Used **sparingly**: sticky page header (`color-mix(cream 96%) + blur(8px)`), the `.glass` panel (`surface‑elevated 70% + blur(14px)`), drawer backdrop (`text 50% + blur(6px)`). Blur is a focus device for floating chrome, never a default surface.

**Corner radii** (commit to a register's radius — don't mix 4 radii on one screen)
- Emerald chrome: buttons `10px` (`rounded-lg`), cards `16px` (`1rem`), inputs `12px` (`rounded-xl`), pills/badges `999px`.
- Heritage: **0px** (sharp) on cards, buttons, data tiles.
- Mobile: `14px` cards, `999px` nav/synced pills.

**Hover / press states**
- **Hover:** lift `translateY(-1px to -2px)` + deepen shadow; nav links nudge `-2px` toward content (RTL‑flipped) and the icon scales `1.1`; secondary buttons tint to `--brand-soft`; Heritage primary button swaps **ochre → terracotta** fill with cream text.
- **Press:** `.btn:active { transform: translateY(1px) }`; mobile cards `transform: scale(0.985)`. Subtle, never a bounce.
- **Focus:** custom ring — `box-shadow: 0 0 0 4px var(--ring)` (emerald) or a 2px ochre outline with 2px offset. Never the default browser blue.

**Imagery vibe**
- When imagery appears it is **warm** — cream/ochre/emerald cast, never cool corporate blue, never B&W, never heavy grain. The brand forbids neon, holographic, and "tech‑bro" gradients.

**Animation** (full cookbook in DESIGN‑SKILL §4; easing tokens in `colors_and_type.css`)
- **Easing:** only the four curves — `--ease-out-quart` (default UI), `--ease-out-expo` (dramatic entry), `--ease-in-out-q` (loops), `--ease-spring` (rare/playful). **Never** bare `ease`/`linear`.
- **Durations:** hover 120–180ms · UI 200–280ms · card mount 320–420ms · page fade 480–600ms · hero reveal 700–900ms (first paint only).
- **Signature motions:** `heri-rise` (fade + 14px up) staggered at ~70ms intervals on dashboard sections; `count-up` number tickers (eased, tabular to avoid jitter); sparkline `draw` (stroke‑dashoffset); a slow 2.4–2.8s **heartbeat** ring on the live/nerve status dot (a heartbeat, not a strobe); skeleton shimmer at 1.4s.
- **Animate only `transform` + `opacity`.** Never width/height/top/left/box‑shadow directly. Always honor `prefers-reduced-motion`.
- **No** bounce, wobble, 3D rotate, parallax, or infinite loops (except status indicators).

**Layout rules**
- Three‑tier hierarchy per screen: one hero metric (clamp 48–120px) → 3–5 supporting tiles (22–38px) → detail tables/lists (13–15px). If everything is the same size, nothing is important.
- Sidebar is **sticky, right‑side in RTL**, collapsible to a 72px icon rail (⌘B). Page header is sticky with a blur + gradient hairline. Tables: tabular numerals, right‑align numbers, hairline row separators, **no zebra striping**, 44px min row height.
- Logical CSS properties everywhere (`margin-inline-start`, `border-inline-start`) so a single layout serves both LTR and RTL.

---

## 6. ICONOGRAPHY

- **Primary icon set: [Lucide](https://lucide.dev)** (`lucide-react` in the codebase). This is the only line‑icon system used in product chrome — sidebar, headers, buttons, KPI markers, status. Stroke weight is **thin: `strokeWidth` 1.4–1.5** for editorial calm (the Lucide default 2 is reserved for tiny inline marks). Sizes: `16px` (`h-4 w-4`) inline/nav, `12–14px` for dense rows, `20–24px` for feature moments. **For HTML mocks, link Lucide from CDN** — see below — to match the product exactly.
- **Custom brand SVGs:** the H‑Nerve **nerve mark** (hexagon + H letterform + gold node, optionally with orbiting satellites) and the **five animated company logos** (HH, ARENA, MAHA, LORAN, AAU) are bespoke inline SVGs, **not** from any icon set. They are reproduced as standalone files in `assets/` — use those, never redraw them.
- **Unicode glyphs as functional marks (sparingly):** `◆` pinned/bullet, `→` causal/flow arrow, `⚡` side‑quest, `↑ ↓ →` trend direction, chess‑piece glyphs (`♟♞♝♜♛♚`) for the gamified user "rank". These stand in for icons in text contexts; they are not decoration.
- **No emoji** anywhere in product chrome or prose.

### Using Lucide in a mock
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="brain" style="width:18px;height:18px;stroke-width:1.5"></i>
<script>lucide.createIcons();</script>
```
Icons seen across the product: `LayoutDashboard, Building2, Hotel, Milk, Sprout, GraduationCap, Brain, Wallet, Sparkles, TrendingUp, Leaf, Network, Zap, Users, Heart, Globe2, Crown, ShieldCheck, Activity, Bell, Search, Pin, ArrowUpRight, ArrowDownRight, Download`.

---

## 7. Index / manifest

> Populated as the system is built out. See the **Design System** tab for the visual gallery of every token and component.

- **`README.md`** — this file (context, sources, content + visual foundations, iconography, index).
- **`colors_and_type.css`** — all color, type, easing and elevation tokens. The source of truth.
- **`fonts/fonts.css`** — Google Fonts @import (all families; no local font files exist — see Caveats).
- **`assets/`** — brand SVGs: `logo-hnerve.svg`, `logo-hnerve-white.svg`, and the five company logos (`company-hh/arena/maha/loran/aau.svg`).
- **`preview/`** — the Design System tab cards (tokens, type, components).
- **`ui_kits/`** — high‑fidelity, interactive recreations, one folder per surface:
  - `ui_kits/dashboard/` — executive web dashboard (emerald chrome + Heritage content, EN/AR)
  - `ui_kits/mobile/` — mobile daily‑brief (Know / Decide / Approve, in an iOS frame)
  - `ui_kits/theater/` — Decision Theater (fullscreen editorial spread)

### The "Orrery" living system (Heritage Luxury motion layer)

A cinematic navigation + ambient‑motion system layered over the design system. Built for a non‑technical chairman: spectacle is effortless, interaction is big and forgiving. Two worlds — **emerald night** for navigation, **ivory daylight** for work — with **gold** as the connective starlight.

- **`orrery.html`** — the cosmic home + primary navigation. A brass‑orrery model: the **Brain** at center, **6 anchor groups** orbiting on a living clockwork (inner ring 45s, outer 60s). Click an anchor → its child sections **bloom** into a second orbit ring; click a child → a **planet‑dive** falls into that section. Opens with **"The Gathering"** entry (gold filings stream in, six settle into orbit, Brain ignites last; replay control in the top bar). Scattered **insight‑stars** auto‑surface one‑line ideas on a calm rotation. Full reduced‑motion fallback.
- **`living-bg.css` / `living-bg.js`** — the **global living background** (Phase 2). One drop‑in include; `data-living="work"` (warm ivory aurora + drifting micro‑particles) or `data-living="night"` (cosmic starfield). Pauses when tab hidden; reduced‑motion → static gradient.
- **`interactions.css`** — **shared micro‑interactions** (Phase 3): `.btn` primary/gold/secondary/ghost with gold shine‑sweep + ripple, `.ix-card` lift + gold top‑edge wipe, `.ix-link` RTL‑aware underline grow. ≥44px targets, 0.3–0.4s, reduced‑motion safe.
- **`ambient.css` / `ambient.js`** — **per‑section signature backgrounds** (Phase 4), chosen by one `data-ambient="…"` attribute: `hospitality` (golden‑hour beams), `dairy` (flowing milk), `agriculture` (living field + wind particles), `university` (chalk & architecture), `holding` (heritage rings), `finance` (data tide), `cosmic` (motes toward a central glow).
- **`sections/`** — destination pages in the ivory **daylight** register, each wired to the living background, signature ambient, and shared interactions:
  - Sector/finance/people/system pages: `arena.html`, `maha.html`, `loran.html`, `ahliyya.html`, `holding.html` *(the Empire/holding god‑view)*, `finance.html`, `team.html`, `system.html`
  - `brain.html` — the **العقل** night surface (the motion quality bar: IQ orb, council, causal drivers)
  - `section.html` — a single parametric **placeholder** (`?s=&g=&a=`) so every one of the ~45 orbit children resolves to a real, on‑brand page (no dead‑ends)
  - `_section.css` / `section.js` — shared daylight styles + behaviors (instant‑visible scroll reveals, count‑up KPIs, sliding segmented control, planet‑dive page transitions)
- **`SKILL.md`** — Agent‑Skill manifest for using this system in Claude Code.
- **`_ref/`** — a few mirrored pitch screenshots for grounding.

> **Start here:** open **`orrery.html`** — it is the front door to the whole system and links into every surface above.

---

## 8. Caveats / substitutions

- **No local font files.** The product loads every family from Google Fonts via CDN, so this system does too (`fonts/fonts.css`). If you need offline/self‑hosted fonts, supply `.woff2` files for: Fraunces, Reem Kufi, Aref Ruqaa, Inter Tight, IBM Plex Sans Arabic, JetBrains Mono.
- The DESIGN‑SKILL playbook names some display families that aren't free (GT Sectra, Söhne, Canela, GT America Mono). The shipped product substitutes free equivalents — **Fraunces** for the Sectra/Tiempos slot, **Inter/Inter Tight** for Söhne, **JetBrains Mono / IBM Plex Mono** for GT America Mono. This system follows the shipped substitutions.
