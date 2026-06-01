# H-Nerve — The 20-Phase Intelligence Plan

> Build the best brain in the world, then wrap it in the best ERP in the world.

H-Nerve is a generic ERP intelligence platform. This document is the master plan for everything that comes after the Heritage Modern UI pivot. Each phase is substantively new capability — not polish. Each phase has a wow moment, a defined aesthetic vocabulary from `docs/DESIGN-SKILL.md`, and a signature animation.

**The brain file:** `lib/brain/Brain.ts` (subsystems under `lib/brain/`)
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

## Phase 5 — The Planner

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

## Phase 7 — The Feedback Loop

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

## Phase 21 — The Genesis Seed (onboarding & sample-data wizard)

**Pitch.** Today's `npm run db:seed` is a CLI footgun: it requires a terminal, can't be re-run from the product, and gives ADMIN users no preview of what they're about to instantiate. Phase 21 promotes seeding to a first-class onboarding surface — a bilingual wizard that shows the *shape* of the data H-Nerve is about to create, lets the operator pick which sectors to seed, and can be safely re-run (idempotent) from the product itself.

**Wow moment.** A new ADMIN signs in for the first time. Instead of an empty `/orrery`, they land on **The Genesis** — a black-emerald canvas with three pulsing constellations (Hospitality · Dairy · Agriculture · Education). Each constellation expands to show the entities about to be created (companies, hotels, dairy lines, programs) as a living diagram. The operator confirms; over the next 8 seconds the constellations "drop" one by one into the database with a soft thud animation, and the orrery hub fades up around them, already populated.

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

## Phase 22 — Brain Trustworthiness Layer (ML + Hallucination Guard) 🔄 (in progress)

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

## Phase 24 — Railway Infrastructure Maximization

**Pitch.** Make full use of the Railway subscription already in place: custom domain, environment management, automated deployments, monitoring, and the PostgreSQL service from Phase 23.

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

**Status (2026-06):** `docs/GITHUB-WORKFLOW.md` is live. Bilingual (Arabic-first, English alongside), nine sections covering mental model, the four moving parts (commit / branch / PR / conflict), the workflow diagram, Railway hook-in, reading a diff, FAQs, naming conventions, repo at-a-glance, and a glossary.

**Pitch.** Every change to H-Nerve goes through GitHub. Phase 25 produces a permanent, bilingual guide (Arabic + English) that any new team member or executive can read to understand the full development workflow — commits, branches, pull requests, conflicts, merging, and Railway deployments.

**Why it exists.** The team currently does not understand what PRs, branches, and conflicts are. This is not a technical failure — it is a documentation failure. Phase 25 fixes it permanently.

**What a conflict is (brief version for the doc):** Two people change the same file at the same time. Git cannot decide which version wins, so it stops and asks you to choose. It marks the collision with `<<<<<<`, `=======`, and `>>>>>>>` markers, and a human (or an AI) resolves it by keeping the right version of each line. In H-Nerve, conflicts happen when a PR is merged to `main` before a second PR's branch has "fetched" those changes — the second branch is now out of date.

**The fix in every case:** save the new changes as a patch → reset to `main` → re-apply the patch → force-push → the conflict disappears. This is what the assistant does automatically.

**Contents of the guide (`docs/GITHUB-WORKFLOW.md`).**
1. The mental model — main branch, feature branches, PRs as proposals
2. What a commit is (a named snapshot of changes)
3. What a branch is (a safe workspace that doesn't affect main)
4. What a pull request is (a request to merge your branch into main)
5. What a conflict is and why it happens
6. How to read a diff (+ lines = added, − lines = removed)
7. How Railway connects to GitHub (auto-deploy on merge to main)
8. The H-Nerve naming convention for branches and PRs

**Files.**
- `docs/GITHUB-WORKFLOW.md` — bilingual guide, diagrams

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
| The brain entry point | `lib/brain/Brain.ts` |
| Brain architecture | `lib/brain/README.md` |
| Project conventions | `CLAUDE.md` |
| The seeded demo data | `prisma/seed.ts` |
| The Genesis onboarding wave | `docs/PHASES-INTELLIGENCE.md` § Phase 21 |

When asking a future Claude to work on this, name the file. "Improve `lib/brain/Brain.ts`." "Implement Phase 3 from `docs/PHASES-INTELLIGENCE.md`." "Apply `docs/DESIGN-SKILL.md` Heritage Modern to `/finance`." Specificity is the whole game.
