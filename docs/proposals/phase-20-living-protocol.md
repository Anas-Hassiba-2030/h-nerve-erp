# Phase 20 — Living Protocol

*Source of truth: `docs/PHASES-INTELLIGENCE.md` §466-481 (Wave D — The Empire). Pitch: "H-Nerve published as an open protocol… The brain has a public API." Wow: a `/dev` portal where anyone registers an agent in 12 lines, a pack in 30, a theme in JSON.*

## Current state (what already exists in the repo, with file paths)

There are **two distinct things both labeled "Phase 20"** in the repo:

1. **The open-intelligence-layer pitch demo (the actual Phase 20 vision) — front-end only, static data.**
   - `lib/protocol/spec.ts` — types (`AgentSpec`/`AgentInput`/`AgentDecision`, `PackSpec`, `ThemeSpec`), the canonical `MIN_AGENT_SOURCE`/`MIN_PACK_SOURCE`/`MIN_THEME_SOURCE` strings, a hardcoded 24-entry `MARKETPLACE_AGENTS` array, and the `OPENAPI_DOC` object. All constants — no behaviour.
   - `app/dev/` — public portal (`layout.tsx` no auth gate), `page.tsx` (typed `Manifesto.tsx`, three pillars), `spec/page.tsx` (manifesto), `marketplace/page.tsx` (SVG orbit + list, reads `MARKETPLACE_AGENTS`), `explorer/page.tsx` (lists ops from `OPENAPI_DOC`, hardcoded curl/response sample).
   - `app/api/protocol/openapi/route.ts` — serves `OPENAPI_DOC` as static JSON (`force-static`, CORS `*`).
   - `lib/protocol/spec.test.ts` — asserts only the static demo invariants (12-line agent, 24 entries, OpenAPI 3.1 shape).
   - **Gap:** `OPENAPI_DOC` advertises `/api/v1/agents`, `/agents/{slug}/decide`, `/packs`, `/themes`, `/brain/iq|insights|plans`. **`app/api/v1/` does not exist** (glob: no files). `defineAgent`/`definePack` appear only inside source-literal strings — there is no SDK, no registry, no persistence (no Agent/Pack/Theme Prisma models), no bearer-token auth, no runtime, no real install counts.

2. **The "company constitution" clauses feature — real and persisted, but a different concept.**
   - `prisma/schema.prisma` §2016 `model ProtocolClause` (tenant-scoped, versioned).
   - `lib/protocol/clauses.ts` (+ `.test.ts`) defaults; `lib/protocol/load.ts` (+ `.test.ts`) scoped read with seed fallback.
   - `app/protocol/page.tsx` + `layout.tsx`, `components/protocol/ProtocolDoc`; `app/api/protocol/route.ts` (GET, any user) and `app/api/protocol/[id]/route.ts` (PATCH, ADMIN, version-bump/upsert).

## Scope (what "shipping this phase" concretely means)

Turn the demo into a thin-but-real protocol so the `/dev` wow moment is honest:
- Persist agents/packs/themes (registry) and make the marketplace read live data instead of the static array.
- Implement the `/api/v1/*` surface the OpenAPI already promises, with bearer-token auth scoped per tenant, stable `trace_id`, and the lifecycle in `/dev/spec` (DRAFT→SHADOW→ACTIVE→DEPRECATED→RETIRED).
- Ship a minimal `defineAgent`/`definePack`/`defineTheme` SDK matching the advertised 12/30-line shapes and a deterministic, side-effect-free `decide()` runner (honors the read-mostly + "every claim cites" + replay invariants).
- Keep `/dev` public; **hard-gate write/register endpoints** behind a token. Rename the constitution feature out of "protocol" namespace, or namespace this as `/dev` + `/api/v1` so the two stop colliding.
- Out of scope: real external publishing, npm package, public sign-up, federation changes.

## Files to touch

- **New:** `app/api/v1/agents/route.ts` (GET list / POST register), `app/api/v1/agents/[slug]/decide/route.ts`, `app/api/v1/packs/route.ts`, `app/api/v1/themes/route.ts`, `app/api/v1/brain/iq/route.ts` — back the OpenAPI doc.
- **New:** `lib/protocol/sdk.ts` (`defineAgent`/`definePack`/`defineTheme`), `lib/protocol/runtime.ts` (deterministic `decide` runner + trace IDs), `lib/protocol/registry.ts` (DB read/write), `lib/protocol/auth.ts` (bearer-token verify, tenant scope).
- **New (Prisma):** `model ProtocolAgent` / `ProtocolPack` / `ProtocolTheme` / `ProtocolToken` in `prisma/schema.prisma`; add the tenant-keyed ones to `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts`) per `docs/ISOLATION.md`.
- **Modified:** `lib/protocol/spec.ts` (export a live-vs-seed marketplace loader), `app/dev/marketplace/page.tsx` + `app/dev/explorer/page.tsx` (read registry; live curl), `lib/protocol/spec.test.ts` (cover the new shapes), seed (`prisma/seed.ts` or `scripts/seed-brain-local.ts`) to plant the 24 demo agents as rows.

## Risks (technical + product, ranked)

1. **Read-mostly boundary (highest).** `decide()` and `/api/v1/*` must never mutate domain data — CLAUDE.md cross-cutting rule #10 + `/dev/spec` invariant #3. A POST that writes is a contract violation.
2. **Tenant isolation.** Public bearer tokens + new tenant-keyed models are a leak surface; every query must go through scoped `prisma`, tokens must bind to one tenant (`docs/ISOLATION.md`).
3. **Determinism/replay.** The spec promises same-input→same-output; non-deterministic agent code or wall-clock/random in the runner breaks the advertised invariant.
4. **Namespace collision (product).** Two "Protocol" features (`/protocol` clauses vs `/dev` intelligence layer) confuse the pitch; failing to disambiguate is a UX/demo risk.
5. **Untrusted code execution.** Running externally-registered `decide()` functions in-process is unsafe; v1 should restrict to vetted/seeded agents, not arbitrary upload.
6. **Scope creep / pitch honesty.** Inflated install/rating numbers in a live marketplace mislead; mark seeded entries clearly (mirror the `fallback` flag in `load.ts`).

## Recommended slice size

- **PR 1 — Registry + persistence (behaviour-preserving).** Add Prisma models + `TENANT_SCOPED_MODELS` entry + `lib/protocol/registry.ts`; seed the 24 demo agents. `/dev` still renders from the array via a loader that falls back to constants (same pattern as `load.ts`). No new public surface yet.
- **PR 2 — Read API + live marketplace.** Implement `GET /api/v1/agents|packs|themes` and `/brain/iq`; switch `marketplace`/`explorer` to read the registry; keep `/api/protocol/openapi` static. Read-only, low-risk.
- **PR 3 — SDK + deterministic decide runner.** `lib/protocol/sdk.ts` + `runtime.ts`; `POST /api/v1/agents/{slug}/decide` for **seeded** agents only; enforce cite + replay + read-mostly. Live curl in the explorer.
- **PR 4 — Token auth + register/lifecycle.** `lib/protocol/auth.ts`, `POST /agents` register, lifecycle transitions; gate writes behind bearer token; disambiguate the `/protocol` clauses naming.
