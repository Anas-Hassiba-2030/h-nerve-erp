# Proposal — Tenant-isolate `Document` + `Memory` (brain-MCP multi-tenant cutover)

**Status:** PARKED — owner greenlight required. Do **not** build before the trigger below fires.
**Raised by:** brain-MCP adversarial audit, 2026-06-09 (1 critical + 2 high findings, all about the same two models).
**Owner decision:** Anas.

---

## TL;DR

The brain-MCP stdio server is **fail-closed** on two scoping axes (`H_NERVE_MCP_WORKSPACE` = companyId, `H_NERVE_MCP_TENANT` = tenantSlug). But **two models it reads are not tenant-keyed at all** — `Document` and `Memory` have no tenant column and are in none of the scoped-model sets in `lib/tenancy/workspaceScope.ts`. So a "scoped" server still reads **every tenant's** documents and episodic memories.

**This cannot fire today** — the deployment is single-tenant (Hourani Group) and there is no second tenant's data in the DB. It is **safe now, and only now.** The moment a second tenant's documents or memories land in the same database, document-retrieval and episodic-recall leak across tenants.

This doc is the actionable plan to close it — to run **when** multi-tenant goes live, not before.

---

## What's safe today rests on one invariant

> **The production database holds exactly one tenant's `Document` and `Memory` rows.**

As long as that holds, the gap is unobservable. The in-app path already reads documents group-wide (the `scope` arg defaults to the client-controlled `"default"`), so this is a **pre-existing property of a single-tenant prototype**, not something the MCP introduced. The MCP only *advertised* an isolation (the fail-closed gate) that these two models don't honor — now corrected in-code to say so plainly (`lib/brain/mcp/scope.ts`, `lib/brain/documents.retrieve.ts`, `lib/brain/ragGuard.ts`).

**Partial guard already shipped (commit `419f645`):** the in-app tool loop now *forces* the request `session.scope` onto `retrieveDocuments` (`lib/brain/orchestrator.ts`), so the model can no longer widen or omit the document scope. That fences by the free-text business-unit label — it is **not** a tenant boundary. The stdio MCP door has no request scope to forward, so it stays group-wide for these two models.

---

## Why it's deferred (not fixed inline)

Doing it now would mean a **prod Postgres schema migration** (Railway is the production trunk) to close a leak that **cannot manifest** in a single-tenant deployment. That is against the standing doctrine:

- **Schema is prod source of truth** — migrations are not casual.
- **Scale/multi-tenancy is explicitly parked** until after pitch/payment.
- **Refactors are behaviour-preserving** — this changes write paths + seeds.
- **Prototype, not production** — harden the scenario the product *has*, not one it doesn't yet.

---

## The migration (when greenlit)

Land as its own focused PR, behind a migration, fully green before merge.

### 1. Schema — add the tenant column to both models
`prisma/schema/documents.prisma` (`Document`) and `prisma/schema/brain.prisma` (`Memory`):

```prisma
tenantId String?   // nullable for back-compat; backfilled, then required
@@index([tenantId])
```

Keep nullable through the transition, backfill existing rows to the single live tenant, then tighten to required in a follow-up migration.

### 2. Register in the scope sets
`lib/tenancy/workspaceScope.ts` — add both to `TENANT_SCOPED_MODELS` (the `tenantSlug`/`tenantId` axis, same as `Booking`, `Crop`, `BrainInsight`, `CouncilDiscussion`). The scoped Prisma middleware then fences every `Document`/`Memory` query automatically.

### 3. Stamp `tenantId` on every write
- `app/(app)/documents/actions.ts` (`uploadDocument` → `prisma.document.create`).
- The memory writer(s) (`lib/brain/memory.live.ts` / `seedMemories.ts` and any reflector that persists memories).
- Every seed that creates documents/memories (`scripts/seed/**`, `lib/brain/seed*.ts`).

### 4. MCP door forwards the resolved tenant
`scripts/ops/brain-mcp.ts` already resolves `H_NERVE_MCP_TENANT`. With both models in `TENANT_SCOPED_MODELS`, the scoped client fences them once the request/env tenant is active — verify the env fallback (`lib/tenancy/tenancy.ts` `getActiveTenantSlug`) covers the stdio path.

### 5. Optional defense-in-depth (now actually meaningful)
With a real tenant field on `DocHit`/memory rows, wire the dormant `ragGuard.enforceScope(hits, activeTenant)` into `documents.retrieve` + the recall path. Today it's a no-op (no field to filter on) and is left **unwired by design** — this is when it earns its place.

### 6. Tests
- A scoped query returns only the active tenant's documents/memories.
- A second-tenant row is **never** returned when scoped.
- Omitting scope no longer returns foreign-tenant rows (middleware fences regardless).
- The stdio MCP server, run scoped, isolates both models.

---

## The decision

| Option | When | Cost |
|--------|------|------|
| **Keep parked** (default) | Single-tenant stays true through pitch/pilot | Zero. Limitation documented in-code + here. |
| **Greenlight the migration** | A 2nd tenant's docs/memories will share the prod DB | ~1 focused PR: 2 schema migrations + backfill, ~5 write sites, ~6 tests. |

**Trigger to revisit:** before onboarding any second tenant whose `Document`/`Memory` rows land in the shared production database. Until then, the single-tenant invariant holds and this stays parked.

---

*Cross-refs: `lib/brain/mcp/scope.ts` (KNOWN LIMITATION note), `lib/brain/documents.retrieve.ts` (TENANCY note), `lib/tenancy/workspaceScope.ts` (`TENANT_SCOPED_MODELS`), `docs/architecture/ISOLATION.md` (isolation checklist), memory `brain-hardening-2026-06`.*
