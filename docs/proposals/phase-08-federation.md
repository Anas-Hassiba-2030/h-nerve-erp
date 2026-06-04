# Phase 8 — Federation

Spec: `docs/PHASES-INTELLIGENCE.md` §"Phase 8 — The Cross-Org Federation" (lines 208–228). Multi-tenant federated learning: anonymized patterns flow between opted-in orgs, raising every brain's intelligence floor. Aesthetic = Quiet Authority, single copper accent, signature 700ms ochre scan-line on benchmark load.

## Current state (what already exists in the repo, with file paths)
Most of Phase 8 already ships:
- **Data models** — `prisma/schema.prisma` defines `FederationOptIn` (status, agreedToTerms/At/ById, `shareModules`, `budgetUsed`/`budgetMax`), `FederationPeer` (anonymized `peerToken`, `tier`, `contributionsJson`), `FederationPattern` (bilingual `statementEn`/`Ar`, `peerCount`, `averageDelta`, `confidence`, `kAnonymity`, `noiseEpsilon`, `visibleTo`, `expiresAt`).
- **Aggregator** — `lib/brain/federation.live.ts`: `getOptIn`/`enableFederation`/`disableFederation`, and `aggregate()` which buckets peer contributions by (tier, patternKey), enforces **K=5** (`K_ANONYMITY`), bounds confidence by sample size, TTL=30d, and drafts bilingual statements via `draftFederationStatement` (LLM with deterministic stub fallback). Constants `NOISE_EPSILON=0.5` exist but noise is described, not actually applied to the mean.
- **UI** — `app/(app)/brain/benchmarks/page.tsx` (+ `benchmarks.css`): contract opt-in screen, KPI strip, benchmark rows, three privacy-guarantee panels; ported to the Claude Design "NIGHT" reference. Linked from `components/Sidebar.tsx:159` ("معايير النظراء"/"Benchmarks").
- **Server actions** — `app/(app)/brain/benchmarks/actions.ts`: `optInFederation`, `optOutFederation`, `refreshFederation`, `seedFederationPeers`, `clearFederation` — each `requireUser()` + `revalidatePath`.
- **Seed** — `lib/brain/seedFederation.ts` (14 synthetic peers across 4 tiers); invoked by `scripts/seed/seed-brain-local.ts`, `seed-brain-all.ts`, counted in `scripts/verify/count-brain.ts`.
- **Privacy/security seam** — `lib/brain/ragGuard.ts` (injection scrub + `enforceScope`) explicitly cites the federation aggregator as a cross-tenant chokepoint.

## Scope (what "shipping this phase" concretely means)
Close the gap between "demo works" and "spec-complete + trustworthy":
1. **DP budget actually enforced.** `budgetUsed`/`budgetMax` are stored and shown (page reads `optIn.budgetUsed`) but never decremented or checked. Make `aggregate()` consume budget and refuse/pause when exhausted; add a refresh window that resets it.
2. **Real noise.** Apply Laplace noise (`noiseEpsilon`) to `averageDelta` instead of publishing the raw mean — the file comment promises this; the code doesn't do it.
3. **Signature animation.** Add the 1px ochre scan-line crossing each benchmark card over 700ms on load (absent from `benchmarks.css` today — only `brthink` keyframe exists).
4. **Named-file alignment (optional).** Spec names `lib/brain/federation.ts` + `lib/brain/anonymize.ts`; today the logic lives in `federation.live.ts`. Either extract a pure `anonymize.ts` (k-anonymity + DP, unit-testable) or note the deviation in the README table (`lib/brain/README.md:45`).
5. **Brain conductor + cron.** `Brain.ts` does not route to federation, and there is no scheduled `aggregate()` (only manual button + seed scripts). Add an optional surfacing path and a refresh trigger.

## Files to touch
New:
- `lib/brain/anonymize.ts` — pure k-anonymity + Laplace-DP helpers (extract from `federation.live.ts`), with `lib/brain/anonymize.test.ts`.
- `app/api/cron/federation/route.ts` (or a `scripts/` job) — periodic `aggregate()` + budget-window reset.

Modified:
- `lib/brain/federation.live.ts` — call anonymize helpers; decrement/guard `budgetUsed`; apply noise to `averageDelta`.
- `app/(app)/brain/benchmarks/benchmarks.css` — add `@keyframes` copper/ochre scan-line + per-card trigger.
- `app/(app)/brain/benchmarks/page.tsx` — wire scan-line class; surface real budget state/exhaustion.
- `lib/brain/Brain.ts` — optional federation surfacing in `BrainAnswer`.
- `lib/brain/README.md` — reconcile §45 table with actual filenames.
- `prisma/schema.prisma` — only if budget-window/lastRefresh fields are needed (then `db:push`).

## Risks (technical + product, ranked)
1. **Privacy claims vs reality (highest).** The UI promises "mathematically perturbed so no pattern can be traced back" and an enforced budget, but noise isn't applied and budget isn't enforced. In a pitch this is a credibility/legal risk — fix before any real cross-tenant data flows.
2. **No real multi-tenant data path.** `FederationPeer` is seeded synthetically; there's no inbound/outbound peer protocol. Shipping "federation" with only `seedFederation.ts` is a demo, not a live network — set expectations or build the wire.
3. **Cross-tenant isolation drift.** `aggregate()` reads peers via the scoped `prisma` and `enforceScope(undefined)` is the intentional cross-tenant escape hatch; any change must keep a `// CROSS-TENANT INTENT:` comment per `docs/ISOLATION.md` or it silently leaks.
4. **DP correctness (medium).** Naive Laplace on a small sample can flip signs/mislead; needs sensitivity bounds + tests, not a one-liner.
5. **LLM cost/stub drift (low).** `draftFederationStatement` calls `callLlm`; cron-driven aggregation could spend API credit — keep stub-mode default and cache by `clusterKey`.

## Recommended slice size
- **PR 1 — Privacy core (behaviour-preserving on UI).** Extract `anonymize.ts` + tests, apply Laplace noise, enforce/decrement `budgetUsed` with a guard in `aggregate()`. No UI change yet; reconcile README.
- **PR 2 — Trust UI.** Copper/ochre 700ms scan-line in `benchmarks.css`, surface real budget exhaustion state on `page.tsx`. Pure presentation.
- **PR 3 — Scheduled refresh + Brain seam.** Cron route calling `aggregate()` + budget-window reset; optional `Brain.ts` surfacing. Additive, gated.
- **PR 4 (optional) — Live peer protocol.** Real inbound/outbound contribution exchange replacing synthetic seed; largest, ship last behind a flag.
