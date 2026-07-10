# Phase 28 — The Companion

Scoping doc (read-only survey; no code changed). Source: `docs/governance/PHASES-INTELLIGENCE.md` §"Phase 28 — The Companion (the soul)" (lines 889–933). Pitch: a small ambient *light-being* ("the Spark / الشرارة") — an emerald-gold mote that idles in a corner, drifts, and reacts to Brain/insight/toast events. Restraint over mascot.

## Current state (what already exists in the repo, with file paths)
- **No companion code exists.** Grep for `Companion|light-being|LightBeing|roaming` across `**/*.{ts,tsx,css}` returns nothing; the only hits are a remote git branch `docs/login-prompt-companion-phase`. This is greenfield.
- **The exact mount point is ready.** `app/(app)/layout.tsx` already composes ~10 sibling global overlays (lines 123–143): `LivingAtmosphere`, `OrbitReturn`, `FabRail`, `ToastProvider`, `Conversational`, `TimeScrubber`, plus the lazy `DeferredOverlays`. Adding the Spark = one more sibling here.
- **A precedent for an always-on, full-screen, non-blocking ambient layer:** `components/orrery/LivingAtmosphere.tsx` (a `pointer-events`-safe canvas injected via `/living/atmosphere.js`, mounts/unmounts per route through `usePathname`). The Spark mirrors this lifecycle.
- **A client event bus already exists** — `window` CustomEvents named `h-nerve:*`. `components/orrery/FabRail.tsx` fires `h-nerve:converse:open` (the "Ask the Brain" FAB the Spark should dart toward). Toasts fire `TOAST_EVENT = "h-nerve-toast"` (`lib/toast.shared.ts:6`), dispatched in `components/Toast/ToastProvider.tsx:93`. The Spark subscribes to these — no new transport needed.
- **Realtime substrate** (`lib/realtime.ts`, SSE via `app/api/realtime/stream`, consumed by `components/realtime/RealtimePresence.tsx`) is the optional channel for "Brain is thinking" reactions.
- **`prefers-reduced-motion` + `pointer-events:none` are an established pattern** — `components/Confetti.tsx` (lines 18–28) bails fully on reduced-motion and renders `pointer-events-none fixed inset-0`. The "celebratory flare" reaction can reuse Confetti's CSS-only approach.
- **Brain mood signal exists** — Brain IQ / `ragQuality` (`lib/brain/meta.ts`, `meta.reflector.ts`) is the value to tie the Spark's glow to (optional).
- **No localStorage-preference helper for an overlay's on/off** was found cleanly; persistence must be added (cookie or `localStorage`, matching `OnboardingTour`/`WelcomeSplash` dismiss style under `DeferredOverlays`).

## Scope (what "shipping this phase" concretely means)
A single global client component (the Spark) mounted in `(app)`, lazy-loaded via `DeferredOverlays`, that: (1) **idles** in a corner with a CSS breathing/bob; (2) **drifts** on a gentle path occasionally; (3) **reacts** to 3–4 real events (pulse on `h-nerve-toast`, dart toward the Brain FAB on `h-nerve:converse:open`, flare on a completed plan/achievement, dim when idle); (4) is **dismissible + remembered** (one-click hide, persisted, off-by-default for first-timers — confirm default with Anas); (5) honours **`prefers-reduced-motion`** (static or hidden); (6) is **transform/opacity-only, pointer-events:none, pauses on hidden tab, never covers content or steals focus**; (7) is **theme-aware via CSS vars and RTL-mirrored**. Out of scope for v1: tying glow to live Brain IQ (optional stretch), audio, AI-driven dialogue.

## Files to touch (bullet list of concrete new + modified paths)
- **New** `components/companion/Spark.tsx` — the client component (idle/drift/react state machine, event subscriptions, reduced-motion + visibility guards).
- **New** `components/companion/spark.css` (or a `.hn-spark*` block inside `app/(app)/living.css`) — keyframes (breathe, drift, flare), comet-trail/halo, RTL mirror, `@media (prefers-reduced-motion: reduce)` kill-switch.
- **New** `lib/companion/prefs.ts` — read/write the hide preference (cookie or localStorage), mirroring existing dismiss patterns.
- **Modify** `components/DeferredOverlays.tsx` — add a `next/dynamic(ssr:false)` Spark entry (keeps JS off the critical path; non-chrome overlays live here).
- **Modify** (only if not deferred) `app/(app)/layout.tsx` — add `<Spark />` as a sibling overlay; otherwise no layout change.
- **Optional** `lib/brain/meta.ts` consumer (read-only) for the IQ-mood stretch goal — no Brain mutation (respects the read-mostly boundary).

## Risks (technical + product, ranked)
1. **Over-doing it / Clippy effect (product, highest).** The doc itself warns "easy to over-do — keep it subtle or cut it." Mitigate: rare reactions, opt-in default, hard dismiss.
2. **Distraction precedent.** Phantom presence (a roaming demo cursor) was already disabled in `lib/realtime.ts:182–187` for being "distracting in real use." A roaming light-being risks the same fate — keep motion minimal and event-driven, not constant.
3. **Performance.** Must be transform/opacity-only and pause on hidden tab (`document.hidden`/`visibilitychange`); a rAF loop left running is a battery/CPU regression.
4. **Accessibility/RTL.** Reduced-motion must be total (not just slower); pointer-events must never block clicks or steal focus (lives above chrome, below modals). RTL drift must mirror.
5. **Theme drift.** Must consume existing CSS-var tokens so it stays coherent across the 7+ presets, not hard-coded emerald-gold.

## Recommended slice size (break into 2-4 landable PRs, each behaviour-preserving where possible)
- **PR1 — Inert Spark (idle only).** `Spark.tsx` + `spark.css` + wire into `DeferredOverlays`. Idle bob, reduced-motion off-switch, pointer-events:none, dismiss + persisted pref, off-by-default. No event reactions yet. Fully behaviour-preserving (additive overlay).
- **PR2 — Drift + visibility/perf guards.** Gentle occasional drift path, `visibilitychange` pause, RTL mirror, theme-var styling.
- **PR3 — Event reactions.** Subscribe to `h-nerve-toast` (pulse) and `h-nerve:converse:open` (dart to Brain FAB); flare on plan/achievement completion (reuse Confetti-style CSS). 3–4 reactions only.
- **PR4 (optional stretch) — Mood = Brain IQ.** Read `ragQuality`/IQ from `lib/brain/meta.ts` (read-only) to modulate glow intensity. Cut if v1 feels complete.
