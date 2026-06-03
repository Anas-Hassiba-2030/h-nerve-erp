# Prompt — H-Nerve login: the "living nervous system" gateway

> Paste-ready brief for Claude Design (or any AI design tool). It is written to
> stay **coordinated with the existing H-Nerve design system** (Heritage Modern,
> deep-emerald + gold, bilingual ar/en RTL) while delivering the heavily-animated,
> cinematic login Anas wants. The form must stay 100% functional — only the
> shell and motion are being redesigned.

---

## THE PROMPT

You are designing the **login screen** for **H-Nerve ERP** — *"The Digital
Central Nervous System of Hourani Group."* This is the first thing anyone sees;
it must feel like **waking a living intelligence** and stepping through a portal
into the system's universe. Aim for **cinematic, premium, and richly animated** —
the calibre of an Apple keynote intro or a Linear/Stripe launch page — but
*restrained and tasteful*, never gaudy. Every motion must feel intentional and
coordinated, like one organism breathing.

### Brand & art direction (do not deviate)
- **Vocabulary:** Heritage Modern — *a MENA holding refined for 2026.* Confident,
  editorial, expensive. No neon, no clip-art, no generic SaaS gradients.
- **Core palette (use these exact values):**
  - Emerald primary `--brand #0f7a5a`, deep `--brand-deep #0a4d3a`
  - Gold/ochre accent `--accent #c69345`
  - Earth support: cream `#f5efe6`, deep teal `#1f4e4a`, ink `#1a1612`
  - Backgrounds are a **deep emerald → warm-gold aurora**, not flat black.
- **Logo:** the hexagonal **"H"** mark (emerald hex, white H, gold edge glow). It
  is the **nucleus** of the composition.
- **Type:** display in *Fraunces* (Latin) / large arabesque-friendly Arabic
  (Cairo/Tajawal); body in *Inter* / *IBM Plex Sans Arabic*. Gold hairline rails.
- **Bilingual:** fully **Arabic (RTL) and English (LTR)**. Default Arabic. The
  AR/EN + Theme toggles stay top-trailing. Mirror layout + animation direction
  per locale.

### The central concept: a breathing neural cosmos
Build the background as a **living nervous system rendered as a cosmos** — tie
together the brand ("nervous system") and the product's Orrery hub (planets of
light). Layer it (back → front), all GPU-cheap (transform/opacity only):

1. **Aurora nebula** — slow, breathing emerald→gold radial gradients drifting
   like northern lights (20–40s loops, eased, never looping-obvious).
2. **Synapse field** — a sparse field of soft particles ("neurons") connected by
   faint hairline "axons." Occasional **gold synaptic sparks** travel along the
   lines and fade — the system *thinking*. Density low; elegance over busyness.
3. **The nucleus** — the hexagon H logo, gently floating/breathing, haloed by a
   soft emerald bloom, with **2–3 thin orbital rings** carrying tiny gold
   impulse-dots (a nod to the Orrery). The whole logo assembles on load.
4. **Depth dust** — a few faraway drifting gold motes for parallax.

### Choreography (the part that should feel "a million animated")
- **Entrance (page load):** a 1.2–1.8s overture — nebula fades up, the nucleus
  draws/assembles, orbits spin into place, then the form card **rises + glows in**
  with a staggered reveal of each field (subtle, `--ease-out-quart`-style).
- **Idle:** everything breathes — nebula drift, logo float, orbit rotation,
  intermittent synapse sparks. Calm, hypnotic, never distracting from the form.
- **Micro-interactions (delight in the details):**
  - Input focus → the field's gold hairline **draws in**; nearby synapses subtly
    route a spark toward the active field (the system "paying attention").
  - Typing → the nucleus pulses faintly in rhythm.
  - Hover the **Sign in** button → gold sheen sweep + soft lift.
- **Sign-in success transition:** a **pulse of light** races from the button
  through the synapse field to the nucleus, the nucleus flares, and the camera
  **dives into the cosmos** (zoom + fade) — implying entry into the Orrery. On
  error, a gentle red-terracotta shake + the nucleus dims briefly.

### The form (keep it fully functional — only restyle)
- Email, Password, **Sign in** (primary), "Don't have an account? **Create
  account**." Inputs are clean, glassy, high-contrast on the dark field.
- Header block: hexagon logo + "H-Nerve ERP" + tagline *"The Digital Central
  Nervous System of Hourani Group"* + the sector strip (Hospitality · Dairy ·
  Smart Agriculture · Education · Markets · ESG).
- Footer: `POWERED BY · ANAS MK HASIBA · H-NERVE`.
- Top-trailing: **AR/EN** toggle + **Theme** toggle.

### Hard constraints
- **Accessibility:** honor `prefers-reduced-motion` — drop to a single calm
  gradient + static logo, no particle motion. WCAG-AA contrast on all text and
  inputs. Full keyboard nav, visible focus rings, proper labels, `aria-live` on
  the auth error.
- **Performance:** 60fps on a mid laptop; animate only `transform`/`opacity`;
  cap particle count; pause the loop when the tab is hidden
  (`visibilitychange`); be battery-conscious. The form must be interactive within
  ~1s even while the overture plays (never block input on animation).
- **Tech target:** Next.js 14 App Router page at `app/(auth)/login/`. Reuse the
  existing CSS-variable theme tokens (`--brand`, `--accent`, …) so it inherits
  every theme. Prefer CSS/Web-Animations or a lightweight `<canvas>`; **no heavy
  3D libs** unless justified (keep the bundle lean). Server component shell +
  a small client component for the animated layer.
- **Responsive:** flawless on mobile (reduce particle density, stack gracefully),
  perfect on RTL.

### Deliverables
1. A short **concept rationale** (why these motion choices serve the brand).
2. The **full implementation**: the login page + the animated background as a
   self-contained client component, themed via the existing CSS vars, with the
   reduced-motion + reduced-density fallbacks wired.
3. Notes on any new tokens/assets added, and a 1-line list of the animation
   layers so it's easy to tune.

Make it feel **alive, coordinated, and unmistakably H-Nerve.** Restraint is the
luxury — a few perfect motions beat a hundred noisy ones.

---

## ITERATION 2 — fixes from the first review (paste this next)

The first pass is close, but three things break the "astonish in 5 seconds"
goal. Fix these precisely and push the polish further.

**1. The sector strip looks cheap.** Right now the sectors (Hospitality · Dairy
· Smart Agriculture · Education · Markets · ESG) render as large, plain,
underlined inline words — it reads like a row of broken links, not a premium
brand. Redesign it as a **whisper-quiet caption**: small uppercase, generous
letter-spacing (~0.18em), muted gold (`--accent` at ~55% opacity), separated by
thin `·` dots, on ONE centered line — no underlines, no link styling, ~11px.
It should feel like an engraving under the brand, not a navbar. On mobile it may
wrap to two lines or shrink; never let it dominate.

**2. The nucleus + orbit rings collide with the card.** The hexagon and its
rings overlap the top edge of the login card awkwardly (hard clipping, ambiguous
depth). Fix the composition so it reads as deliberate: the **nucleus sits as a
crown clearly ABOVE the card** with breathing room, and the orbital rings either
(a) stay fully above/behind the card with soft, *un-clipped* edges, or (b) pass
behind a frosted-glass card with real z-depth and a feathered mask so no ring
edge ever hard-cuts on the card border. No element should look "stuck" to the
card. Center the whole stack as one balanced vertical rhythm:
logo → wordmark → tagline → sectors → card.

**3. It must astonish — go further on motion + payoff.**
- **Parallax:** the cosmos (nebula, synapse field, dust) drifts subtly with
  mouse / device tilt — depth that makes it feel like a window, not a wallpaper.
- **The sign-in payoff is the hook:** on success, the light pulse → nucleus
  flare → **camera dives through the orbital rings into the cosmos** must be
  genuinely cinematic (smooth zoom + motion-blur streak + fade), because it sets
  up the Orrery they're about to see. This transition is the money shot — make
  it gorgeous.
- **First 0.5s:** the very first frame should already look alive (nebula
  pre-warmed), then the overture refines it. Never a flash of plain background.

Keep everything else (palette, bilingual RTL, frosted card, no create-account
button, ANAS MK HASIBA footer, reduced-motion fallback). Restraint everywhere
EXCEPT the sign-in dive, which is allowed to be a showstopper.
