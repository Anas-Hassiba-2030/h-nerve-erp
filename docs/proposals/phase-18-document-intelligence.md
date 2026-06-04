# Phase 18 — Document Intelligence

## Current state (what already exists in the repo, with file paths)
Phase 18 is largely scaffolded and demo-working in stub mode; the gap is real extraction at scale, persistence of bytes, and tenant isolation.

- **Parser** — `lib/docintel/parser.ts` (+ `parser.test.ts`). `parseDocument()` returns a `ParsedDoc` (kind/title/summary/headline bilingual, `fields`, `clauses`, `ms`). STUB mode routes by filename regex to four canned extractions (contract→LORAN, invoice/lab→MAHA, spreadsheet→ARENA) + generic fallback. LIVE Claude Vision exists and is wired (`parseWithVision`): gated by `visionEnabled()` (`DOCINTEL_USE_VISION === "true"` **and** `llmConfig().enabled`), image/PDF only (`isVisionEligible`), 22MB cap, per-process call cap `DOCINTEL_MAX_VISION_CALLS` (default 50), and falls back to stub on **any** failure. Reuses the brain's LLM config read-only (`../brain/llm`).
- **Entity match (Phase NS-8)** — `lib/docintel/match.ts` (+ `match.test.ts`). Pure, DB-free bilingual fuzzy matcher folding Arabic diacritics/alef/ta-marbuta + dropping company suffixes; `matchDocumentEntities()` links extracted vendor/party names to Supplier/Customer rows.
- **Server actions** — `app/(app)/documents/actions.ts`: `uploadDocument` (creates `Document` PARSING → parse → writes `DocExtraction`/`DocClause`, then best-effort entity match), `commitDocument` (no-op confirm + redirect), `deleteDocument` (soft-delete, MANAGER+).
- **UI** — global drop overlay + reveal-one-at-a-time clause modal in `components/DocumentDropZone.tsx` (mounted app-wide via `components/DeferredOverlays.tsx`, `ssr:false`); ledger list grouped by linked entity `app/(app)/documents/page.tsx`; editorial detail `app/(app)/documents/[id]/page.tsx`; styles `app/(app)/documents/documents.css`.
- **Schema** — `prisma/schema.prisma` lines ~1408–1489: `Document`, `DocExtraction`, `DocClause` all present, incl. NS-8 denormalized match scalars.
- **Env** — `.env.example` documents `DOCINTEL_USE_VISION` / `DOCINTEL_MAX_VISION_CALLS` (also in `.env.railway.template`, `.env.production.example`).

## Scope (what "shipping this phase" concretely means)
The pieces from `PHASES-INTELLIGENCE.md §18` exist; "shipping" = hardening from a single-tenant stub demo to a trustworthy multi-tenant feature:
1. **Tenant isolation fix (blocking).** `Document`/`DocExtraction`/`DocClause` carry a `scope` column defaulting to `"default"` but are **absent** from `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts`), and `actions.ts`/pages query `prisma.document` with no scope filter — so every tenant sees every tenant's documents. Per `docs/ISOLATION.md`, decide tenant-keying and register the models (or hard-justify why not).
2. **Persist bytes.** Today `uploadDocument` deliberately discards file bytes; detail page can't re-render the source. Add storage (disk/object-store) behind an interface, with the "first page renders" animation from the spec.
3. **Make `commitDocument` real.** It currently just redirects; the spec's CTA is "Add to {module}'s ledger" — wire an actual link/record into the matched Supplier/Customer or module ledger.
4. **Vision robustness.** Promote Vision from "wired but off" to verified: real PDF/image fixtures, latency/timeout handling, and confirming the stub-fallback path on cap/error.

## Files to touch (bullet list of concrete new + modified paths)
- **Modify** `lib/workspaceScope.ts` — add `Document` (and resolve `DocExtraction`/`DocClause` via parent) to `TENANT_SCOPED_MODELS`.
- **Modify** `prisma/schema.prisma` — `tenantId`/scope handling per ISOLATION checklist; **new** `prisma/migrations/<ts>_docintel_tenant_scope/`.
- **Modify** `app/(app)/documents/actions.ts` — set scope on create, add `commitDocument` real linking, accept bytes.
- **New** `lib/docintel/storage.ts` — pluggable byte persistence; **modify** `parser.ts` only if signature changes.
- **Modify** `app/(app)/documents/[id]/page.tsx` — render stored source / first page.
- **New** `lib/docintel/*.test.ts` — `commitDocument` linking + scope unit coverage (pure, per `npm test`).
- **Modify** `.env.example` (+ railway/production templates) if storage adds env.

## Risks (technical + product, ranked)
1. **Cross-tenant data leak (HIGH).** Documents are unscoped today; any multi-tenant deploy exposes one tenant's contracts to another. Must fix before any non-single-tenant use.
2. **API spend (HIGH, product).** Vision burns the $10 credit; per MEMORY, never spend without asking. Keep default OFF, honor the call cap, ship stub-first.
3. **Storing arbitrary uploads (MED).** Persisting bytes adds a malware/PII surface and storage-cost question on SQLite/dev; needs an explicit store + size/type guards (25MB already enforced).
4. **Extraction trust (MED, product).** `coerceParsed` already hard-maps model output, but verbatim "quotes" from Vision may hallucinate; surface confidence and keep linking advisory (NS-8 already does).
5. **DOCX/XLSX not vision-eligible (LOW).** Only image/PDF hit Vision; spreadsheets/contracts in Office formats silently use the stub — manage expectations or add a text extractor.

## Recommended slice size (2–4 landable PRs, each behaviour-preserving where possible)
- **PR 1 — Tenant isolation (behaviour-preserving in single-tenant).** Register the three models in `lib/workspaceScope.ts`, add scope/tenantId migration, set scope in `actions.ts`. Pure-unit tests for scoping. Ships the security fix with zero UI change.
- **PR 2 — Real commit + entity ledger link.** Make `commitDocument` write the matched Supplier/Customer link (or module ledger); reflect committed state in list/detail. Additive UI.
- **PR 3 — Source persistence + first-page render.** `lib/docintel/storage.ts`, store bytes on upload, render source on detail page per the spec animation.
- **PR 4 (optional) — Vision verification.** Fixtures + latency/timeout tests for `parseWithVision`; confirm cap/error → stub. No default behaviour change (stays OFF).
