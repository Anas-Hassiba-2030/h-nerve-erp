---
owner: Anas Hasiba
last-updated: 2026-07-09
---

# H-Nerve — Build Plan (the single forward plan)

This is the **one ordered forward plan** for the codebase. It reconciles three
sources into a single sequence:

1. The still-open items of `docs/PRODUCTION-ROADMAP.md` (now historical).
2. The Phase 27 / 27b / 28 backlog in `docs/PHASES-INTELLIGENCE.md`.
3. The active **master-brief campaign** (legibility → VAOC → docs/IA → hardening).

**Cross-reference:** current engineering health lives in `docs/STATUS.md`.
Historical plans and phase write-ups live in `docs/PRODUCTION-ROADMAP.md` and
`docs/PHASES-INTELLIGENCE.md` — do not plan from those; plan from here.

---

## Now — master-brief campaign (in flight)

### Batch 1 — Legibility ✅ landing
- **Root hygiene (PR #281)** — front-door README, relocate stray root files, delint worktrees. *Why:* a stranger (or fresh session) orients in seconds. *Lives:* repo root.
- **Docs spine (this branch)** — `docs/BUILD-PLAN.md` (this file) + `docs/STATUS.md` + historical banners on superseded plans. *Why:* one forward plan, one health page, no stale truth. *Lives:* `docs/`.

### Batch 2 — VAOC: the 7-department agent company
- **Department heads + orchestrator** — seven `.claude/agents/` department-head agents plus an orchestrator that routes work between them, documented in `docs/VAOC.md`. *Why:* turn the ad-hoc subagent roster into a structured agent company that runs the repo. *Lives:* `.claude/agents/`, `docs/VAOC.md`; blueprint at `docs/proposals/VAOC-BLUEPRINT.md`.

### Batch 3 — Docs consolidation + IA fixes
- **Docs foldering** — consolidate the ~28 loose `docs/*.md` files into `docs/{architecture,ops,brain,phases}/`. *Why:* the same "one folder per pillar" doctrine that fixed `lib/` and `scripts/`. *Lives:* `docs/`.
- **Split the System orrery group** — personal utilities (profile, preferences, etc.) move out of the System orbit into the user menu. *Why:* the orbit should hold destinations, not settings. *Lives:* `docs/design/orrery/` source → `scripts/build/build-orrery.mjs` → `public/`; `src/lib/orrery/routeMap.ts`.
- **Home the 19 orphan routes** — the 13 ERP back-office routes (`/admin/imports`, accounts, journal, products, movements, warehouses, POs, SOs, customers, suppliers, mappings, …) get a **Core / Back-office hub** landing page; remaining orphans get homes or retirement. *Why:* today they're deep-link-only (Phase 27b's exact complaint). *Lives:* new `src/app/(app)/core/` hub + orrery node — this IS the first slice of Phase 27b "The Core".

### Batch 4 — Hardening
- **`/api/converse` zod schema** — validate the conversational-brain request body. *Why:* the highest-traffic AI endpoint currently trusts its input. *Lives:* `src/app/api/converse/`, `src/lib/brain/converse.ts`.
- **Per-tenant LLM budget** — meter LLM spend per tenant; on breach, degrade gracefully to STUB mode instead of erroring. *Why:* closes PRODUCTION-ROADMAP Phase D/G's open "AI rate-limit + cost-cap" item. *Lives:* `src/lib/brain/llm.ts` seam + tenancy layer.
- **Prisma pooling prep** — pgbouncer-ready config (`directUrl` for migrations, pooled `DATABASE_URL` for runtime). *Why:* Railway Postgres connection headroom before any pilot load. *Lives:* `prisma/schema/schema.prisma`, `src/lib/db/db.ts`, env docs.
- **Dashboard query collapse + caching** — merge the dashboard's parallel query fan-out and cache hot aggregates. *Why:* the heaviest page; biggest perceived-speed win per hour. *Lives:* `src/app/(app)/dashboard/`.

### Carried forward from PRODUCTION-ROADMAP (still open, scheduled here)
- **Secret rotation** (chat-shared API key + DB credential) — do with Batch 4. Ops task, no code.
- **DB backups + separate dev/staging/prod** (Phase B remainder) — with Batch 4 pooling prep. *Lives:* Railway config.
- **Role checks on sensitive create/update** (Phase D remainder) — with Batch 4. *Lives:* `src/lib/auth/` (`requireRole`), resource `actions.ts`.
- **Error monitoring (Sentry) + structured logging + broader CRUD tests** (Phase E remainder) — with Batch 4 / opportunistically. *Lives:* app root, `lib/**/*.test.ts`.
- **Real document parser (Claude Vision)** (Phase F) — currently a stub. Schedule after the Phase 27 wave unless a pilot needs it sooner. *Lives:* `src/lib/docintel/parser.ts`.
- **Real third-party integrations** (Phase F) — connectors are catalog UI today; build only the ones a pilot actually needs. *Lives:* `src/lib/integrations/`.
- **Load testing, security review / pen-test, data export & retention** (Phase G) — pre-pilot gate, after hardening. Ops + `src/app/api/export/`.

---

## Next — Phase 27 module wave (ERP modules)

Per the gap ranking in `docs/ERP-KNOWLEDGE-BASE.md` (lands on main with the
Phase 27 PRs): 🔴 CRM / HR / Assets / Maintenance first, then 🟠. Each module
follows the canonical pattern: tenant-scoped Prisma models + server actions +
Heritage Modern pages + a brain agent pack + an orrery/Core-hub entry.

1. **CRM — shipped as draft PR #280** (`feat/phase27-crm`): Lead/Opportunity models + SSR Kanban at `/crm` + SalesPipelineExpert. *Action:* review + land.
2. **HR (WFM + HRM, payroll deferred)** — attendance/shifts/leave (WFM) + employee lifecycle/org (HRM); payroll explicitly out of the first slice. *Lives:* WIP parked on `feat/phase27-hr` (`prisma/schema/hr.prisma` started).
3. **Assets** — fixed-asset register + depreciation basics; clearest remaining 🔴 gap.
4. **Maintenance** — work orders against assets (pairs naturally with #3).
5. **Manufacturing (MRP-lite)** — generalize dairy batches into BOM/production orders.
6. **Warehouse (WMS depth)** — bins/pick/pack on the existing warehouses.
7. **Project** — task/gantt depth on the existing future-projects.
8. **QMS** — quality/compliance on top of documents + protocol clauses.
9. **Phase 27b "The Core" polish** — as modules land they tile into the Core hub (started in Batch 3); polish imports + module screens to dashboard standard.

---

## Later — design tracks & scale

- **Login redesign** — cinematic "living nervous system" login, built in **Claude Design** (coordinate, don't overwrite). Brief: `docs/prompts/LOGIN-REDESIGN.md`; page: `src/app/(auth)/login/`.
- **Phase 28 — The Companion ("the soul")** — v1 shipped 2026-06-05; further personality/reaction polish is backlog, explicitly **after** the login redesign sets the visual language. Spec: `docs/PHASES-INTELLIGENCE.md` § Phase 28.
- **pgvector at scale** — move embedding retrieval from in-process cosine ranking to Postgres pgvector when the document/graph corpus outgrows in-memory. *Lives:* `src/lib/brain/embeddings.ts` / `retriever.ts` seam; schema addition.

---

## Where things are tracked

| Question | Read |
|---|---|
| What do we build next? | **This file.** |
| Are we green? What's the health? | `docs/STATUS.md` |
| Why did we plan it this way historically? | `docs/PRODUCTION-ROADMAP.md` (historical), `docs/PHASES-INTELLIGENCE.md` (phases 1–28) |
| Rebuild/re-infrastructure philosophy | `docs/RE-INFRASTRUCTURE-PLAN.md` |
| ERP module taxonomy + gap ranking | `docs/ERP-KNOWLEDGE-BASE.md` (with the Phase 27 PRs) |
