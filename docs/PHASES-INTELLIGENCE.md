# H-Nerve — The 20-Phase Intelligence Plan

> Build the best brain in the world, then wrap it in the best ERP in the world.

H-Nerve is a generic ERP intelligence platform. This document is the master plan for everything that comes after the Heritage Modern UI pivot. Each phase is substantively new capability — not polish. Each phase has a wow moment, a defined aesthetic vocabulary from `docs/DESIGN-SKILL.md`, and a signature animation.

**The brain entry point:** `lib/brain/tools/` + `lib/brain/orchestrator.ts` — the tool registry + LLM tool-loop (the old `Brain.ts` was retired in PR #240; subsystems under `lib/brain/`)
**The design spec:** `docs/DESIGN-SKILL.md`
**The architecture:** `lib/brain/README.md`

---

## How to read this document

Each phase has the same structure:

| Field | Meaning |
|---|---|
| **Pitch** | One-line elevator. |
| **Wow moment** | The single thing that makes someone watching go "what." |
| **Files** | Where the code lives. |
| **Aesthetic** | Which vocabulary from DESIGN-SKILL.md. |
| **Signature animation** | The motion you remember. |
| **Effort** | Rough working days. |
| **Depends on** | Earlier phases. |
| **Demo script** | How to show it in 60 seconds. |

The phases are organized in four waves:

- **Wave A — The Brain (Phases 1-10):** the intelligence layer.
- **Wave B — The Platform (Phases 11-15):** white-label, marketplace, integrations, mobile, voice.
- **Wave C — The Theater (Phases 16-19):** decision theater, time machine, collaboration, document intelligence.
- **Wave D — The Empire (Phase 20):** the self-improving meta brain — *the final phase.*

---

# WAVE A — THE BRAIN

The intelligence substrate. Every later phase depends on this stack being real.

## Phase 1 — The Causal Graph

**Pitch.** Every business entity becomes a node. Every relationship becomes a weighted causal edge. The brain reasons over this graph.

**Wow moment.** A live force-directed graph view of the entire business: hover any node, the system highlights every entity it causally influences. Click "Arena Hotel" — Maha cheese demand pulses, Loran feedstock pulses, Finance margin pulses, all visibly downstream.

**Files.**
- `lib/brain/graph.ts` — interface (already stubbed)
- `lib/brain/graph.prisma.ts` — Prisma-backed implementation
- `prisma/schema.prisma` — `BrainNode`, `BrainEdge` tables
- `app/(app)/brain/graph/page.tsx` — the live graph view
- `components/brain/GraphCanvas.tsx` — D3-force or react-force-graph

**Aesthetic.** Industrial Precision (DESIGN-SKILL §1.B) — this is technical, dense, terminal-flavored. Off-black background, Heritage ochre for highlighted edges, hairline labels. Inside the brain UI, Industrial reads as "this is the engine room" and contrasts beautifully with the Heritage Modern dashboards.

**Signature animation.** When you click a node, downstream nodes pulse outward in a shockwave (radius animates 0→max with `--ease-out-expo`, opacity 1→0.6, total 600ms). Edges light up in sequence along their causal path with a 40ms-per-hop draw-in. No bounce. No spin.

**Effort.** 4-5 days.
**Depends on.** Nothing. This is the foundation.

**Demo script.** "This is your business as a graph. Watch what happens when I touch Arena occupancy. Every entity that depends on Arena occupancy lights up automatically — the system already knew the chain."

---

## Phase 2 — The What-If Simulator

**Pitch.** Drag any KPI to a hypothetical value. Every downstream metric morphs in real-time, propagated through the causal graph.

**Wow moment.** A scrubbable slider above any KPI. Drag Arena occupancy from 78% down to 30% — watch Maha 30d output animate from 49,822L to 31,400L, watch Loran feed orders shrink, watch Finance projected revenue drop, watch Sustainability score tick up (less waste). All at 60fps as you drag.

**Files.**
- `lib/brain/simulator.ts` — interface (stubbed)
- `lib/brain/simulator.bfs.ts` — weighted-BFS implementation
- `components/brain/Scenario.tsx` — the scrub UI
- `app/(app)/brain/scenarios/page.tsx` — saved scenarios

**Aesthetic.** Industrial Precision for the controls, Heritage Modern for the impact display. The slider is mono-typed and hairlined; the impact rows are cream cards with display-serif numerals that morph.

**Signature animation.** **Number tickers.** Every animated KPI uses an interpolated counter that respects tabular-nums and counts up/down with `--ease-out-quart` over 350ms when the simulator emits a new value. Background of changed KPIs flashes ochre at 8% opacity for 220ms, then fades. Charts redraw with a single morph (no bar-by-bar restagger — that would be twee).

**Effort.** 3-4 days.
**Depends on.** Phase 1.

**Demo script.** "What if Arena drops to 30% next month? Don't speculate — watch."

---

## Phase 3 — The Council

**Pitch.** A panel of domain expert agents debates every decision, like a board meeting. The user reads the full debate and the synthesized recommendation.

**Wow moment.** Click "Convene the council" on any insight. A modal opens. Five voices appear in sequence — DairyExpert, FinanceBrain, SupplyChain, HospitalityExpert, RiskOfficer. Each delivers a position with evidence. A moderator agent synthesizes into a single recommendation with confidence and dissent. The transcript is editorial — not "data went up" but "I've seen this curve three times in the last 18 months. Each time we ramped, we crushed margins. Cautious yes, cautious."

**Files.**
- `lib/brain/council.ts` — interface (stubbed)
- `lib/brain/agents/*.ts` — DairyExpert, FinanceBrain, etc.
- `components/brain/CouncilTranscript.tsx`
- `app/(app)/brain/council/[topicId]/page.tsx`

**Aesthetic.** Heritage Modern with editorial leanings — Fraunces serif for agent names, IBM Plex/Inter Tight for body. Each agent gets a unique inline-start rail color from the Heritage palette (DairyExpert = copper, FinanceBrain = ink, RiskOfficer = terracotta).

**Signature animation.** Voices appear like a chat — each speech bubble fades up with `translate-y(8px)` and a typewriter-revealed first sentence. Subsequent agents wait 400ms after the previous finishes. Synthesis appears last, in a cream-2 plinth with a 2px ochre rail and the confidence number ticking up from 0 to its true value over 500ms.

**Effort.** 5-6 days (Anthropic API integration, prompt engineering, transcript schema).
**Depends on.** Phase 1 (subgraph context for agents).

**Demo script.** "Should we ramp Maha production for July? I'm not deciding alone — I'm convening the council. Watch them disagree."

---

## Phase 4 — The Narrator

**Pitch.** Every screen, every chart, every alert auto-generates an editorial paragraph that reads like The Economist, not like a dashboard.

**Wow moment.** Hover any KPI for 1.2 seconds. The tooltip morphs from a single sentence ("revenue down 8%") into a full editorial paragraph: *"April revenue softened on the back of a quieter conference month at Arena. Last year's anchor event moved to October, leaving Arena 22 nights short of its baseline. Maha cheese, which historically lags Arena bookings by 3 weeks, will feel this in mid-May. Procurement has been notified."* Three sentences, every claim cited, all in Heritage Fraunces serif.

**Files.**
- `lib/brain/narrator.ts` — interface (stubbed)
- `lib/brain/narrator.claude.ts` — Claude API implementation
- `components/brain/Tooltip.tsx` — the editorial tooltip
- `lib/brain/cache/narrator.ts` — per-(orgId, dataDigest, register) cache

**Aesthetic.** Heritage Modern editorial. The tooltip itself is a cream plinth with a single ochre rail at top, no shadow, hairline border, 18px line-height 1.55, 65ch maximum measure.

**Signature animation.** Two-stage tooltip. **Stage 1** (300ms after hover): one-line summary fades in. **Stage 2** (1.2s after hover, if still hovered): the box GROWS by easing height/width with `--ease-out-expo` over 280ms, a hairline divider draws across, and the editorial paragraph types in via opacity-and-clip-path reveal (no character-by-character — that's a trope). The transition feels like a card unfolding.

**Effort.** 4-5 days.
**Depends on.** Phase 1, Phase 3 (uses agents to write).

**Demo script.** "Hover any number on this dashboard. Wait one second. Read."

---

## Phase 5 — The Planner ✅ (shipped)

**Status (2026-06):** delivered. `lib/brain/planner.live.ts` generates ordered action plans from insights or council sessions (Claude + rich stub fallback for dairy/farm/hotel/finance domains). `app/(app)/plans/` shows plans with a Gantt step view; `app/(app)/plans/[id]/` is the detail page with commit/abandon/step actions. "Generate plan" buttons exist on both the Insights page and the Council session transcript. Phase 7 feedback events (PLAN_COMMITTED, PLAN_ABANDONED, PLAN_STEP_DONE) are recorded on every user action.

**Pitch.** Insights become Plans. A Plan is an ordered set of actions with owners, deadlines, projected impact, and a rollback condition. Plans are first-class entities the system tracks to outcome.

**Wow moment.** Click "Generate Plan" on a critical insight. A 5-step Gantt-style sequence renders below it. Each step is assignable (drag a colleague's avatar onto a step). The projected impact shows: "+12% margin recovery, ±4% confidence, by May 17." Click Commit. The Plan goes live; the system starts watching the metrics.

**Files.**
- `lib/brain/planner.ts` — interface (stubbed)
- `prisma/schema.prisma` — `Plan`, `PlanStep`, `PlanOutcome`
- `app/(app)/plans/page.tsx`, `app/(app)/plans/[id]/page.tsx`
- `components/plans/PlanGantt.tsx`, `components/plans/PlanCommit.tsx`

**Aesthetic.** Heritage Modern. Hairline tiles for steps, mono uppercase for status (PENDING/DONE/BLOCKED), ochre primary CTA for "Commit", terracotta inline-start rail when behind schedule.

**Signature animation.** When the plan generates, steps draw themselves left-to-right with a 70ms stagger — each step's hairline border draws first (320ms), then the content fades in. When you assign a user to a step, the avatar slides into the step's owner slot from the assignee picker with `--ease-out-quart` and the step's status pill flashes ochre once.

**Effort.** 5-6 days.
**Depends on.** Phase 2 (projected impact via simulator), Phase 3 (council can author plans).

**Demo script.** "Insight without a plan is just complaining. Watch — insight in, plan out, owner assigned, committed, watched."

---

## Phase 6 — The Memory Lake

**Pitch.** The brain remembers every meaningful past event with an embedding. New situations search the memory for analogies and present the lesson learned.

**Wow moment.** A current alert sits in your feed: "Daily revenue spike +855%". Below it, a card opens automatically: *"I remember when. Apr 2024, +720% revenue spike, Arena hosted EuroSkills Conference. Maha ran out of feta on day 4. Lesson: pre-stage 1.4× normal F&B inventory when Arena books a conference > 1,500 attendees."* The user clicks "Apply lesson" — the planner pre-loads the inventory action.

**Files.**
- `lib/brain/memory.ts` — interface (stubbed)
- `lib/brain/memory.pgvector.ts` — Postgres+pgvector OR sqlite-vec implementation
- `prisma/schema.prisma` — `Memory` table
- `components/brain/MemoryCard.tsx`
- `app/(app)/brain/memory/page.tsx`

**Aesthetic.** Heritage Modern editorial. Memory cards are tall portrait tiles with an ink top section (the headline + date), cream body (the lesson), and a bottom rail in the color of the module (copper for dairy, ochre for hospitality, etc.).

**Signature animation.** When a memory is recalled, the card slides up from below the alert with a 380ms `--ease-out-expo` and a 1.5px ochre rail draws along its top edge as an opening flourish. If multiple memories match, they fan out in a horizontal carousel; arrow keys scrub.

**Effort.** 5-7 days (embeddings + vector search infra).
**Depends on.** Phase 1 (memories link to graph nodes), Phase 4 (memories are written by the narrator).

**Demo script.** "Let me show you something almost no ERP does. The system has a memory. Watch what happens when this alert fires."

---

## Phase 7 — The Feedback Loop ✅ (shipped)

**Status (2026-06):** delivered. `lib/brain/feedback.live.ts` records every user action as a `BrainFeedback` event (PLAN_COMMITTED, INSIGHT_DISMISSED, OUTCOME_RIGHT, etc.). `learnNow()` aggregates the log into human-readable `BrainPattern` rows via Claude. `app/(app)/brain/learning/` shows the patterns with enable/disable/forget/delete controls, a learning curve chart, and (new) a raw feedback event log. Structured logging (`lib/logger.ts`) now wired into llm.ts, council.live.ts, and feedback.live.ts so all brain events appear in Railway's log aggregator.

**Pitch.** Every dismiss, override, and abandonment becomes training signal. The brain learns the org's actual decision style.

**Wow moment.** A "Brain settings" page that shows: *"I've learned 47 patterns about how you make decisions in the last 30 days."* Examples in plain language: *"You dismiss margin alerts under 5% delta — I'll only flag them above 5% from now on."* *"Your team accepts dairy ramps from FinanceBrain 81% of the time but from DairyExpert only 34% — I've reweighted the synthesis to lean financial."* Each pattern has a toggle: keep the learning, or unlearn it.

**Files.**
- `lib/brain/feedback.ts` — interface (stubbed)
- `prisma/schema.prisma` — `BrainFeedback`, `BrainPattern`
- `app/(app)/brain/learning/page.tsx`
- `components/brain/PatternList.tsx`

**Aesthetic.** Quiet Authority (DESIGN-SKILL §1.C) — restrained, institutional, almost legal. The user is reviewing what the system has learned about them; the tone should feel weighty.

**Signature animation.** Each learned pattern reveals with a typewriter-style text reveal (CSS clip-path, not character-by-character DOM nodes) over 600ms. Toggle switches are the only colored element on the page — ochre when on, hairline when off.

**Effort.** 3-4 days.
**Depends on.** Phase 3 (we need overridable recommendations to override).

**Demo script.** "The brain isn't a black box. Here are the patterns it's learned about you. Toggle any of them off."

---

## Phase 8 — The Cross-Org Federation

**Pitch.** Multi-tenant federated learning. Anonymized patterns flow between orgs that opt in, raising every brain's intelligence floor.

**Wow moment.** A new card on the dashboard: *"Hotels in your tier (300-700 rooms, MENA, mid-luxury) typically see 23% higher F&B revenue when bundled with local dairy."* That number came from 14 anonymized peer organizations — yours included, going the other direction.

**Files.**
- `lib/brain/federation.ts`
- `lib/brain/anonymize.ts` — k-anonymity guarantees, differential privacy budget
- `app/(app)/brain/benchmarks/page.tsx`
- `prisma/schema.prisma` — `FederationOptIn`, `FederationPattern`

**Aesthetic.** Quiet Authority — federation is a contract, the UI is a contract. Single accent: copper.

**Signature animation.** When a peer benchmark loads, a soft horizontal scan (a 1px ochre line that crosses the card left-to-right over 700ms) marks the data as "freshly fetched from the federation." This is a trust gesture, not decoration.

**Effort.** 6-8 days (privacy infra is real work).
**Depends on.** Phase 7 (pattern format).

**Demo script.** "This is the SaaS moat. Every org that joins makes every other org's brain smarter. Watch what your peers know."

---

## Phase 9 — The Decision Theater

**Pitch.** A fullscreen narrative interface where the brain walks the user through a decision: situation, council, simulation, memories, recommendation, plan. Like a CEO briefing room.

**Wow moment.** Click "Open in Theater" on any major insight. The page takeover. Sidebar collapses. Background dims to ink. A 5-act structure plays:
1. **Situation** — the editorial paragraph from Phase 4, displayed in 60px Fraunces.
2. **History** — three memory cards from Phase 6 fan in.
3. **Simulation** — a single chart with the projected delta morphing live.
4. **Council** — five agent voices appear in sequence with their pull-quotes.
5. **Recommendation** — a single Plan from Phase 5, ready to commit.
The user advances with arrow keys or scroll. The whole thing feels like reading a long-form magazine spread.

**Files.**
- `app/(app)/theater/[topicId]/page.tsx`
- `components/theater/Act.tsx`, `components/theater/Pullquote.tsx`
- `lib/theater/director.ts` — composes acts from brain answer

**Aesthetic.** Refined Editorial (DESIGN-SKILL §1.A) all the way. This is the moment the design skill earns its keep. Generous gutters, drop caps, hairline rules, justified blocks for narration. Single accent: ochre.

**Signature animation.** Scroll-driven scene reveals with `--ease-out-expo`. Pull-quotes fade in with a 600ms delay after their context. The transition between acts uses a soft cross-fade with a 120ms ink-line that draws under the new act's heading. The cursor disappears during inactivity. The escape key returns to the dashboard with a smooth 480ms fade-back.

**Effort.** 5-6 days.
**Depends on.** Phases 3, 4, 5, 6.

**Demo script.** "When the decision is big enough to need the whole story, you go to the theater."

---

## Phase 10 — The Self-Improving Meta Brain (THE FINAL PHASE)

**Pitch.** Once a week, the brain reads its own performance log and proposes adjustments to its own weights. The user reviews and approves. The brain gets measurably smarter over time, and the org watches the IQ score climb.

**Wow moment.** A page titled simply **`Brain IQ — 142`** with a single line chart that's been climbing for 8 weeks. Below it: *"This week I made 89 recommendations. 71 were accepted. Of those, 58 produced the predicted outcome within tolerance. I'm overweighting weather signals on dairy planning by ~14%. I propose to drop weather coefficient on `dairy.production` from 0.28 to 0.21. If approved, my projected IQ next week is 146."* The user reads. Clicks Approve. The brain rewrites its own weights live. A diff log slides in confirming what changed.

**Files.**
- `lib/brain/meta.ts` — interface (stubbed)
- `lib/brain/meta.reflector.ts` — the actual self-reflection logic
- `prisma/schema.prisma` — `SelfTuningReport`, `BrainIQHistory`, `BrainWeight`
- `app/(app)/brain/iq/page.tsx`
- `app/(app)/brain/self-tuning/page.tsx`
- `components/brain/IQTrend.tsx`, `components/brain/DiffLog.tsx`

**Aesthetic.** Refined Editorial for the report itself; Industrial Precision for the diff log; Heritage Modern for the IQ page. The IQ number itself is in 120-180px Fraunces, single column, centered, with a hairline beneath. This is the only screen in H-Nerve that uses a number that big.

**Signature animation.** **The IQ counter ticks up.** When a self-tuning report is approved, the IQ score animates from old → new value over 1.2 seconds with `--ease-out-expo`, and a thin ochre underline draws beneath the number. Below, the diff log entries cascade in with a 40ms stagger; each entry has a strikethrough on the old value and a typed-in new value. Sound is optional and OFF by default — but if enabled, a single soft chime plays when the new IQ exceeds the previous all-time high.

**Effort.** 7-10 days.
**Depends on.** All previous phases — this is the capstone.

**Demo script.** "Show me an ERP that gets smarter every week. Just one. I'll wait. — In the meantime, here's ours. Approve this report and watch the IQ climb live."

---

# WAVE B — THE PLATFORM

The brain is the moat. The platform is what makes it sellable.

## Phase 11 — The White-Label Layer

**Pitch.** Multi-tenant by design. Each org gets its own subdomain, brand kit, themes, industry packs, and admin console. New tenants are onboarded in under 10 minutes.

**Wow moment.** Open `/admin/tenants/new`, fill three fields, click Create. A subdomain spins up, a fresh seeded org appears, the new admin gets an invite email. Visit the subdomain — the H-Nerve logo has been replaced with the tenant's mark, the Heritage palette has been retuned to the tenant's brand, the dashboard already has demo data from the right industry packs.

**Files.**
- `app/admin/` — superadmin console
- `lib/tenancy.ts` — tenant scoping middleware
- `lib/brand/themes.ts` — pluggable theme system
- `prisma/schema.prisma` — `Tenant`, `TenantTheme`, `TenantPack`

**Aesthetic.** Sleek Operator (DESIGN-SKILL §1.F) — superadmin console is consumer-pro, single-accent cyan/teal, frosted glass restraint. Different from operator-facing UI on purpose.

**Signature animation.** Tenant creation has a 5-second progress sequence: subdomain provisioning, schema cloning, demo seeding, theme application, invite dispatch. Each step is a checkbox that ticks when its server action returns. No spinner — a real progressive checklist.

**Effort.** 6-8 days.
**Depends on.** None directly, but easier after the brain is wired.

---

## Phase 12 — The Workflow Studio (visual automation)

**Pitch.** A visual flow editor where users compose triggers → conditions → actions across modules. Replace integrations like Zapier for in-system automation.

**Wow moment.** Drag "When dairy expiry < 3 days" onto the canvas. Drag "Notify procurement on Slack" + "Generate plan from template" + "Open Maha distributor channel" beneath it. Wire them. Save. Toggle on. Now every batch nearing expiry triggers the chain automatically.

**Files.**
- `app/(app)/workflows/studio/page.tsx`
- `components/workflows/Canvas.tsx`
- `lib/workflows/runtime.ts`
- `prisma/schema.prisma` — `Workflow`, `WorkflowRun`

**Aesthetic.** Industrial Precision with a Sleek Operator hand. The canvas is dark, the nodes are bright, the connections are luminous hairlines. Inside the studio only — outside (workflow list view) is Heritage Modern.

**Signature animation.** Connection lines draw between nodes with a 200ms easing as the user wires them. Each node has a subtle pulse when its trigger fires live. The "test run" mode shows the data tokens flowing along the wires (yellow dots traveling at 1.5s per hop).

**Effort.** 8-10 days.

---

## Phase 13 — The Integrations Hub

**Pitch.** First-class connectors for Slack, Teams, Gmail, Outlook, Google Calendar, banking APIs (Open Banking JO, Plaid), IoT sensors (MQTT), Shopify/WooCommerce, QuickBooks, Twilio. Each integration is a card with auth, scopes, and a usage log.

**Wow moment.** A grid of 24 integration cards. Click Slack. OAuth in one tap. Pick the channels. Done — alerts now stream to Slack with the brain's editorial voice.

**Files.**
- `app/(app)/integrations/`
- `lib/integrations/{slack,gmail,plaid,iot}.ts`
- `prisma/schema.prisma` — `Integration`, `IntegrationCredential`

**Aesthetic.** Heritage Modern. The hub is a marketplace — hairline tiles, no gradients, status pills.

**Signature animation.** When an integration connects, its tile flips on a Y-axis (a tasteful 320ms 3D rotate is fine here, used sparingly), revealing the connected status on the back.

**Effort.** 2-3 days per integration.

---

## Phase 14 — Mobile-First Operations View

**Pitch.** A separate mobile UI tuned for managers in the field — hospitality floor managers, dairy QC, farm supervisors. Glanceable. Thumb-zoned. Offline-capable.

**Wow moment.** Manager opens H-Nerve on phone at 7am. Single screen: today's three things to know, three things to decide, three things to approve. Each is one tap. Push notification budget tightly capped at 4/day with the narrator writing the copy.

**Files.**
- `app/m/` route group with mobile-specific layout
- `components/mobile/` primitives
- Service worker for offline cache

**Aesthetic.** Calm Clinical (DESIGN-SKILL §1.E) for mobile — generous whitespace, big touch targets, soft sage/ochre tints, almost no chrome.

**Signature animation.** Pull-to-refresh shows a single hairline drawing across the top in ochre, then a single sentence narration appears: "Synced. 3 new things." Then it disappears. No spinning loader.

**Effort.** 6-7 days.

---

## Phase 15 — The Voice & Conversational Layer

**Pitch.** Press a key. Ask a question. The brain answers in voice + text + an optional drill-through to the underlying data.

**Wow moment.** Press `⌘K` then start typing or talking: "How are we tracking on Q2 dairy targets?" The brain answers in 3 sentences, with citations. Follow-up: "Why is the variance widening?" — it remembers the context. Tab-key drills into the data behind any claim.

**Files.**
- `components/Conversational.tsx` — the overlay
- `lib/brain/converse.ts` — multi-turn context manager
- Web Speech API for voice in/out

**Aesthetic.** Brutalist Confidence (DESIGN-SKILL §1.H) for the conversational overlay — single accent yellow on ink, mono everything, sharp 0px corners. This is intentionally jarring vs. the Heritage rest of the app — it tells the user "you're talking to the engine now, not the dashboard."

**Signature animation.** The overlay slides up from the bottom with a 280ms ease, an ink-on-cream split where the user's input docks at top and the brain's voice writes itself line by line. When the brain reads aloud, a single ochre underline tracks the spoken word in real-time. Stop = ESC.

**Effort.** 5-7 days.

---

# WAVE C — THE THEATER

Polish, presence, and document intelligence — the experience layer.

## Phase 16 — The Time Machine

**Pitch.** Drag a date slider anywhere in the app. The system reconstructs its state on that day — what we knew, what we said, what we decided. Used for audits, post-mortems, and counterfactual learning.

**Wow moment.** A floating "Now" pill in the corner. Drag it to "March 14, 2026". The whole app transforms — graphs morph to that day's values, the dashboard shows that day's narrative, the council transcripts from that day are accessible. A small banner reads: "Viewing as of March 14. The brain's IQ that day was 118 (now: 142)."

**Files.**
- `lib/timemachine.ts`
- `components/TimeScrubber.tsx`
- Memory + Graph already store ts on every node — Phase 1 design pays off here.

**Aesthetic.** Heritage Modern with the date pill in Brutalist Confidence (sharp ink chip, ochre arrow controls). Think: a single old photograph in a museum case.

**Signature animation.** Time scrubbing morphs every chart's data over 200ms with `--ease-out-quart`. The "Now" pill itself has a thin ochre rail that fills as you scrub backward — a visual countdown of how far back you are.

**Effort.** 4-5 days.

---

## Phase 17 — Real-Time Collaboration

**Pitch.** Cursors, presence, comments, and live edits across the system. When two execs are looking at the same insight, they see each other.

**Wow moment.** Open the Decision Theater. A small avatar pip appears top-right — your CFO is also reading. Their cursor is visible. They highlight a passage; you see the highlight. They type a comment; you see them typing. You reply inline.

**Files.**
- `lib/realtime.ts` — Liveblocks or Yjs + WebSocket server
- `components/realtime/Presence.tsx`, `Cursor.tsx`, `Comment.tsx`

**Aesthetic.** Heritage Modern. Cursors are hairline arrows in the user's accent color. Presence pips are 24px monogrammed circles.

**Signature animation.** Cursors interpolate at 60fps with 80ms easing — never teleport. Comments slide in from the side with a 220ms `--ease-out-quart`. Typing indicators are a single hairline ochre underline that draws and erases.

**Effort.** 6-8 days.

---

## Phase 18 — Document Intelligence

**Pitch.** Drop any contract, invoice, lab report, or spreadsheet. The system parses it, extracts the relevant entities, links them to the graph, and writes an editorial summary.

**Wow moment.** Drag a 14-page supplier contract onto the H-Nerve window. 4 seconds. Modal opens with: a one-paragraph summary in the narrator's voice, the parties and dates extracted into a contract record, the auto-detected risk clauses, and a single button: "Add to Loran's supplier ledger."

**Files.**
- `lib/docintel/parser.ts` — Claude Vision + structured extraction
- `app/(app)/documents/` — drop zone + ledger
- `prisma/schema.prisma` — `Document`, `DocExtraction`, `DocClause`

**Aesthetic.** Refined Editorial for the document view itself — it's a document, treat it like one. Heritage Modern for the lists.

**Signature animation.** Upload UI is intentionally still — no progress bar, no spinner. Instead: the file's first page renders, then claims appear one at a time, each underlined with a hairline ochre as it's "captured" — like reading with a yellow highlighter.

**Effort.** 5-7 days.

---

## Phase 19 — The Empire Dashboard (multi-org executive view)

**Pitch.** For users who own multiple H-Nerve-powered businesses — the meta-dashboard. Every brain's IQ, every business's pulse, on a single screen.

**Wow moment.** A row of 8 IQ scores, each with a sparkline, each clickable. Hover any business to see the brain's last week of decisions. This is the screen for someone running an empire.

**Files.**
- `app/empire/page.tsx`
- `lib/empire/aggregator.ts`

**Aesthetic.** Quiet Authority — institutional, restrained. This is the boardroom of boardrooms.

**Signature animation.** Each IQ ticks up live as new self-tuning reports land. The whole grid breathes — 4-second pulse cycles, 1% scale variation, you barely notice.

**Effort.** 3-4 days.

---

# WAVE D — THE EMPIRE

## Phase 20 — The Living Protocol (the long horizon)

**Pitch.** H-Nerve published as an open protocol. Anyone can build agents, packs, integrations, themes. The brain has a public API. The IQ score becomes an industry benchmark.

**Wow moment.** A developer portal at `/dev` where anyone can register an agent in 12 lines of code, a pack in 30, a theme in a JSON. The marketplace shows the top 100 community-built agents with their adoption stats and orbits.

**Files.**
- `app/dev/`
- `lib/protocol/spec.ts`
- Public OpenAPI document

**Aesthetic.** Refined Editorial for the protocol docs (this is a manifesto), Industrial Precision for the API explorer.

**Signature animation.** The protocol homepage opens with a 1-line typed manifesto: *"H-Nerve is an open intelligence layer. The brain belongs to the orgs that build on it."* — typed at 60wpm. No further animation.

**Effort.** Long-horizon, post-Phase-10.

---

# Cross-cutting principles

These hold across every phase. Violations are bugs.

1. **One vocabulary per surface.** Never mix Heritage Modern with Industrial Precision in the same view. The seam belongs at a route boundary, not a card boundary.
2. **Every brain output cites.** No claim without a citation. The XAI trace is always retrievable.
3. **Every animation eases.** `--ease-out-quart`, `--ease-out-expo`, `--ease-in-out-q`, `--ease-spring`. Never bare `ease-out`.
4. **Every long-running thing has reduced-motion.** `@media (prefers-reduced-motion: reduce)`.
5. **Every async UX has a skeleton, not a spinner.** Spinners only for indeterminate < 2s.
6. **Every Arabic surface uses Reem Kufi or Aref Ruqaa for display.** Never Cairo for display. Cairo is body fallback only.
7. **Every number is tabular.** `font-variant-numeric: tabular-nums`. Always.
8. **Every accent color comes from the Heritage palette unless the surface is intentionally another vocabulary.** No off-roster colors.
9. **Every form has a custom focus ring in ochre.** Never the browser default.
10. **The brain never auto-mutates domain data.** Always proposes; the user (or a rule) commits.

---

# WAVE E — THE GENESIS

The first-touch experience. Whatever a new tenant sees before they have data of their own.

## Phase 21 — The Genesis Seed (onboarding & sample-data wizard) ✅ SHIPPED

**Status (2026-06).** Fully shipped. The wizard at `/admin/genesis` previews the
dataset *shape* before committing: `lib/genesis/recipes.ts` is a declarative,
unit-tested catalog (six sectors — hospitality, dairy, agriculture, education,
intelligence, people) diffed against live DB counts via `summarizeGenesis()`,
rendered as per-sector "constellation" cards (`components/genesis/Constellation.tsx`,
Sleek Operator, present/partial/will-create per line). Three commit paths:
**`topUpDemoCorpus`** — idempotent + non-destructive; **`seedMissingGenesis`** —
additive per-sector idempotent re-seed (finds empty sectors, builds only those,
no wipe); and the destructive full reseed gated behind an explicit wipe
acknowledgement (`DangerReseed` + a server-side `confirm=WIPE` token). The
cinematic **constellation-drop animation** (`gxDrop` keyframe in
`Constellation.tsx`) plays as seeded cards land staggered — opacity + scale
settle from 1.04 → 1.0 with a brightness spike, reduced-motion honoured.

**Pitch.** Today's `npm run db:seed` is a CLI footgun: it requires a terminal, can't be re-run from the product, and gives ADMIN users no preview of what they're about to instantiate. Phase 21 promotes seeding to a first-class onboarding surface — a bilingual wizard that shows the *shape* of the data H-Nerve is about to create, lets the operator pick which sectors to seed, and can be safely re-run (idempotent) from the product itself.

**Wow moment.** A new ADMIN signs in for the first time. Instead of an empty `/orrery`, they land on **The Genesis** — a black-emerald canvas with three pulsing constellations (Hospitality · Dairy · Agriculture · Education). Each constellation expands to show the entities about to be created (companies, hotels, dairy lines, programs) as a living diagram. The operator confirms; over the next 8 seconds the constellations "drop" one by one into the database with a soft thud animation, and the orrery hub fades up around them, already populated.

**Shipped in this phase:**
- `app/(admin)/admin/genesis/page.tsx` — wizard UI: entity counts, empty/populated state, seed CTA, credentials cheat-sheet.
- `app/(admin)/admin/genesis/actions.ts` — `runGenesisSeed()` ADMIN-only server action, imports and calls `seedOperator()` from `prisma/seed.ts`.
- `app/(app)/brain/narrate/page.tsx` — narrator output gallery: recent Narratives with Phase 22 `VerifiedBadge` trust tagging.
- Admin nav updated: Genesis link in the top rail.
- `ConstellationRail` + `MiniOrrery` + `routeMap.ts` updated: `/brain/narrate` route live.

**Files.**
- `prisma/seed.ts` — existing seeder, refactored into composable `seedSector(sector)` units.
- `lib/genesis/recipes.ts` — declarative recipes per sector (industry pack hooks).
- `app/(admin)/admin/genesis/page.tsx` — the wizard UI.
- `app/(admin)/admin/genesis/actions.ts` — `runGenesis()` server action, ADMIN-only.
- `components/genesis/Constellation.tsx` — the animated entity preview.

**Aesthetic.** Sleek Operator (DESIGN-SKILL §1.F) — this is admin territory, cyan-on-near-black. The "thud" landing animation is a one-frame brightness spike + a 200ms scale-from-1.04 settle, no bounce.

**Signature animation.** Each seeded entity flies from its constellation into a slot in the underlying database table view, leaving a trailing emerald comet. When the seeder finishes, the orrery hub fades up over the empty canvas with `ease-out-expo` over 900ms.

**Effort.** 3-4 days.
**Depends on.** Phase 11 (white-label tenants) — Genesis writes into a tenant scope.

**Demo script.** "Watch what happens when a new tenant signs up. They don't see a sad empty screen. They watch their business get assembled in front of them, sector by sector. By the time they sit down, the system already knows what they own."

**Why it matters.** Every demo, every test reset, every new tenant goes through this. Today that flow is `npm run db:reset && npm run db:seed`. Tomorrow it is a UI moment that sells the platform on its own.

**Note.** Genesis is **idempotent and reversible**. Re-running it does not duplicate; it diffs against the live tenant and only writes missing entities. A "rollback last genesis" action exists for the same session. No accidental data loss.

---

## Phase 22 — Brain Trustworthiness Layer (ML + Hallucination Guard) ✅ (shipped, except 22b)

**Status (2026-06-04):** ✅ shipped. The earlier "still to land" list is now stale —
the verifier IS wired into `narrator.claude.ts` (runs on every write), the
`Narrative` model DOES persist verification telemetry (as `trustScore` /
`trustLabel` / `claimsTotal` / `claimsMatched` — note: not the originally
predicted `verifiedAt`/`confidenceScore` names), and `VerifiedBadge` / `TrustChip`
render across the council, /plans (list + detail), /insights, and /brain/narrate.
Only **Phase 22b (fine-tuning pipeline)** remains — a future engagement that needs
~6 months of `BrainFeedback` data.

**Status (2026-06):** core verifier + confidence scorer landed. Live:
- `lib/brain/verifier.ts` — claim extraction (numbers, percentages, currency) + facts-payload matching with ±2% tolerance.
- `lib/brain/confidence.ts` — four-axis scorer (verification × freshness × density × graph support) with calibrated weights (0.45/0.25/0.20/0.10).
- `components/brain/VerifiedBadge.tsx` — ✓/△/⚠ inline badge with per-factor breakdown tooltip.
- `app/(app)/brain/trust/page.tsx` — trust dashboard (distribution, cache hit rate, audited claim count, recent outputs).
- Unit tests under `lib/brain/{verifier,confidence}.test.ts` covering extraction edge cases, tolerance, freshness decay.

Still to land: wire the verifier directly into `narrator.claude.ts` post-process (currently the trust page self-checks against extracted numbers); persist a `verifiedAt` + `confidenceScore` column on `Narrative`; render `VerifiedBadge` everywhere narrator text appears. Phase 22b (fine-tuning pipeline) remains a future engagement.



**Pitch.** The brain's Claude API calls are fast but opaque. Phase 22 wraps every brain output in a verification layer: fact-check against the tenant's own database, confidence scoring, and a lightweight on-device ML classifier that flags suspicious claims before they reach the operator.

**Why this matters.** The user is right: any LLM can hallucinate. The solution is not blind trust — it is a **verification contract**. Every brain claim must be traceable to a database row, a causal edge, or a known pattern. If it cannot be traced, it is surfaced with a low-confidence badge and a "show evidence" link, not silently accepted.

**Architecture.**
1. **Ground-truth verifier** (`lib/brain/verifier.ts`) — after every narrator/council/planner response, a structured pass checks each factual claim against Prisma queries. Claims that match get a `verified: true` flag and a source citation. Claims that do not are downgraded to `confidence: "low"` and shown with a ⚠ indicator.
2. **Confidence scorer** (`lib/brain/confidence.ts`) — heuristic scoring based on: how many data points support the claim, how recent the underlying data is, and whether the causal graph contains a path that supports the direction of the claim.
3. **Fallback cache** (`lib/brain/cache/`) — every verified answer is cached per `(orgId, dataDigest, question)`. If the Claude API is unavailable, the brain serves the most recent verified cached answer with a "cached from [date]" label — never silent failure.
4. **Fine-tuning pipeline (Phase 22b)** — after 6 months of feedback data (Phase 7), export the `BrainFeedback` table and fine-tune a small domain-specific classifier (via Anthropic's fine-tuning API or open-source BERT). This classifier handles simple routing questions without hitting the Claude API at all — reducing hallucination risk AND cost AND latency.

**Files.**
- `lib/brain/verifier.ts` — ground-truth check post-processing
- `lib/brain/confidence.ts` — confidence scoring
- `lib/brain/cache/narrator.ts` — already stubbed; this phase fully implements it
- `lib/brain/feedback.ts` — Phase 7 feedback loop feeds Phase 22b fine-tuning
- `components/brain/VerifiedBadge.tsx` — ✓ / ⚠ indicator on brain outputs
- `app/(app)/brain/trust/page.tsx` — Trust dashboard: hallucination rate, confidence distribution, cache hit rate

**Aesthetic.** Industrial Precision for the trust dashboard (metrics grid, terminal-style evidence traces). Heritage Modern for the inline ✓/⚠ badge on narrator outputs.

**Signature animation.** When a verified claim appears, the ✓ badge draws in from the citation — a hairline thread animates from the source number to the badge over 300ms. Unverified claims pulse amber once on first render, then settle to a static ⚠.

**Effort.** 5-7 days (verifier + confidence scorer + cache + badge UI). Phase 22b (fine-tuning) is a separate future engagement.
**Depends on.** Phase 4 (narrator output to verify), Phase 7 (feedback loop for fine-tuning).

**Demo script.** "Every claim the brain makes — I can show you the database row that proves it. If it can't prove it, it tells you. That is the difference between a magic 8-ball and a brain you can trust in front of your board."

---

## Phase 23 — Database Migration + Infrastructure Hardening ✅ (shipped)

**Status (2026-06):** delivered. PostgreSQL is the production datasource; migrations under `prisma/migrations/` (11 applied); `app/api/health/route.ts` returns `{status,db,ts}` for Railway's uptime monitor; `railway.toml` runs `prisma migrate deploy` in the pre-deploy step. The original "1-2 days" estimate held.

**Pitch.** H-Nerve ships on SQLite for development speed. Phase 23 migrates to PostgreSQL, deploys on Railway's managed database service, and adds the reliability layer (connection pooling, read replicas, automated backups) needed to handle real business data.

**Why this matters.** SQLite is a file — it cannot handle concurrent writes from multiple users, it does not survive a server restart cleanly on Railway, and it cannot scale beyond a single machine. When the Hourani Group connects their live data, the database must be production-grade from day one.

**The migration is one configuration change and a re-seed.** Prisma is already database-agnostic; changing `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and providing a `DATABASE_URL` is the entire switch. Railway provisions a PostgreSQL instance in 30 seconds.

**Steps (in order).**
1. Provision Railway PostgreSQL database — copy the `DATABASE_URL` to Railway environment variables.
2. Change `prisma/schema.prisma` datasource from `sqlite` to `postgresql`.
3. Run `npx prisma migrate dev --name init` to generate the first migration.
4. Run `npm run db:seed` against the new database.
5. Add `DATABASE_URL` to Railway's production environment variables.
6. Re-deploy — Railway auto-runs `npm run build` which calls `prisma generate + db push`.
7. Verify all 14 main routes load data correctly.

**Infrastructure additions.**
- **Connection pooling** — Prisma Accelerate (or PgBouncer) to prevent connection exhaustion under concurrent traffic.
- **Automated backups** — Railway's daily backup + point-in-time recovery enabled.
- **Health check endpoint** — `app/api/health/route.ts` returns `{ ok: true, db: "connected", ts: ISO }` used by Railway's uptime monitor.

**Files.**
- `prisma/schema.prisma` — `provider` change
- `prisma/migrations/` — generated by `prisma migrate dev`
- `app/api/health/route.ts` — new health check
- `lib/db.ts` — no change needed (already exports shared Prisma client)

**Effort.** 1-2 days (migration is mechanical; the time is in testing all routes).
**Depends on.** Nothing — can run in parallel with any phase.

**Note on lag.** PostgreSQL on Railway is co-located with the app (same Railway project, same region). Queries are <5ms. The concern about lag comes from SQLite being a local file — PostgreSQL over a TCP connection with connection pooling is actually faster under real traffic.

---

## Phase 24 — Railway Infrastructure Maximization 🔄 (in progress)

**Pitch.** Make full use of the Railway subscription already in place: custom domain, environment management, automated deployments, monitoring, and the PostgreSQL service from Phase 23.

**Shipped in this phase:**
- `lib/logger.ts` — structured JSON-line logger. Emits `{ ts, level, msg, ...fields }` to stdout/stderr so Railway's log aggregator can filter, alert, and search. Zero dependencies.
- `lib/env.ts` — type-safe env access with `checkEnv()` startup validator, `hasLLMKey()`, and `appUrl()`. Surfaces missing vars clearly instead of runtime crashes.
- `app/api/health/route.ts` (updated) — extended liveness probe: DB latency, env check, uptime, `"ok" | "degraded" | "error"` status with structured JSON body.
- `app/api/ready/route.ts` (new) — readiness probe: stricter than `/health`. Returns 503 when DB unreachable or workspace unseeded. Suitable for Kubernetes `readinessProbe` or a stricter uptime-monitor URL.
- `railway.toml` (updated) — `sleepApplication = false` (prevents Railway from sleeping cron-dependent services), `healthcheckTimeout` bumped to 45s, `numReplicas = 1` explicit, improved comments.

**What Railway gives us that we are not yet using.**

| Feature | Current state | With Phase 24 |
|---|---|---|
| Custom domain | railway.app subdomain | hnerve.jo or hourani-erp.com |
| Environment variables | Manually set | Synced from a `.env.railway` template, never committed to git |
| Deployment | Auto on `main` push | Auto on `main`; staging on `feat/*` branches; preview URLs per PR |
| Logging | Raw stdout | Structured JSON logs parsed by Railway's log explorer |
| PostgreSQL | Not yet provisioned | Provisioned + pooled + backed up (Phase 23) |
| Health monitoring | None | `/api/health` polled every 60s; alert on failure |
| Memory/CPU | Unconstrained | Resource limits set; auto-restart on OOM |

**Files.**
- `railway.toml` — health check path, restart policy, build command
- `.env.railway.template` — non-secret env var template committed to git
- `app/api/health/route.ts` — shares with Phase 23

**Effort.** 1 day.
**Depends on.** Phase 23 (PostgreSQL).

---

## Phase 25 — GitHub Workflow Documentation (Team Onboarding) ✅ (shipped)

**Status (2026-06):** `docs/ops/GITHUB-WORKFLOW.md` is live. Bilingual (Arabic-first, English alongside), nine sections covering mental model, the four moving parts (commit / branch / PR / conflict), the workflow diagram, Railway hook-in, reading a diff, FAQs, naming conventions, repo at-a-glance, and a glossary.

**Pitch.** Every change to H-Nerve goes through GitHub. Phase 25 produces a permanent, bilingual guide (Arabic + English) that any new team member or executive can read to understand the full development workflow — commits, branches, pull requests, conflicts, merging, and Railway deployments.

**Why it exists.** The team currently does not understand what PRs, branches, and conflicts are. This is not a technical failure — it is a documentation failure. Phase 25 fixes it permanently.

**What a conflict is (brief version for the doc):** Two people change the same file at the same time. Git cannot decide which version wins, so it stops and asks you to choose. It marks the collision with `<<<<<<`, `=======`, and `>>>>>>>` markers, and a human (or an AI) resolves it by keeping the right version of each line. In H-Nerve, conflicts happen when a PR is merged to `main` before a second PR's branch has "fetched" those changes — the second branch is now out of date.

**The fix in every case:** save the new changes as a patch → reset to `main` → re-apply the patch → force-push → the conflict disappears. This is what the assistant does automatically.

**Contents of the guide (`docs/ops/GITHUB-WORKFLOW.md`).**
1. The mental model — main branch, feature branches, PRs as proposals
2. What a commit is (a named snapshot of changes)
3. What a branch is (a safe workspace that doesn't affect main)
4. What a pull request is (a request to merge your branch into main)
5. What a conflict is and why it happens
6. How to read a diff (+ lines = added, − lines = removed)
7. How Railway connects to GitHub (auto-deploy on merge to main)
8. The H-Nerve naming convention for branches and PRs

**Files.**
- `docs/ops/GITHUB-WORKFLOW.md` — bilingual guide, diagrams

**Effort.** 1 day (writing + diagrams).
**Depends on.** Nothing.

---

If we ever do a 30-minute live demo, this is the script:

1. **Open dashboard** — establish: "This isn't a typical ERP." (Heritage Modern UI does the work.)
2. **Hover a KPI for 1 second** — Phase 4 narrator. The room goes quiet.
3. **Click a company tile** — Phase 1 graph view, click a node, watch it propagate.
4. **Drag a slider** — Phase 2 simulator. They will stop taking notes.
5. **Click "Convene the council" on an insight** — Phase 3.
6. **Click "Open in Theater"** — Phase 9. This is the moment.
7. **Generate a plan, commit it** — Phase 5.
8. **Show the Brain IQ page** — Phase 10. Close on the climbing line chart.

Five minutes per beat. They will sign.

---

# Where to find things

| Need | File |
|---|---|
| The 20-phase plan | `docs/PHASES-INTELLIGENCE.md` (this file) |
| The design language | `docs/DESIGN-SKILL.md` |
| The brain entry point | `lib/brain/tools/` + `lib/brain/orchestrator.ts` (`Brain.ts` retired, PR #240) |
| Brain architecture | `lib/brain/README.md` |
| Project conventions | `CLAUDE.md` |
| The seeded demo data | `prisma/seed.ts` |
| The Genesis onboarding wave | `docs/PHASES-INTELLIGENCE.md` § Phase 21 |

When asking a future Claude to work on this, name the file. "Improve `lib/brain/orchestrator.ts`." "Implement Phase 3 from `docs/PHASES-INTELLIGENCE.md`." "Apply `docs/DESIGN-SKILL.md` Heritage Modern to `/finance`." Specificity is the whole game.

---

## End-to-End Verification (2026-06-02)

Comprehensive live verification of the running system against the seeded
SQLite dev.db, via Playwright + direct DB assertions. **Recorded here so the
state is provable, not claimed.**

### Pages — all 16 authenticated routes returned HTTP 200 with the correct Arabic heading
`/orrery /messages /brain /brain/council /brain/trust /brain/narrate /insights /hotels /dairy /digest /workspace /me /plans /brain/learning /brain/iq /admin/genesis`. Headings verified: المراسلات / المجلس / العقل المفكّر / المخرجات / الثقة / الموجز / الخطط / ذكاء الدماغ / etc. The only console error anywhere is a benign external-font cert failure under the restricted sandbox.

### Mutation flows — six server actions verified end-to-end, with row-level DB assertions
- **`convene()` — Brain Council:** topic submitted → server action fired → redirect to `/brain/council/[id]` → `CouncilSession` row created with `status=DONE` and **6 voices** (positions: support, oppose, support, qualify, oppose, qualify). The full multi-agent debate works.
- **`sendMessage()` — Messages:** new thread + body submitted → `Message` row persisted with a real cuid.
- **`createTask()` — Tasks:** title+description filled → form submitted → `Task` row persisted with `status=TODO priority=MEDIUM`.
- **`createInsight()` — Insights:** title+body → `AIInsight` row created (6→7).
- **`generateNewDigest()` — Digest:** form submitted → brain generated a `Digest` row (0→1).
- **`createProject()` — Projects:** companyId+title → `FutureProject` row created (10→11).

All re-verified after the full data wipe + deterministic reseed (2026-06-02), so they pass against fresh seed data, not a hand-tweaked DB.

### Brain endpoint — `POST /api/converse` → 200 with a real cited answer
*"Maha pushed [c1] batches this week, [c2] of them within the expiry window. Margin is on benchmark, but the brain signal [c3]…"*

### Test suite — pure-unit grew 414 → 503 (+89 this session)
- `lib/brain/memory.vector.test.ts` (+10) — the recall vectorizer (TF + cosine + serialize round-trip)
- `lib/brain/meta.iq.test.ts` (+8) — the Brain-IQ math (base 80, ceiling 160, monotone in every component, weight ordering)
- `lib/brain/agents/agents.test.ts` (+53) — every council specialist × every topic × both locales × determinism
- `lib/password.test.ts` (+13) — password policy (MIN 12, mixed classes, bilingual errors)
- `lib/importRateLimit.test.ts` (+5) — fixed-window rate limit (saturation, rollover, isolation)

All pure-unit, no DB. Typecheck + lint + production build all green.

### Health
`/api/health` → `{status: "ok", db: ok, db_latency_ms: 1–25, env: ok}`.

---

## Phase 26 — Polish & Bug-Fix Wave (operator-reported, 2026-06-01) 🔄 (in progress)

**Pitch.** A focused regression / polish pass surfacing every issue the operator caught while running the system end-to-end on Railway. None of these are new features — each is something that *exists* but does not behave the way a professional product should. Tracked here so they never get forgotten.

**Reported issues (operator session 2026-06-01):**

**Status legend:** ✅ fixed · 🔄 documented, pending.

| # | Issue | Status |
|---|---|---|
| 26.1 | FAB rail panels overlap rail circles | ✅ |
| 26.2 | Brain hub orb visual | ✅ |
| 26.3 | Orrery hub / MiniOrrery labels cramped | ✅ (MiniOrrery spacing) |
| 26.4 | `/workspace` redirects to `/companies` | ✅ |
| 26.5 | Digest "Generate" button hidden / not actionable | ✅ |
| 26.6 | Profile button opens Settings | ✅ (`/me` profile route) |
| 26.7 | Three FAB circles disappear intermittently | ✅ (working-as-designed + drop-zone hardened) |
| 26.8 | System feels heavy + laggy | ✅ (first pass — deferred overlays) |

### 26.1 — FAB rail panels stack badly (3 buttons → 3 overlapping circles)
The three FAB buttons (Ask the Brain, Quick Add, Time Machine) at the bottom-start corner each open a panel. Clicking the **2nd** button opens its panel **below the 1st circle**; clicking the **3rd** opens its panel below the other two. Panels and rail collide visually. Each panel should anchor cleanly to its rail position, never overlap a sibling, and have enough offset to read as a separate surface.
- Files: `app/(app)/living.css` (`.hn-fab-rail`, `[data-tm-legacy-pill].is-open`, `.fixed.bottom-6:has(.anim-fade-up)`), `components/QuickAddFAB.tsx`, `components/Conversational.tsx`, `components/TimeScrubber.tsx`.

### 26.2 — Brain hub orb visual is wrong
The current `/brain` hero (the dark orb with "Brain IQ" text) does not match the Claude Design reference. The reference shows a deep cosmic-emerald globe with internal glow and a faint orbiting ring, set against a starfield, with the IQ score positioned offset — far more professional. Replace the current `<div className="brain-orb">` markup with the Claude Design version (see `H-Nerve Orrery (standalone).html` from the design system, the central dark globe).
- Files: `app/(app)/brain/page.tsx`, `app/(app)/brain/brain-section.css`.

### 26.3 — Orrery hub section labels are cramped and in the wrong place
On the orrery hub (`/orrery`), the section name pills (Brain · Insights · Alerts · Plans · …) sit at the **footer** and are visually crowded together. Two changes: (a) move the labels to the **header** area (they read as navigation, not as a credit line); (b) add generous horizontal spacing between each pill so they read as discrete sections.
- Files: `app/(app)/orrery/page.tsx`, `app/(app)/orrery/orrery.css`.

### 26.4 — `/workspace` redirects to `/companies` when no workspace is active
`app/(app)/workspace/page.tsx:42` calls `redirect("/companies")` when `workspaceId` is null. From the operator's view this looks like a broken link — clicking "Workspace" sends them to a list of companies. Replace the redirect with an inline "Select a workspace" empty-state on the workspace page itself, with a clear CTA into the company picker.
- Files: `app/(app)/workspace/page.tsx`.

### 26.5 — `/digest` "Generate a new digest" button is hidden for most users
The button only renders when `hasRole(session, "MANAGER")`. For an ADMIN logged into a freshly seeded system, it still doesn't appear if the role string-comparison fails. Audit `hasRole()` against the seeded admin roles, OR loosen the gate to ADMIN/EXECUTIVE/MANAGER explicitly.
- Files: `app/(app)/digest/page.tsx`, `lib/authz.ts`.

### 26.6 — Profile button opens Settings instead of Profile
Clicking the user avatar in the top chrome navigates to `/settings` instead of `/me` (or wherever the user's profile lives). Either fix the link target or make the click open a dropdown with both "Profile" and "Settings" as separate items.
- Files: `components/Topbar.tsx` (or wherever the avatar is wired).

### 26.7 — "Three circles" disappear intermittently on the main interface
The FAB rail's three buttons sometimes fail to mount / disappear after a navigation. Likely a hydration race where the legacy QuickAddFAB / TimeScrubber wrappers race with the new FabRail; the legacy hide-rules in `living.css` lines 380-391 may be matching the new rail when the panel state changes. Audit the `[data-qaf-legacy-trigger]`, `[data-tm-legacy-pill]` selectors and the `.fixed.bottom-6:has(.anim-fade-up)` rule for over-reach.
- Files: `app/(app)/living.css`, `components/orrery/FabRail.tsx`.

**Investigation (2026-06-02) — ruled out, needs live repro.** `FabRail` renders all three buttons unconditionally (no `return null`, no pathname gate); no CSS rule hides `.hn-fab-rail`. Checked every full-screen overlay for an inactive click-blocker (the classic "buttons feel dead" cause): `MorningBrief` (`return null` when `!show`, line 71), `WelcomeSplash` (`return null` when `!open`, line 132), and `DocumentDropZone` (overlay gated behind `{dragging ? …}`) all correctly render nothing when inactive — none leaves a `position:fixed; inset:0` layer in the DOM. So this is **not** a statically-findable bug. Two remaining hypotheses to check **with browser devtools at the moment it happens**: (a) a stuck `dragCounter` in `DocumentDropZone` leaving `dragging=true` (drag-file-in-then-out-of-window can unbalance the enter/leave counter), which would mount its overlay and cover the rail; (b) a transient z-200 modal backdrop (`.mb-overlay`) overlapping right after a deferred mount. Decision: do **not** guess-fix a working rail — reproduce live first (inspect what element is on top at the FAB coordinates when they "disappear").

**RESOLVED (2026-06-02) — reproduced live via Playwright, root cause confirmed.** Logged in and drove the running app. The three FABs are **always present and visible** (`fabCount: 3`, all visible, `.hn-fab-rail` display:flex) on every page — they are never removed. But `document.elementFromPoint()` at the FAB coordinates returns a **modal overlay on top** — and a follow-up E2E run identified a **third** one: (1) **Morning Brief** (`mb-overlay show`, daily key `hnerve_briefing`), (2) **Onboarding Tour** (`absolute inset-0 anim-fade-in`, `OnboardingTour.tsx:115`, once-ever `h_nerve_onboarded_v1`), and (3) **WelcomeSplash** (`aria-label="أهلاً بك"`, `z-[100]`, once-ever `h_nerve_welcome_v1.4_seen`). Playwright literally reported `intercepts pointer events` for each one during E2E runs. All three backdrops have pointer-events enabled, so while any of them is open the FABs are visible-but-unclickable — which is exactly the operator's "the circles are there but don't work / disappear." **This is working-as-designed modal behavior, not a defect:** both are correctly gated — Onboarding Tour shows once ever (`localStorage h_nerve_onboarded_v1`), Morning Brief shows **once per day** (`hnerve_briefing` daily key). The *once-per-day* brief is precisely why it reads as **intermittent**. Both dismiss on backdrop-click and have explicit close buttons; once dismissed, the FABs work normally. **No code fix applied** — the remaining choice is a *product decision* for the operator: (a) keep the daily Morning Brief modal as-is; (b) make it less intrusive (a dismissible toast/banner instead of a full-screen backdrop) so it never sits over the FABs; or (c) reduce its frequency. Awaiting that call.

**CLOSED (2026-06-04) — side picked: working-as-designed, with one defensive hardening.** The "intermittent dead FABs" are the three correctly-gated modals (once-ever onboarding/welcome, once-daily brief) sitting over a never-removed rail; dismissing any of them restores the FABs. That is intended modal behaviour, **not a regression** — documented here as the resolution, and the Morning-Brief-as-banner choice (option b) is left as a deliberate product decision (not a bug fix). The one *genuine* latent defect from hypothesis (a) — a `DocumentDropZone` drag-counter that a drag-out-of-window could leave unbalanced, pinning its full-screen overlay over the rail — **is now fixed**: `dragleave` with `relatedTarget === null` force-resets, and `dragend`/`window blur` clear a stuck overlay (`components/DocumentDropZone.tsx`). Behaviour-preserving for the normal drop flow.

### 26.8 — System feels heavy and laggy
End-to-end the app feels slow on Railway. Likely causes: every page is `dynamic = "force-dynamic"` so nothing caches; the `(app)` layout fans out N parallel Prisma queries on every nav; the Orrery hub mounts a heavy canvas + the FAB rail + the morning brief overlay + the realtime SSE connection on every page. Audit candidates: `revalidatePath` over force-dynamic where data is hourly; defer realtime SSE until first user interaction; lazy-import `MiniOrrery` / `OnboardingTour` / `DocumentDropZone` overlays.
- Files: `app/(app)/layout.tsx`, every `page.tsx` with `force-dynamic`, `lib/realtime.ts`, the orrery canvas.

**Progress (multiple passes, ✅ done so far):**
- Deferred 5 non-critical overlays (tour, splash, morning brief, presence, drop zone) via `next/dynamic` (`components/DeferredOverlays.tsx`).
- Deferred the realtime **SSE kickoff** (first heartbeat + connect) to `requestIdleCallback` so it no longer competes with initial render (`RealtimePresence.tsx`).
- Removed **dead per-nav work** from the `(app)` layout left over from the Sidebar removal: a `unreadCountFor()` **DB count query** (real win), plus `sidebarCollapsed`, `fullUser`, `messages`, `enforcePerms` and their unused imports.
- Verified already-optimized: `atmosphere.js` pauses all canvases when the tab is hidden; 25 route-level `loading.tsx` files exist; always-mounted FAB/Conversational/TimeScrubber do no mount-time network work.

**Still pending (needs measurement / domain knowledge — not safe to do blind):** `force-dynamic` → `revalidate` on pages whose data is only hourly/static (risk: stale data); the Orrery iframe bundle weight (817KB `index.html` + gsap).

**Effort.** 1–2 days for 26.1, 26.3–26.7. 26.2 is 1 day (port the design + CSS). 26.8 is an ongoing performance budget — initial pass 1 day, measurement loop continues.

**Demo script.** "Watch — three FAB buttons, three clean panels, none overlap. Click Workspace, get a real chooser instead of being shunted off. Click your avatar, see a real profile menu. The hub labels breathe. The brain orb looks like the reference. The whole thing feels lighter."

---

## Phase 27 — ERP Module Expansion (the standard 13-module taxonomy) 🔭 (BACKLOG — sources pending, ~1 week out)

> **⏰ REMINDER FOR FUTURE CLAUDE:** Anas is actively studying ERP and will bring
> source material (the "13 ERP modules" + other functionality) in roughly a week.
> When he returns with those sources, **surface this phase** and we plan the
> expansion together. This is intended as a *final enrichment wave* — mapping
> H-Nerve onto the canonical ERP module taxonomy and adding the tools/sections we
> don't yet have. Do not start it before the sources arrive; just remember it.

**Pitch.** H-Nerve grew organically around the Hourani Group's sectors. Phase 27
steps back and aligns the product with the **standard ERP module taxonomy** an
ERP curriculum teaches, so nothing essential is missing and the platform reads as
a complete ERP to anyone who knows the field.

**The standard ERP modules** (the reference checklist — Anas's sources will refine
this). Marked with what H-Nerve already has vs. gaps to fill:

| # | Module | H-Nerve today |
|---|---|---|
| 1 | **Finance & Accounting** (GL, AP/AR, journals) | ✅ ledger, journal entries, financial periods |
| 2 | **Procurement / Purchasing** | ✅ purchase orders, suppliers |
| 3 | **Inventory Management** | ✅ products, inventory movements, warehouses |
| 4 | **Order Management / Sales** | ✅ sales orders, customers |
| 5 | **Supply Chain Management** | ✅ supply-chain + forecasts + cross-tenant bridge |
| 6 | **Manufacturing / Production (MRP)** | 🟠 partial (dairy batches) — no general BOM/MRP |
| 7 | **Human Resources / HCM** (payroll, leave, org) | 🔴 gap — only users/roles/employees list |
| 8 | **CRM** (leads, pipeline, opportunities) | 🔴 gap — customers exist, no pipeline |
| 9 | **Project Management** | 🟠 future-projects exist; no tasks/gantt depth |
| 10 | **Asset Management** (fixed assets, maintenance) | 🔴 gap |
| 11 | **Warehouse Management (WMS)** | 🟠 warehouses exist; no bin/pick/pack |
| 12 | **Business Intelligence / Reporting** | ✅ analytics, reports, the Brain |
| 13 | **Quality / Compliance / Document Mgmt** | 🟠 documents + protocol clauses; no QMS |

**Likely highest-value additions** (pending Anas's sources): a proper **HR/HCM**
module, a **CRM pipeline**, and **fixed-asset management** — the three clearest
gaps above. Each new module follows the canonical pattern (Companies/Hotels CRUD
+ a brain agent pack + a section in the orrery hub).

**Files (when we build it).** New `app/(app)/<module>/` sections + server actions,
new Prisma models, new `lib/brain/agents/*` packs per module, orrery routeMap +
ConstellationRail entries.

**Depends on.** Nothing blocking — but best done *after* the RAG re-architecture
(so new modules are retrieval-aware from day one) and *after* Anas's study sources
land. **Effort.** Scales with how many gap-modules we add (HR alone ≈ 3–5 days).

---

## Phase 28 — The Companion ("the soul") ✅ v1 SHIPPED (2026-06-05)

> **Anas's words:** *"Why not add a bit of animation that will sit in the corner
> and move around the website? It will add a soul into it… like the photon one,
> but in our way."* Captured here so it's not lost. **Lower priority than the
> login redesign** (`docs/prompts/LOGIN-REDESIGN.md`) — that comes first.

**Pitch.** Give H-Nerve a **living presence** — a small, ambient animated
companion that drifts around the app, idles in a corner, and reacts to what's
happening. It is the *visible body of the Brain*: when the system thinks, the
companion thinks; when an insight fires, it notices. Done with restraint, it
turns a polished ERP into one that feels **alive and personal**.

**The character (one idea — "the Spark / الشرارة").** A single **photon of
emerald-gold light** — a glowing mote with a soft comet-trail and a faint
synapse halo, echoing the login's "nervous-system cosmos" and the Orrery. Not a
cartoon mascot; an abstract *light-being* that fits Heritage Modern. It:
- **Idles** in a screen corner, breathing/floating (tiny parallax bob).
- **Drifts** along a gentle path occasionally, or darts toward a just-arrived
  toast / new insight / the Brain FAB, then settles back.
- **Reacts to real events** (read-only, never intrusive): pulses when the Brain
  runs, brightens on a council recommendation, dims when the system is idle,
  does a quick celebratory flare on a completed plan / achievement.
- **Personality, lightly:** rare, charming micro-moments (a slow blink, a curious
  lean toward the cursor) — Pixar-lamp restraint, *never* a Clippy.

**Hard requirements (so it adds soul, not annoyance).**
- **Dismissible + remembered:** a one-click hide; persist the preference. Off by
  default for first-time users until they opt in (or on by default but trivially
  muted — decide with Anas).
- **`prefers-reduced-motion`:** fully static (or hidden) — no exceptions.
- **Performance:** `transform`/`opacity` only, pause on hidden tab, near-zero CPU
  when idle, never blocks clicks (pointer-events: none except its own hit area).
- **Never covers content or steals focus**; lives above chrome but below modals.
- **Theme-aware** via the existing CSS-var tokens; mirror motion in RTL.

**Where it plugs in.** A single global client component mounted in the
`(app)` layout (sibling to the other overlays). It can subscribe to the existing
realtime/toast channel to know when to react. Optional: tie its "mood" to the
Brain IQ / `ragQuality` so its glow literally reflects how confident the system is.

**Depends on.** Nothing blocking. Best **after** the login redesign sets the
visual language (the Spark should look like it came from the same universe).
**Effort.** ~2–4 days for a tasteful v1 (idle + drift + 3–4 event reactions +
reduced-motion + dismiss). Risk: easy to over-do — keep it subtle or cut it.

---

## Phase 27b — "The Core" hub + orrery node (ERP data back-office) 🔭 (BACKLOG — operator-flagged 2026-06-03)

> Anas: the ERP data/admin modules (`/admin/imports`, accounts, journal,
> products, movements, warehouses, purchase-orders, sales-orders, customers,
> mappings) are only reachable via tenants/settings, and the imports screen
> "looks shit." Wants it (a) reachable **as an orbit on the Orrery hub** with a
> name that describes its job, and (b) a nicer interface — ideally folded into
> the Phase 27 modules work so we don't iterate back and forth.

**The name.** This area is the operational system-of-record: ingestion +
ledger + master data + transactions. Proposed orrery planet: **"The Core"
(النواة)** — the dense data nucleus at the center of the system. (Plainer
investor-facing alternative: **"Operations" (العمليات)**. Anas picks.)

**Scope (do with the Phase 27 module wave):**
1. **A real hub page** `app/(app)/core/` (or `/operations`) — a single landing
   that tiles every ERP back-office module (imports, accounts, journal,
   products, movements, warehouses, POs, SOs, customers, suppliers, mappings)
   with counts + quick actions, in Heritage Modern. Today there is no index —
   you reach modules only by deep link.
2. **Orrery node:** add a planet to the hub (`public/orrery/index.html` is the
   built artifact — edit the source under `docs/design/orrery/` and re-run
   `scripts/build/build-orrery.mjs`) and add its label → route in
   `lib/orrery/routeMap.ts` `NAME_MAP` (e.g. `"النواة": "/core"`).
3. **Polish the imports + module screens** to the dashboard's bar (KPI strip,
   hairline tiles) instead of the current bare look.

**Depends on.** Best bundled with Phase 27 (the modules get a coherent home as
they land). **Effort.** Hub page ~1 day; orrery node ~½ day; per-module polish
scales with module count.

**Concrete defects found (2026-06-04 audit, corrected) — fix as the first slice:**
- **The ERP back-office pages already exist** — they live under `app/(app)/admin/*`
  (operator/Heritage shell), reachable at `/admin/imports`, `/admin/products`,
  `/admin/movements`, `/admin/warehouses`, `/admin/transfers`, `/admin/mappings`,
  `/admin/purchase-orders`, `/admin/sales-orders`, `/admin/suppliers`,
  `/admin/customers`, `/admin/journal`, `/admin/accounts`, `/admin/brain`, plus an
  in-page tab bar that cross-links them. **They are NOT dead 404s** — the
  `/admin/system` hub links resolve. The real problem is they have **no single home
  on the Orrery hub** (this is "The Core" work): you only reach them by deep link or
  the tab strip. **Build the `/core` (النواة) hub page that tiles them with counts +
  quick actions, and add the Orrery node.**
- **Polish the import + module screens.** The import log (`/admin/imports`) is
  functional but sparse — KPI tiles at zero with an empty state. Bring every module
  up to the dashboard's bar (KPI strip, hairline tiles, clear empty states).
- **`/admin/db` (the cyan Data Browser, in the `(admin)` console) is not in the
  admin top rail** — reachable only as a card inside `/admin/system`. Add it to the
  rail (`app/(admin)/layout.tsx`, Database icon).
- **Button hierarchy is inverted on `/admin/genesis`:** the destructive
  `admin-btn-danger` renders *smaller* than the safe `admin-cta-primary`. Bump the
  primary CTAs (`~12px 22px`, `14px`) and make the danger button visually heavier.
- **`/admin/db` is too bare:** no section header, no search/filter over the model
  grid, and "0 rows" vs "couldn't read" look identical. Add a heading, a
  type-to-filter input (`.admin-input` exists), and distinct empty/error states.
- **Inline-style sprawl:** `/admin/db` and `/admin/system` duplicate ~30 lines of
  inline card styling; `/admin/genesis` is hand-rolled inline instead of the
  `admin-section*` classes. Extract a shared `admin-link-card` class.

---

# WAVE F — THE FORGE (re-engineering & hardening)

## Phase 29 — Radical Re-Engineering & Scale Hardening 🔝 (TOP PRIORITY — final phase, 2026-06-04)

> Anas: "We've run out of *features* to add. The next high-leverage move is to
> radically re-engineer the system itself — the file structure, the code quality,
> and the size — and make sure it never struggles when 100–200 people use it.
> This is the one to run with UltraCode (multi-agent orchestration)."

**Why now.** The product surface is feature-complete enough to demo and sell. The
remaining risk is no longer "missing capability" — it's **internal entropy**:
god-files, a flat `lib/`, an accreted 9.8k-line global stylesheet, dead code, zero
UI/API tests, and a database layer with no connection pooling. None of this is
visible in a demo; all of it slows every future change and threatens reliability
under real concurrent load. Phase 29 pays that debt down deliberately, in safe,
test-guarded slices — **behaviour-preserving by contract** (no feature changes;
every slice must keep `tsc` + `lint` + tests + `next build` green and produce an
identical UI).

**Hard metrics (2026-06-04 audit baseline).**
- ~121,600 LOC of source: `app/` 66.4k · `lib/` 26.4k · `components/` 22.4k.
- **`lib/` is flat:** 76 of 179 files sit in the root — the #1 navigability smell.
- **`app/globals.css` = 9,851 lines** (115 `@keyframes`), plus ~4.6k lines of
  scattered route CSS (incl. two duplicate `audit.css`). ~14.5k lines of CSS total.
- **God-files:** `export/html/[type]/route.ts` (1,086), `workspace/operations`
  (995), `LoginCosmos.tsx` (884), `companies/[id]` (788), `dashboard` (760),
  `audit-360` (681), `users/[id]` (680); brain UI `Conversational` (738),
  `CausalStudio` (705), `GraphCanvas` (682), `Scenario` (656).
- **Confirmed dead code:** `lib/toast.client.ts` (0 refs) and `lib/alertEvaluator.ts`
  (476 lines, 0 refs, duplicates the live `lib/alertEngine.ts`). Plus low-value
  satellites: `aiEngineExtra.ts`, `importRateLimit.ts` (vs `rateLimit.ts`).
- **Tests:** 55 files, **100% under `lib/`**. `app/` (134 routes, 25 API endpoints)
  and `components/` have **zero tests** — the biggest quality gap.
- TODO/FIXME debt is tiny (2). This is a *structure/size/quality* problem, not an
  unfinished-work problem. (Disk: 1.4 GB is just `.next` + `node_modules` cache —
  not a git problem.)

**Workstreams (each a self-contained, test-guarded slice — ideal for parallel agents).**
1. **Kill dead code (quick win, near-zero risk).** Delete `lib/toast.client.ts` +
   `lib/alertEvaluator.ts`; fold `aiEngineExtra.ts`→`aiEngine.ts`,
   `importRateLimit.ts`→`rateLimit.ts`. ~750 LOC gone, one duplicate alert path removed.
2. **Modularize the CSS (highest single payoff).** Split `globals.css` into
   `tokens` + `base/` + per-component files; extract the 115 keyframes into one
   `animations.css`; dedupe the two `audit.css`. Kills the worst file and global
   collisions.
3. **Reorganize `lib/` into domains** (`auth/ finance/ ai/ alerts/ import/ export/
   db/ i18n/ …`). Touches hundreds of `@/lib` imports — do it as one mechanical,
   codemod-style pass with a green build at the end. Mirror it in a multi-file
   Prisma schema (the 2,036-line schema is the single largest file).
4. **Split god-files.** Export route → per-type renderers in `lib/export/`; heavy
   pages (operations/companies/dashboard/audit-360/users) → server data modules +
   child components; brain UI (Conversational/CausalStudio/GraphCanvas/Scenario) →
   extract hooks from rendering.
5. **A test floor for the untested surface.** Smoke/contract tests for the 25 API
   routes + the top pages; this de-risks every other slice.
6. **Scale hardening — the 100–200-user contract (see below).**

**Scale hardening — answering "will it struggle at 100–200 users?"**
Today: **10–15 concurrent users — yes, comfortably.** The render path does no heavy
in-process compute and no blocking LLM calls; the Prisma client is a proper
singleton; SSE is clean. **100–200 — not yet**, because:
- **No DB connection pooling.** Railway Postgres is a *direct* connection; Prisma's
  default pool (~9–17/instance) exhausts under load. The old env-template
  "pgBouncer" claim was aspirational/false (that Vercel-era template is retired). **Fix:** enable **Prisma Accelerate**
  (drop-in) or a **PgBouncer** sidecar with a `directUrl` for migrations. *This one
  change unlocks 100–200.*
- **Dashboard is `force-dynamic` + ~22 uncached queries/load** (grabs 15–20
  connections at once). **Fix:** add `revalidate`/`unstable_cache` to the KPI
  aggregates.
- **One stray pool:** `app/api/seed/route.ts` does `new PrismaClient()` — use the
  shared `prismaUnscoped`.
- **Single-replica-only:** in-memory realtime store + dev-style global client.
  **Keep `numReplicas = 1`** until the realtime store moves to Redis; horizontal
  scaling today would split presence + multiply pools.
- A few unbounded `findMany` on the dashboard (`transaction`, `marketStock`,
  `activityLog`, `company`) want `take:` limits as data grows.

**Definition of done.** Every slice ships behind a green gate; the app is
demonstrably identical to use; `lib/` is domain-organized; `globals.css` is
decomposed; dead code is gone; the API surface has a smoke-test floor; and the DB
sits behind a pooler with the dashboard cached — verified to hold 100–200
concurrent sessions in a load test.

**Aesthetic.** None — this phase changes no pixels by design. The only visible
artifact is speed and stability.

**Effort.** Large but parallelizable — the natural UltraCode engagement: fan out
the independent slices (1–5) across agents, serialize the risky `lib/` reorg (3),
land the scale fixes (6) as their own PR. **Depends on.** Nothing; it's the safest
when feature work is paused.