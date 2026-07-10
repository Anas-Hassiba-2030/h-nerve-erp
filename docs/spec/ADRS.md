# H-Nerve — Architecture Decision Records (ADRs)

> **Purpose:** capture each significant, hard-to-reverse decision *once*, with
> its context and consequences, so it is never silently re-litigated. These are
> extracted from the conventions in `CLAUDE.md` and the codebase, promoted to
> immutable numbered records. **ADRs are append-only:** to change a decision,
> add a new ADR that supersedes the old one — don't edit history.
> Owner: platform. Last-updated: 2026-06-02.
> Part of the spec set in `docs/governance/RE-INFRASTRUCTURE-PLAN.md` §3.

Format per record: **Context → Decision → Consequences**. Status is `Accepted`
unless noted.

---

## ADR-001 — iron-session for auth, not NextAuth
**Status:** Accepted.
**Context.** The app needs cookie-based sessions for a bilingual, multi-tenant
ERP. NextAuth brings provider abstractions and DB adapters the product doesn't
need, plus its own opinions on session shape.
**Decision.** Use **iron-session** (`lib/session.ts`) with bcrypt password
hashing (`lib/auth.ts`). `SessionUser` carries `{ id, role, tenantSlug, … }`.
**Consequences.** Full control of the session payload and cookie; no provider
lock-in. The team must hand-roll login/signup (`app/(auth)/*`). Do **not**
introduce a second auth provider without a superseding ADR.

## ADR-002 — String columns + TS unions, never Prisma enums
**Status:** Accepted.
**Context.** The schema began on SQLite (no enum support) and must stay portable.
Role/status/sector/kind/register fields are finite sets.
**Decision.** Model every such field as a **plain `String` column**, with allowed
values as a **TypeScript union** in code (e.g. `Role = "ADMIN" | … `).
**Consequences.** Trivial portability (SQLite→Postgres) and zero migrations to
add a value — but no DB-level constraint, so validation lives in `zod` at the
action boundary. Stored values are always the English uppercase code.

## ADR-003 — The Brain is read-mostly
**Status:** Accepted (the single most important boundary).
**Context.** An intelligence layer that can mutate domain data directly is
unauditable and unsafe to self-tune.
**Decision.** The Brain **proposes; it never writes domain data.** All mutations
go through the existing server actions in `app/(app)/<resource>/actions.ts`. The
brain may write only its **own** tables (graph, narratives, memory, feedback, …).
**Consequences.** The brain is auditable, replayable, and safe to self-improve.
A brain subsystem that needs to change domain data must call a server action,
never `prisma.<domain>.update` directly. This also bounds agentic compound-error
risk (humans/actions stay in the write path).

## ADR-004 — Server Actions are the default mutation surface; `app/api/` is reserved
**Status:** Accepted.
**Context.** Next.js App Router offers both server actions and route handlers.
**Decision.** **CRUD = server actions** (`"use server"`, FormData, zod, scoped
`prisma`, `revalidatePath`, `redirect`). `app/api/` is reserved for what actions
can't do well: streaming/SSE, file exports, public protocol, webhooks, undo.
**Consequences.** Pages stay server components; less client JS; one consistent
contract (see `docs/spec/API-CONTRACTS.md`). Adding ordinary CRUD under
`app/api/` is a smell.

## ADR-005 — Tenant isolation via Prisma `$use` middleware + a pure decision fn
**Status:** Accepted.
**Context.** Multi-tenant data must never leak across tenants, and the logic must
be provable without a DB.
**Decision.** A **pure** function (`lib/workspaceScope.ts`, zero imports) decides
scoping; `lib/db.ts` wires it into Prisma `$use`. Two keys: company-scoped
(`SCOPED_MODELS`, `companyId`) and tenant-scoped (`TENANT_SCOPED_MODELS`,
opaque `tenantId`). `prismaUnscoped` is the explicit escape hatch and every call
site carries `// CROSS-TENANT INTENT:`.
**Consequences.** Isolation is unit-tested with no DB. The null-cookie
pass-through invariant guarantees single-tenant behavior is unchanged. New
tenant-keyed models **must** be added to the right set. See `docs/architecture/ISOLATION.md`
and `docs/spec/DATA-MODEL.md` §2.

## ADR-006 — Arabic-default, RTL, bilingual via a hardcoded dictionary
**Status:** Accepted.
**Context.** The first market is Arabic-speaking; English is secondary. A runtime
i18n service would add ops weight.
**Decision.** **Arabic is the canonical/default locale, RTL.** i18n is a
hardcoded dictionary (`lib/i18n.ts`), cookie-driven (`h_nerve_locale`). Arabic
column (`name`) is source of truth; `nameEn` is secondary.
**Consequences.** No external i18n runtime; fast and offline-safe. Every
user-facing string needs both forms — see `docs/spec/GLOSSARY.md` for locked
translations. RTL must be tested on every surface.

## ADR-007 — One design vocabulary per surface
**Status:** Accepted.
**Context.** `docs/governance/DESIGN-SKILL.md` documents eight aesthetic vocabularies; mixing
them on one surface looks incoherent.
**Decision.** Operator UI = **Heritage Modern**; Admin console = **Sleek
Operator**; Theater = its own editorial register. **Never mix** on one surface.
**Consequences.** Visual coherence; a clear rule for new screens. Pick the
surface's vocabulary and stay inside it.

## ADR-008 — PostgreSQL in production (migrated from SQLite)
**Status:** Accepted (Phase 23).
**Context.** SQLite cannot handle concurrent writes or survive Railway restarts
cleanly; production data needs durability and pooling.
**Decision.** `datasource db` is **PostgreSQL**; migrations live under
`prisma/migrations/`. Railway runs `prisma migrate deploy` pre-deploy. Local dev
may still use SQLite by flipping the provider.
**Consequences.** Production-grade concurrency and backups; pgvector becomes
available (unblocks the RAG memory upgrade — RE-INFRASTRUCTURE-PLAN §2 priority 1).

## ADR-009 — Industry knowledge lives in pluggable packs, not the core
**Status:** Accepted.
**Context.** H-Nerve is industry-agnostic; the first tenant spans 4 sectors and
others must stand up in minutes.
**Decision.** The brain core (graph/simulator/narrator/planner/memory/feedback/
meta) is **domain-agnostic**; domain expertise lives in `lib/brain/agents/*`
packs, enabled per-tenant via `TenantPack`.
**Consequences.** New verticals = add a pack + register agents, no core changes.
Keep domain logic out of the core.

---

## Adding a new ADR
Append the next number. State **Context → Decision → Consequences**. If it
changes an existing decision, mark the old one `Superseded by ADR-NNN` (don't
delete it). Reference the ADR number in the PR that implements the decision.
