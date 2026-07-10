# H-Nerve Design Skill — Project Reference

**Distilled from the alhorani-design-artist skill (SKILL + 5 module files).**
**This is the permanent design playbook for H-Nerve ERP.** Every UI decision references this file.

---

## 0. The cardinal rule

> **Pick ONE aesthetic vocabulary and execute it with precision.**
> Mixing "bold editorial" with "calm minimalist" produces visual mush — exactly the AI-design tell that screams "shipped without taste."

If the dashboard hero is Brutalist Confidence and the cards underneath are Calm Clinical, the page reads as broken. **Coherence beats novelty.**

For **Hourani Group** specifically (heritage MENA holding, Arabic-first, regional identity, multi-business): the recommended vocabulary is **Heritage Modern**, with Industrial Precision as a secondary register for analytics/finance modules.

---

## 1. The 8 aesthetic vocabularies

Each vocabulary is a complete coherent system: type + color + spacing + motion. Don't cherry-pick — commit to one per surface.

### A. Refined Editorial — *The New York Times / Apple Newsroom*
- **For:** premium content, longform, editorial dashboards
- **Type:** GT Sectra / Tiempos Headline / Canela display + Söhne / Inter Tight body + GT America Mono caption
- **Color:** off-white (#fafaf7) base, ink-black (#0a0a0a) text, single accent (oxidized teal, brick red)
- **Detail:** generous gutters, hairline rules, drop caps, justified blocks for long-form

### B. Industrial Precision — *Linear / Vercel / Stripe Atlas*
- **For:** developer tools, analytics, finance, anything technical
- **Type:** Inter Tight / Söhne (display) + Inter (body) + JetBrains Mono / Berkeley Mono (mono)
- **Color:** near-black (#0e0e10) base, slate-300 text, electric accent (#5b8def or #00d27a)
- **Detail:** 1px hairlines, mono numbers everywhere, dense data, terminal-like ASCII tables

### C. Quiet Authority — *Bloomberg Terminal redesigned by Dieter Rams*
- **For:** institutional, banking, legal, government reporting
- **Type:** Söhne / Neue Haas Grotesk Display + body in same family + tabular figures
- **Color:** deep ink + warm gray + single deep saturated accent (oxblood, navy, forest)
- **Detail:** geometric grids, no gradients, no shadows, restrained spacing

### D. **Heritage Modern** — *MENA holding refined for 2026* ★
- **For:** Hourani Group, AAU, Maha, Loran — anything with regional/cultural identity
- **Type Latin display:** GT Sectra / Tiempos Headline / Canela
- **Type Arabic display:** Aref Ruqaa / Reem Kufi
- **Type body:** IBM Plex Sans Arabic + Söhne / Inter (Latin sister)
- **Type mono:** GT America Mono / IBM Plex Mono
- **Color earth palette:** cream `#f5efe6`, terracotta `#b85c38`, ochre `#c69345`, dusty rose `#c98b8b`, deep teal `#1f4e4a`, oxidized copper `#7d5a3a`, ink black `#1a1612`
- **Detail:** generous spacing, restrained gold accents, hairline gold rails, large arabesque-friendly headlines, no neon, no gradients
- **Mood:** confident, rooted, premium, regional without being theme-park

### E. Calm Clinical — *Notion / Linear in light mode / Apple Health*
- **For:** healthcare, wellness, productivity, focus tools
- **Type:** Inter / Söhne all-caps minimal + soft accents
- **Color:** warm white #fbfaf7, charcoal text, sage / sky / blush single tints
- **Detail:** rounded 12-16px corners, soft shadows (rare), generous whitespace, almost no borders

### F. Sleek Operator — *Tesla UI / Rivian / Mercury / Arc browser*
- **For:** consumer pro tools, modern fintech, EV/automotive, design tools
- **Type:** Inter Display / GT Walsheim + Inter body + JetBrains Mono
- **Color:** true black #000, off-white text, single iridescent accent (cyan, magenta), subtle glow
- **Detail:** 4-6px rounded corners, layered shadows, frosted glass (only sparingly), monospace badges

### G. Warm Editorial — *The New Yorker meets Aesop*
- **For:** lifestyle, hospitality, wellness brands, premium consumer
- **Type:** Caslon / Garamond display + Söhne body + Caslon italic for accents
- **Color:** cream + sepia + olive + brick + ink, no white
- **Detail:** old-style figures, italic small caps, generous leading, ornamental dividers

### H. Brutalist Confidence — *KoTo / Pentagram / Awwwards 2024*
- **For:** creative agencies, contrarian B2B, fashion, art tech
- **Type:** Druk Wide / GT America Condensed Black + Inter Tight body + Departure Mono
- **Color:** flat single-accent (electric yellow, hot pink, blood orange) on stark black/white
- **Detail:** 0px corners, hard offset shadows, mono uppercase headers, asymmetric grid, single screaming accent

---

## 2. Typography systems

### 2.1 The modular scale
Pick **one ratio**. Don't mix.
- 1.200 (minor third) — calm, minimal
- 1.250 (major third) — balanced default ★
- 1.333 (perfect fourth) — editorial
- 1.414 (augmented fourth) — dramatic
- 1.500 (perfect fifth) — strong hierarchy
- 1.618 (golden) — classical, magazine

Steps from a 16px base at 1.25: `12.8 / 16 / 20 / 25 / 31.25 / 39.06 / 48.83 / 61.04 / 76.29 / 95.36`

### 2.2 Display tracking & leading
- **Headlines (48px+):** tracking `-0.02em` to `-0.04em`, leading `0.95` to `1.05`
- **Subheadings (24-40px):** tracking `-0.01em` to `-0.02em`, leading `1.1` to `1.2`
- **Body (15-18px):** tracking `0`, leading `1.5` to `1.65`
- **Captions / labels (11-13px):** tracking `+0.02em` to `+0.06em`, leading `1.4`
- **Mono uppercase eyebrows:** tracking `+0.10em` to `+0.18em`

### 2.3 Measure (line length)
- Body prose: **60-75ch** ideal (use `max-w-[65ch]`)
- Wide cards/tables: full width, smaller font
- Display headlines: 8-15 words, force `text-wrap: balance`

### 2.4 Numerals
- **Tabular numerals (`font-variant-numeric: tabular-nums`)** for ALL data: KPIs, tables, charts, dates, money
- **Old-style figures** for editorial body prose
- Never proportional figures in financial data

### 2.5 Bilingual Arabic-Latin pairing
**Critical for H-Nerve.** Pair Arabic and Latin fonts by **visual rhythm**, not category:

| Arabic display | Latin display sister |
|---|---|
| Aref Ruqaa | GT Sectra / Canela |
| Reem Kufi | Inter Tight / Söhne |
| Frutiger Arabic | Inter / Söhne |
| IBM Plex Sans Arabic | IBM Plex Sans |
| Cairo | Inter / Söhne |

**Rules:**
- Use logical CSS properties: `margin-inline-start`, `padding-inline-end`, `border-inline-start` (never `margin-left/right`)
- `lang="ar" dir="rtl"` on Arabic blocks; `lang="en" dir="ltr"` on Latin blocks within RTL pages
- Arabic numbers: by default use Western digits (0-9) for data — Eastern Arabic numerals (٠-٩) only when the page is fully Arabic editorial
- Match cap-height visually, not point size — Arabic typically needs +1-2px to match Latin x-height

### 2.6 Weight palette per surface
- Display headlines: **800 / 900** if Brutalist; **400 / 500** if Heritage / Editorial
- Subheadings: **600**
- Body: **400** (or **450** if available)
- Strong inline: **600** (never **700** for inline emphasis — too heavy)
- Eyebrows / labels: **500** uppercase

---

## 3. Color & detail

### 3.1 The 60/30/10 rule
- **60% neutral base** (off-white or near-black, never pure)
- **30% supporting neutral** (slate, warm gray, cream)
- **10% accent** (single saturated color)

Never have two competing accents at equal weight on one screen. If you need two, make one 80% size of the other.

### 3.2 Off-blacks and off-whites
**Pure `#000` and `#fff` are the AI-design tell.** Always shift slightly:
- Off-black: `#0a0a0a` (cool) or `#1a1612` (warm Heritage) or `#0e0e10` (Industrial)
- Off-white: `#fafaf7` (warm) or `#f8f9fb` (cool) or `#f5efe6` (cream Heritage)

### 3.3 Layered shadows, not single
**Single 4px shadow = AI tell.** Layer two:
```css
box-shadow:
  0 1px 2px rgba(15, 12, 8, 0.04),
  0 8px 24px rgba(15, 12, 8, 0.06);
```
For Heritage/Editorial, often **no shadows at all** — use hairline rules instead.

### 3.4 Forbidden gradients
- ❌ Purple → blue (Stripe-2018 cliché)
- ❌ Pink → orange ("Instagram story" cliché)
- ❌ Any 3-stop rainbow
- ❌ Gradients on text headlines (almost always)

**Acceptable:** subtle 5-8% darkening at one corner of a hero plinth, single-hue saturation shift.

### 3.5 Heritage Modern palette (Hourani)
```css
--cream: #f5efe6;       /* surface */
--cream-2: #ede5d6;     /* surface raised */
--ink: #1a1612;         /* primary text */
--ink-2: #2c2620;       /* secondary text */
--terracotta: #b85c38;  /* primary accent */
--ochre: #c69345;       /* gold accent / CTAs */
--rose: #c98b8b;        /* soft accent */
--teal: #1f4e4a;        /* deep accent */
--copper: #7d5a3a;      /* mid accent */
--rule: #d8cdb9;        /* hairline rules */
--rule-strong: #b8a98c; /* emphasized rules */
```

### 3.6 Hairline rules
- 1px or 1.5px max
- Color: `--rule` at ~60-70% opacity of the ink
- Use `inset 0 -1px 0 var(--rule)` for elegant section separators
- Never `border: 2px solid #ccc` — that's clip-art

### 3.7 Status semantics
- Success/healthy: deep emerald `#1f4e4a` or sage `#7a9b7a` (Heritage), `#10b981` (Industrial)
- Warning: ochre `#c69345` (Heritage), amber `#f59e0b` (Industrial)
- Critical: terracotta `#b85c38` (Heritage), rose `#e11d48` (Industrial)
- Info: deep teal `#1f4e4a` (Heritage), blue `#3b82f6` (Industrial)
- Always pair with an icon — color alone fails accessibility

---

## 4. Animation cookbook

### 4.1 Easing curves (the only ones you need)
```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);    /* default UI */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);    /* dramatic entry */
--ease-in-out:    cubic-bezier(0.65, 0, 0.35, 1);   /* loops, transforms */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);/* playful (rare in ERP) */
```
**Never** use `ease`, `ease-in`, `ease-out`, `linear` defaults. They are flat.

### 4.2 Durations
- Hover micro: 120-180ms
- Default UI transition: 200-280ms
- Card mount / route enter: 320-420ms
- Page-level fade: 480-600ms
- Hero reveal: 700-900ms (use only on first paint)

### 4.3 GPU-only properties
Animate **only** `transform` and `opacity`. Never animate:
- `width`, `height` (causes layout)
- `top`, `left` (use `translate` instead)
- `box-shadow` directly (animate a `::before` overlay's opacity)
- `background-color` (use a layered overlay)

### 4.4 Recipes (project-wide)

**Card mount stagger:**
```css
@keyframes card-rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}
.card-stagger > * {
  animation: card-rise 420ms var(--ease-out-quart) both;
}
.card-stagger > *:nth-child(1) { animation-delay: 0ms; }
.card-stagger > *:nth-child(2) { animation-delay: 60ms; }
.card-stagger > *:nth-child(3) { animation-delay: 120ms; }
.card-stagger > *:nth-child(4) { animation-delay: 180ms; }
```

**Hover lift (cards):**
```css
.lift {
  transition: transform 180ms var(--ease-out-quart),
              box-shadow 180ms var(--ease-out-quart);
}
.lift:hover { transform: translateY(-2px); }
```

**Number ticker:**
- Use `Intl.NumberFormat` + a 600ms eased interpolation from old to new value
- Always `font-variant-numeric: tabular-nums` to prevent width jitter

**Skeleton pulse:**
```css
@keyframes skel { 0% { opacity: .6 } 50% { opacity: 1 } 100% { opacity: .6 } }
.skel { animation: skel 1.4s ease-in-out infinite; }
```

**Sparkline draw-in:**
```css
.spark path { stroke-dasharray: 1000; stroke-dashoffset: 1000;
  animation: draw 900ms var(--ease-out-expo) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

### 4.5 Reduced motion
**Always wrap motion in:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.6 What NOT to animate
- Don't bounce. Don't wobble. Don't 3D-rotate.
- Don't animate hero text per-character on initial load (>200ms total budget)
- Don't loop an animation indefinitely unless it's a status indicator

---

## 5. Interface patterns

### 5.1 Hairline borders + subtle bg
```css
.card-hairline {
  background: var(--cream-2);
  border: 1px solid var(--rule);
  border-radius: 0; /* Heritage = sharp; Industrial = 4px; Calm = 12px */
}
```

### 5.2 Status pill with current-color dot
```html
<span class="pill pill-success">
  <span class="pill-dot"></span>
  ACTIVE
</span>
```
```css
.pill { display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 11px; letter-spacing: 0.08em; font-weight: 500;
  text-transform: uppercase; }
.pill-dot { width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; box-shadow: 0 0 0 2px currentColor / 0.2; }
```

### 5.3 Mono uppercase eyebrows
```css
.eyebrow {
  font: 500 11px/1 'GT America Mono', 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ink-2);
}
```

### 5.4 Custom focus rings
```css
*:focus-visible {
  outline: 2px solid var(--ochre);
  outline-offset: 2px;
  border-radius: inherit;
}
```
Never the browser default blue ring.

### 5.5 Three-tier dashboard hierarchy
1. **Hero metric** — clamp(48px, 7vw, 120px), display font, single number
2. **Supporting metrics** — 3-5 tiles, 22-30px values, mono numerals
3. **Detail / data** — tables, charts, lists at 13-15px

If everything is the same size, nothing is important.

### 5.6 Tables
- Mono numerals
- Right-align numbers, left-align text
- Hairline row separators (`border-bottom: 1px solid var(--rule)`)
- No zebra striping (cliché)
- Sticky header with subtle bottom shadow on scroll
- Min row height 44px for touch

### 5.7 Buttons
Heritage Modern primary CTA:
```css
.btn-primary-heritage {
  background: var(--ochre);
  color: var(--ink);
  border: 1.5px solid var(--ochre);
  border-radius: 0;
  padding: 12px 22px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: transform 180ms var(--ease-out-quart),
              background 180ms var(--ease-out-quart);
}
.btn-primary-heritage:hover {
  background: var(--terracotta);
  border-color: var(--terracotta);
  color: var(--cream);
  transform: translateY(-1px);
}
```

### 5.8 Empty states
- Always include: icon (line, not filled), one-sentence Arabic + English, single CTA
- Never just "No data" — that's a developer's empty state

### 5.9 Loading states
- Skeleton for layouts known in advance (cards, tables)
- Spinner only for indeterminate fetches < 2s
- Progress bar for known-duration tasks

### 5.10 Forms
- Label above input (never floating in 2026)
- Help text below input, smaller
- Error: red text + 1.5px red border + icon
- Success: green check inline (no banner)
- 16px+ font on inputs (prevents iOS zoom)

---

## 6. Decision matrix for H-Nerve modules

| Module | Vocabulary | Rationale |
|---|---|---|
| **Dashboard / Executive** | Heritage Modern | Hero of the system, sets tone for the brand |
| **Companies registry** | Heritage Modern | Heritage-focused, identity-rich |
| **Hotels (Arena)** | Heritage Modern + warm accents | Hospitality character |
| **Dairy (Maha)** | Heritage Modern + cream/teal | Earthy, agricultural |
| **Farms (Loran)** | Heritage Modern + deep teal/sage | Natural, organic |
| **Education (Tank/AAU)** | Heritage Modern + ochre | Institutional + warm |
| **Finance / Analytics / Compare** | Industrial Precision | Data-dense, technical |
| **Supply Chain / Forecasts** | Industrial Precision | Engineering, predictive |
| **Insights / AI** | Industrial Precision with Heritage accents | Technical core, branded chrome |
| **Sustainability / ESG** | Heritage Modern (deep teal accent) | Storytelling, regional pride |
| **Markets / Projects** | Heritage Modern | Strategic narrative |
| **Settings / Users / System** | Industrial Precision (subdued) | Functional, no narrative |

**The transition between Heritage and Industrial:** keep typography family consistent (IBM Plex Sans Arabic / Inter Tight) and only shift the **accent palette + spacing** between modules. Don't change body fonts when the user clicks from Dashboard to Analytics.

---

## 7. Anti-patterns (the AI-design tells)

❌ Pure black `#000` or pure white `#fff`
❌ Single 4px drop shadow on every card
❌ Purple-to-blue gradient hero
❌ Inter as the display font (it's a body font)
❌ Mixing 4 corner radii on one screen
❌ Generic `lucide-react` icon at 24px next to a number
❌ "Pro" / "Premium" / "Elite" badges in pill form
❌ Sparkline crammed into a 60×20 corner
❌ Dashboard with 12 equal-sized cards
❌ Modal opening with a `transform: scale(0.95)` bounce
❌ Confetti, parallax, glassmorphism (unless single restrained instance)
❌ Linear gradient text
❌ "Refreshing..." spinner with no skeleton
❌ Empty state showing only "No data."
❌ Two competing accent colors at equal weight

---

## 8. Quality bar

Before committing any UI change, ask:

1. **Is this one vocabulary executed precisely?** Or am I mixing two?
2. **Does the hierarchy reward a 5-second glance?** (Hero metric pops, supporting metrics legible, details available on focus)
3. **Are numerals tabular?** Are dates monospaced? Is the headline `text-wrap: balance`?
4. **Do hairlines do the work of borders?** Is there at least one shadowless surface?
5. **Does motion ease properly?** No flat `transition: all 200ms`?
6. **Is Arabic typographically equal to Latin?** Same visual weight, paired by rhythm?
7. **What's the single accent on this screen?** Can I name it in one word?
8. **Does it work at `prefers-reduced-motion`?**
9. **Does it work in light + dark?** (At least one fallback)
10. **Would Bloomberg / The New Yorker / Linear ship this?** If no — what's missing?

---

## 9. The Hourani brand specifics

- **Name:** مجموعة الحوراني / Hourani Group / H-Nerve (the ERP)
- **Heritage character:** Jordanian holding, multi-generation, hospitality + agriculture + education roots
- **Voice:** confident, rooted, professional, never gimmicky
- **Visual signature:** ochre/gold thin rails, terracotta accents, deep teal punctuation, cream surfaces
- **Forbidden:** neon, holographic, "tech bro" gradients, Western corporate blue
- **Required:** Arabic-first headlines, English secondary, RTL-correct everywhere

---

## 10. Live reference checklist (when designing a new page)

```
□ Single aesthetic vocabulary chosen
□ Type scale ratio chosen (1.25 default for ERP)
□ One accent color named
□ Hairline rule color set
□ Mono font loaded for numerals
□ Arabic display font loaded
□ Latin display font loaded
□ Easing curves available as CSS vars
□ prefers-reduced-motion respected
□ text-wrap: balance on hero headline
□ tabular-nums on all data
□ logical CSS properties (margin-inline-start, etc.)
□ Focus ring custom + ochre
□ Empty state with icon + bilingual + CTA
□ Loading state (skeleton, not spinner)
□ Three-tier hierarchy enforced
□ Hover lift on cards (2px max)
□ Stagger on card mount (60ms intervals)
□ No pure #000 / #fff
□ No purple→blue gradient
□ One vocabulary, executed with precision
```

---

**Last updated:** 2026-04-30
**Next review:** when adding a new module, before any redesign sprint, when typography questions arise.
**Source:** alhorani-design-artist skill v1 (SKILL.md + 5 module files), distilled and adapted for H-Nerve ERP.
