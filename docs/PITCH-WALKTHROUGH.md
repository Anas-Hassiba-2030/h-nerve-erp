# H-Nerve ERP — Pitch Rehearsal Walkthrough

> **Status update 2026-05-21** — all 3 BLOCKERs from the original
> 2026-05-15 walkthrough are closed in the current build. See
> the "Status of original findings" section after the TL;DR table.
>
> **Status update 2026-07** — the `lib/brain/Brain.ts` stub described under
> Blocker 3 was **retired in PR #240 (merged 2026-06-11)**. The brain is now a
> wired tool-loop: `src/lib/brain/tools/` (7 typed tools) +
> `src/lib/brain/orchestrator.ts` (LIVE mode) + a stdio MCP server; STUB mode
> remains the zero-key default. The docintel parser is no longer a stub — it
> has a real Claude Vision path (`src/lib/docintel/parser.ts`). See
> `src/lib/brain/README.md`.
>
> Full-app dry run as an investor/leadership demo would see it.
> **Run date:** 2026-05-15 · **Build:** Next.js 14.2.18, branch `main`, commit `f229049`
> **Method:** gstack headless Chromium, logged in as `admin@hourani.jo`, every major screen visited at 1280px (mobile `/m` captured at 390×844 phone viewport).
> **Screenshots:** [`./pitch-screenshots/`](./pitch-screenshots/) (one PNG per screen, numbered to match the table).

This file is **read-only evidence**. It changes no app code. It is the only file added by this pass besides the screenshot PNGs.

---

## How to read this

Each finding is tagged:

- 🔴 **BLOCKER** — an investor will see this and it undercuts the pitch. Fix before demoing.
- 🟡 **COSMETIC** — looks slightly unfinished; fix if time allows, won't sink the room.
- ⚪ **EMPTY BY DESIGN** — correct behaviour, but seed data leaves it bare; pre-load or demo it live.
- ✅ **CLEARED** — looked suspicious, verified fine.

Every screen returned **HTTP 200** with a real Arabic `<h1>` and **no per-page console errors** (one transient dev-only RSC prefetch warning for `/showcase`, harmless). Nothing is *broken* in the crash sense. The issues below are about polish and pitch-credibility.

---

## Status of original findings (2026-05-21 sweep)

| # | Original finding | Status | Closed by |
|---|---|---|---|
| 1 | Double welcome-modal wall | ✅ Closed — both modals honour `NEXT_PUBLIC_DISABLE_INTRO=1`; env var is set on Vercel production | early polish (env-var gate already in `components/OnboardingTour.tsx` line 82 + `components/WelcomeSplash.tsx` line 102) |
| 2 | Arena Space JOD 0 / Speed 0 cascade | ✅ Closed — V3 demo seed replaced ARENA with HOTELS (504,900 JOD/30d revenue); seed-demo-extras adds 36 Transactions across all 4 companies | `4b60360`, `6398118` |
| 3 | "Powered by CLAUDE" claim while stub | ✅ Closed — `/brain/council` reads "Engine: stub mode (no API key)" | prior polish (`app/(app)/brain/council/page.tsx:136`) |
| 4 | "Anas AI / Hasiba G" personal branding | ✅ Closed — strings not found anywhere in `components/` or `app/` today | prior cleanup |
| 5 | English seeded content in Arabic-first UI | ⚠ Long-tail — many surfaces fixed via i18n ternaries; some seeded titles still English-only. Acceptable for the pitch demo. |  |

## TL;DR — the five things to fix before you pitch

| # | Severity | Finding | Where it shows |
|---|----------|---------|----------------|
| 1 | 🔴 | **Two stacked welcome modals dim every screen on a fresh machine.** Tour (5 steps) → Welcome splash (4 slides) = 9 click-throughs, gated on `localStorage` only (per-device, not per-account). On the pitch laptop they *will* fire. | Every authenticated page |
| 2 | 🔴 | **Seed data shows Arena Space Hospitality at "−100% revenue / JOD 0".** This zero propagates to the dashboard KPI, finance, insights, mobile, and Brain-IQ "Speed 0/100". Reads as a business in freefall. | Dashboard, Finance, Insights, `/m`, Brain IQ |
| 3 | 🔴 | **Council says "مُفعّل بـ CLAUDE" but `ANTHROPIC_API_KEY` is unset → it runs deterministic stub templates.** The headline AI feature claims live Claude while it is templated. | `/brain/council`, all narrated brain output |
| 4 | 🟡 | **Developer-personal branding in product chrome:** "أنس للذكاء الاصطناعي / Anas AI" + "حسيبة جي / Hasiba G" in the global footer and welcome splash slide 2. Reads as personal, not a Hourani product. | Global footer, Welcome splash |
| 5 | 🟡 | **AI/seeded content is English in an Arabic-first UI.** Insight titles, council session names ("Revenue drop at…", "Should we ramp Maha cheese…"). | Insights, `/m`, `/brain/council` |

---

## Screen-by-screen checklist

| # | Screen | Path | Screenshot | Verdict |
|---|--------|------|-----------|---------|
| 01 | Login | `/login` | [01-login.png](./pitch-screenshots/01-login.png) | ✅ Clean, professional |
| 02 | Executive Dashboard | `/dashboard` | [02-dashboard.png](./pitch-screenshots/02-dashboard.png) | 🟡 Dense but good; one `JOD 0` KPI |
| 03 | Companies | `/companies` | [03-companies.png](./pitch-screenshots/03-companies.png) | ✅ Strong, populated |
| 04 | Hotels (vertical) | `/hotels` | [04-hotels.png](./pitch-screenshots/04-hotels.png) | ✅ Rich; gold hero, ratings, bookings table |
| 05 | Dairy (vertical) | `/dairy` | [05-dairy.png](./pitch-screenshots/05-dairy.png) | ✅ Rich; blue hero, gauge, batch table |
| 06 | Farms (vertical) | `/farms` | [06-farms.png](./pitch-screenshots/06-farms.png) | ✅ Rich; emerald hero, crop cards, weather |
| 07 | Education (vertical) | `/education` | [07-education.png](./pitch-screenshots/07-education.png) | ✅ Good; purple hero, program cards |
| 08 | Finance | `/finance` | [08-finance.png](./pitch-screenshots/08-finance.png) | 🟡 Long real ledger; recurring `JOD 0` KPI |
| 09 | The Council | `/brain/council` | [09-brain-council.png](./pitch-screenshots/09-brain-council.png) | 🔴 "powered by CLAUDE" label vs stub mode |
| 10 | Causal Graph | `/brain/graph` | [10-brain-graph.png](./pitch-screenshots/10-brain-graph.png) | 🟡 Renders, but visually dense/unlabelled |
| 11 | Brain IQ | `/brain/iq` | [11-brain-iq.png](./pitch-screenshots/11-brain-iq.png) | 🟡 Polished; **Speed = 0/100** sub-score |
| 12 | Memory Lake | `/brain/memory` | [12-brain-memory.png](./pitch-screenshots/12-brain-memory.png) | ✅ Full, editorial, looks intentional |
| 13 | What-if Simulator | `/brain/scenarios` | [13-brain-scenarios.png](./pitch-screenshots/13-brain-scenarios.png) | ✅ Works; real propagation. Toast overlaps |
| 14 | Supply Chain | `/supply-chain` | [14-supply-chain.png](./pitch-screenshots/14-supply-chain.png) | ✅ Strong; booking→production bridge |
| 15 | Insights | `/insights` | [15-insights.png](./pitch-screenshots/15-insights.png) | 🟡 Very full; English content in AR UI |
| 16 | Admin · Tenants | `/admin/tenants` | [16-admin-tenants.png](./pitch-screenshots/16-admin-tenants.png) | 🟡 Polished; 6/7 tenants show `PACKS 0` |
| 17 | Admin · Empire | `/admin/empire` | [17-admin-empire.png](./pitch-screenshots/17-admin-empire.png) | 🟡 Strong; one empty grid cell (layout) |
| 18 | Admin · System | `/admin/system` | [18-admin-system.png](./pitch-screenshots/18-admin-system.png) | 🟡 Thin — 4 stat cards on empty canvas |
| 19 | Showcase / Tour | `/showcase` | [19-showcase.png](./pitch-screenshots/19-showcase.png) | ✅ Editorial 20-phase index; "تجريبي" benign |
| 20 | Mobile "Today" | `/m` | [20-mobile.png](./pitch-screenshots/20-mobile.png) | 🟡 Clean at phone size; English insight text in AR UI |
| 21 | Documents | `/documents` | [21-documents.png](./pitch-screenshots/21-documents.png) | ⚪ Empty by design; parser is a known stub |
| 22 | Decision Theater (Phase 9) | `/theater/council/[id]` | [22-theater-council.png](./pitch-screenshots/22-theater-council.png) | ✅ Cinematic; works. English topic title |

---

## Detailed findings

### 🔴 BLOCKER 1 — The double welcome-modal wall

There are **two independent full-screen blocking overlays**, and the pitch laptop will hit both unless its browser `localStorage` already has the flags:

1. `components/OnboardingTour.tsx` — 5-step tour, gated on `localStorage["h_nerve_onboarded_v1"]`.
2. `components/WelcomeSplash.tsx` — 4-slide "Welcome to the upgraded H-Nerve", gated on `localStorage["h_nerve_welcome_v1.4_seen"]`. It only shows *after* the tour flag is set — so **dismissing the tour immediately triggers the splash**. Net: 9 dismissals.

Why this is a real pitch risk, not a tester artifact:
- Persistence is **`localStorage` only — per-device, per-browser, not tied to the user account.** A fresh laptop, a cleared cache, incognito, or a different machine = both modals fire again.
- `OnboardingTour.close()` swallows storage failures with a silent `catch {}` (line 87-89). If storage is partitioned/blocked, it re-shows on *every* navigation forever. During this walkthrough it did exactly that — re-appeared on every page until both `localStorage` keys were set manually.
- Every screenshot in the first three passes was dimmed by these modals. They sit at `z-[115]` / `z-[100]` with an 8px backdrop blur over the whole app.

**Pre-pitch fix options (no code change needed for the demo itself):** on the actual pitch machine, before the demo, load the app once and click through both, OR run in the JS console: `localStorage.setItem('h_nerve_onboarded_v1','1'); localStorage.setItem('h_nerve_welcome_v1.4_seen','1')`. **Durable fix (post-pitch):** persist "seen" server-side on the user record instead of `localStorage`.

### 🔴 BLOCKER 2 — Arena Space Hospitality reads as "−100% revenue / JOD 0"

The seed data gives Arena Space Hospitality **zero revenue in the recent 14-day window** (`JOD 0` vs `JOD 127,335` prior). Consequences visible to an investor:
- Dashboard: a KPI card literally shows **`JOD 0`** (02-dashboard).
- Finance: same `JOD 0` in the unified-ledger hero (08-finance).
- Insights & Mobile: a red alert **"Revenue drop at Arena Space Hospitality by 100%"** (15-insights, 20-mobile).
- Brain IQ: **"Speed 0/100"** sub-score (11-brain-iq) — a zero on the flagship intelligence screen.

Individually each is "just seed data," but together they paint the flagship hospitality unit as collapsed. **Fix:** reseed Arena Space with non-zero recent revenue so the demo narrative is "healthy group, AI catching subtle signals" rather than "everything is down 100%." (Seeding is owned by another terminal — flagging, not touching.)

### 🔴 BLOCKER 3 — "Powered by CLAUDE" while running stub templates

- `/brain/council` shows **"حالة المعركة: مُفعّل بـ CLAUDE"** ("powered by CLAUDE").
- `ANTHROPIC_API_KEY` is **declared in `.env` but empty** — verified unset in the running dev server (`set: false, len: 0`).
- `lib/brain/narrator.claude.ts:6`: *"Stub mode (no ANTHROPIC_API_KEY) returns a topic-aware editorial template."* `lib/brain/llm.ts:35` reads the key and falls back to templates when absent.
- `lib/brain/Brain.ts` itself: `makeBrain()` returns all-stub proxies and `Brain.ask()` throws `"not yet wired"`. The brain *pages* work because they call the `*.live.ts` subsystems directly (council.live, simulator.bfs, memory.live) — those produce **real deterministic output**, not LLM output. _(2026-07: no longer true — `Brain.ts` was retired in PR #240; the brain is now tool-fronted via `src/lib/brain/tools/` + the `orchestrator.ts` tool-loop + a stdio MCP server. STUB mode is still the zero-key default.)_

So the brain is genuinely functional as a deterministic engine, but the **"powered by CLAUDE" label is not true in this build**. If a technical evaluator asks "is this live AI?", the honest answer is "deterministic engine now, Claude-ready when the key is set." Either set a key for the demo, or change the label to something honest ("Council engine: ready") so the claim survives scrutiny. Matches the known readiness posture (prototype, AI stub-mode by default).

### 🟡 COSMETIC

- **Developer-personal branding in chrome.** Global footer chips and Welcome-splash slide 2 carry "أنس للذكاء الاصطناعي / Anas AI" and "حسيبة جي / Hasiba G". For a Hourani-leadership pitch this reads personal/unfinished. Consider neutral phrasing ("بتعاون استراتيجي" alone) for the demo build.
- **English content inside the Arabic-first UI.** AI-generated/seeded strings are English: insight titles, council session names, mobile "today" cards ("Revenue drop at…", "dairy batches near expiry"). The chrome is fully Arabic, so the mix is jarring. Arabic-first is a stated product principle; the generated layer doesn't honour it yet.
- **Brain IQ "Speed 0/100"** (11-brain-iq) and the recurring **`JOD 0`** KPI (02, 08) — both downstream of Blocker 2's seed gap; listed separately because even after reseeding revenue, confirm the Speed metric has a non-zero source.
- **`/admin/system` is thin** (18) — four stat numbers (Memories 8, IQ Snapshots 8, Patterns 7, Tenants 7) on a large empty dark canvas. Looks unfinished for a "System overview" console. (Admin is owned by another terminal — flagging only.)
- **`/admin/empire` empty grid cell** (17) — 8 real tiles confirmed in the DOM, but a 3-column grid leaves one visibly blank cell that reads as a broken tile. A 4-col or 2×4 layout would close the gap. Cosmetic, not data loss.
- **`/admin/tenants`**: 6 of 7 tenants show `PACKS 0` (16) — looks like incomplete provisioning in a demo of multi-tenancy.
- **Causal graph** (10) is a dense dot-cloud on dark canvas with no visible labels at default zoom — hard to narrate in a pitch without interaction.
- **Realtime presence toasts** ("أحمد القاسم: اعتمد الخطة…") auto-pop and overlap content on `/brain/council` and `/brain/scenarios`. Simulated collaboration is a nice touch, but during a live demo they cover the UI mid-sentence.

### ⚪ EMPTY BY DESIGN

- **`/documents`** (21) — all counters `0`, clean empty state ("لا مستندات بعد. أفلِت أوّل ملف…"). The parser is a known stub (target: Claude Vision). _(2026-07: shipped — `parseWithVision` in `src/lib/docintel/parser.ts`, with stub fallback.)_ For the pitch, either pre-seed one sample document or demo a live drag-and-drop so the module isn't all zeros.

### ✅ CLEARED

- **`/showcase` "تجريبي"** — flagged by the stub-text scan; in context it is poetic copy: *"حركة الرمز تتعقّب التشغيل التجريبي عبر الأسلاك."* Not a stub/demo-mode banner. Page is a polished editorial index of all 20 phases.
- **All HTTP/console/network** — every screen 200, no real console errors, no failed network requests (fonts load from Google Fonts fine). The only console error all session was one transient dev-mode `Failed to fetch RSC payload for /showcase` (Next.js prefetch race during recompile) — does not occur in production builds.
- **Per-vertical hero colours** (gold hotels / blue dairy / emerald farms / purple education / purple supply-chain) — consistent within each surface, reads as intentional vertical theming, not a Heritage-Modern violation.

---

## Strengths worth leaning into during the pitch

- Companies, the four verticals, Finance, Supply Chain, Memory Lake and the What-if Simulator are **genuinely rich and populated** — real tables, charts, propagation maths, editorial prose. This does not look like a thin prototype.
- The What-if simulator (`/brain/scenarios`) actually computes ripple effects across entities with staff/exposure numbers — strong live-demo moment.
- **The Decision Theater (`/theater/council/[id]`, Phase 9) is the most cinematic moment in the app** — a fullscreen 5-slide editorial magazine spread with large Arabic display type, a KPI strip, and ESC to return. No app chrome, no modals. Open it from a `/brain/council` past session and let it carry the close of the pitch. (Only caveat: the topic title renders in English — same i18n gap as Cosmetic above.)
- Heritage Modern operator UI vs Sleek Operator admin vs editorial brain surfaces are visually distinct and well-executed — the "one vocabulary per surface" discipline holds.

---

## Environment notes (for reproducing this run)

- The machine's **C: drive was 100% full (0 bytes)** at start — blocked the tooling build and would have broken `next dev`. Reclaimed ~15 GB (npm cache + %TEMP% + Recycle Bin, all user-approved) before proceeding. Worth knowing: a full disk on the pitch machine = no demo.
- gstack browse needed a one-time build; `bun` was installed via npm (`npm i -g bun`, v1.3.14) since the machine had none.
- DB (`prisma/dev.db`) was already seeded; not touched. No edits to `.env`, `app/(admin)/**`, `prisma/**`, or `.claude/**` — per instruction, this pass is read-only except this doc and the screenshot PNGs.

## Suggested order of fixes (cheapest first)

1. Pre-set the two `localStorage` flags on the pitch laptop (2 minutes, zero code).
2. Reseed Arena Space Hospitality recent revenue ≠ 0 (owned by other terminal — request it).
3. Decide the Council label: set `ANTHROPIC_API_KEY` for a live demo, or relabel to drop the "CLAUDE" claim.
4. Swap "Anas AI / Hasiba G" footer/splash branding for neutral text in the demo build.
5. Post-pitch: persist onboarding "seen" server-side; localize the generated insight/council text to Arabic.
