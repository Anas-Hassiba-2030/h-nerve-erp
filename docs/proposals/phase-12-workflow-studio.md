# Phase 12 — Workflow Studio

Visual trigger → condition → action automation across modules (docs/PHASES-INTELLIGENCE.md §Phase 12). This proposal scopes what remains; a surprising amount already ships.

## Current state (what already exists in the repo, with file paths)

The "build and test a flow" half is largely done; the "run it for real" half is a stub.

- **Data model** — `prisma/schema.prisma:1264-1337`: `Workflow` (scope/name/enabled/status/lastRunAt/runCount), `WorkflowNode` (kind/templateKey/configJson/posX/posY), `WorkflowEdge` (composite-unique on workflowId+from+to), `WorkflowRun` (status/triggeredBy/durationMs/traceJson). Note `WorkflowRun.triggeredBy` line 1328 already documents the intended `"manual" | "test" | "schedule:<cron>" | "event:<id>"` vocabulary — but only `manual`/`test` are ever written today.
- **Runtime** — `lib/workflows/runtime.ts`: `runWorkflow(id, mode)` walks the graph from each trigger via `evaluationWalk` (visited-set guards cycles and diamonds), evaluates triggers against live Prisma data, conditions as pure functions, actions per-mode. Real trigger evaluators exist (`dairy.expiry_within`, `hotel.occupancy_below`, `farm.moisture_below`, `revenue.delta_above`, `time.daily`). Tested in `lib/workflows/runtime.test.ts`.
- **Template registry** — `lib/workflows/templates.ts`: 5 triggers, 4 conditions, 6 actions, each with bilingual labels, `ParamSpec[]`, `defaultColumn`, `summary()`. Tested.
- **Gallery** — `lib/workflows/templates.gallery.ts` + `lib/workflows/seed.ts`: clonable named templates wired into `createWorkflowFromTemplate`.
- **UI** — `app/(app)/workflows/page.tsx` (Heritage/Daylight list), `app/(app)/workflows/studio/[id]/page.tsx` (Industrial Precision studio shell), `components/workflows/StudioCanvas.tsx` (SVG canvas, click-to-wire ports, Bézier edges, draw animation, test-run token particle), `Palette.tsx`, `TestRunStrip.tsx`.
- **Server actions** — `app/(app)/workflows/actions.ts`: create/addNode/deleteNode/**updateNodeConfig**/addEdge/deleteEdge/toggle/testRun/delete/seed/createFromTemplate.

**Gaps (the real scope of this phase):**
1. `runWorkflow(id, "real")` exists but is invoked **nowhere** outside `scripts/test/test-workflow-studio.ts` — no scheduler, no event dispatch. `enabled`/`status=ACTIVE` toggles change nothing at runtime.
2. All `evalAction` branches return `[dry]`/placeholder strings (runtime.ts:354-393) — no action mutates anything, even in `"real"` mode. The comment defers real handlers to "Phase 13 integrations."
3. `updateNodeConfig` action exists but **no canvas UI calls it** — params can only be set via gallery clone or DB; the inspector panel on `page.tsx` is read-only stats.
4. Conditions `severity_at_least`/`tenant_pack` use hardcoded payloads (runtime.ts:332-344) — no trigger-event payload threads through the graph.
5. `Workflow*` models are **not** in `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts`); every query uses the `scope` string column without enforcement — cross-tenant leak risk (docs/ISOLATION.md).

## Scope (what "shipping this phase" concretely means)

1. **Node config editing in the studio** — click a node → inspector renders `ParamSpec`-driven inputs → `updateNodeConfig`. Closes the only authoring gap.
2. **Scheduled execution** — a cron path that finds `enabled` workflows with `time.*` triggers and runs them in `"real"` mode, stamping `triggeredBy="schedule:<cron>"`. Reuse the existing `.github/workflows/brain-cron.yml` pattern or an `/api/workflows/run` route.
3. **Trigger-payload threading** — triggers emit a payload (count, severity, entity) carried into conditions/actions so `severity_at_least` and action messages are real, not constant.
4. **Real action handlers** — minimally `create_insight`, `generate_plan`, `record_memory` (in-system, no external integration) writing through existing brain/insight paths, honoring the read-mostly boundary (actions are the sanctioned write seam). Slack/email stay `[dry]` until Phase 13.
5. **Tenant isolation** — add `Workflow`/`WorkflowNode`/`WorkflowEdge`/`WorkflowRun` to scoping per docs/ISOLATION.md, or document the deliberate `scope`-column approach with a `// CROSS-TENANT INTENT:` audit.

## Files to touch (bullet list of concrete new + modified paths)

- **New** `components/workflows/NodeInspector.tsx` — `ParamSpec`-driven config form posting `updateNodeConfig`.
- **New** `app/api/workflows/run/route.ts` (or `scripts/workflows-cron.ts`) — scheduled/manual real-run entry; mirrors `.github/workflows/brain-cron.yml`.
- **New** `lib/workflows/dispatch.ts` — select `enabled` workflows due to fire; wraps `runWorkflow(id,"real")`.
- **Modify** `lib/workflows/runtime.ts` — payload object through `evalTrigger`→`evalCondition`→`evalAction`; implement in-system action handlers.
- **Modify** `components/workflows/StudioCanvas.tsx` — node-select → open inspector.
- **Modify** `app/(app)/workflows/studio/[id]/page.tsx` — mount inspector; add a "Run now (real)" control.
- **Modify** `app/(app)/workflows/actions.ts` — `runWorkflowNow` real-mode action (role-gated via `requireRole`).
- **Modify** `lib/workspaceScope.ts` + `prisma/schema.prisma` — tenant scoping/index review.
- **Modify** `lib/workflows/runtime.test.ts` — cover payload threading + real action handlers.

## Risks (technical + product, ranked)

1. **Tenant leak (HIGH).** Unscoped `prisma.workflow.findMany` ships cross-tenant rows. Must resolve before any real-run that mutates data.
2. **Runaway/duplicate execution (HIGH).** Cron + `enabled` flag with no idempotency/dedupe can double-fire actions or hammer the DB; `time.daily` fires on any matching hour, so cron cadence and run cadence must align. Need a "last fired" guard beyond `lastRunAt`.
3. **Read-mostly boundary erosion (MED).** Real action handlers are the first sanctioned writes from the workflow layer; they must route through existing server actions, not raw Prisma, or the brain's auditability guarantee weakens.
4. **Scope creep into Phase 13 (MED).** Slack/email tempt real wiring now; keep external delivery out — this phase is in-system only.
5. **Aesthetic bleed (LOW).** Inspector must stay Industrial Precision inside the studio; list view stays Heritage. Easy to mix.

## Recommended slice size (2–4 landable PRs)

- **PR 1 — Isolation + audit (behaviour-preserving).** Add `Workflow*` to scoping (or document intent), index review, no UX change. De-risks everything downstream first.
- **PR 2 — Node config editing (behaviour-preserving authoring).** `NodeInspector.tsx` + canvas select wiring + `updateNodeConfig`. Pure additive; no execution change.
- **PR 3 — Payload threading + in-system real actions.** Runtime changes + `runWorkflowNow` manual real-run, role-gated. Test-mode behaviour unchanged.
- **PR 4 — Scheduled dispatch.** `dispatch.ts` + cron/route stamping `schedule:<cron>`, with the dedupe guard. Lands last because it depends on PR 1 (isolation) and PR 3 (safe real actions).
