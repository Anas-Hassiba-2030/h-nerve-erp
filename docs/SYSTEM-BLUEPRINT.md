# SYSTEM BLUEPRINT — how to build a company-grade system from scratch

> This is the **reusable playbook** behind H-Nerve ERP, written generically so a
> fresh team (or a fresh Claude session) can stand up a new production-grade
> system on ideal foundations. It encodes the architecture, stack choices,
> security baseline, and hard-won lessons of this codebase. When asked to
> design, architect, or bootstrap a new system, **read this first and build
> against it.**
>
> Companion docs: `docs/BLUEPRINT.md` (the Brain intelligence-layer pattern),
> `docs/MAP.md` (this repo's file map), `docs/ISOLATION.md` (multi-tenancy
> checklist), `docs/DEPLOYMENT.md` (deploy specifics).

---

## 1. Core principles

1. **Simple, direct, conventional — never clever for its own sake.** Tidiness
   comes from a coherent conventional structure plus aggressive removal of
   cruft, *never* from fighting framework conventions.
2. **Respect framework conventions — they ARE the clean layout.** A senior
   engineer's repo root holds ~15 mandated config files (`package.json`,
   `tsconfig.json`, framework config, `.env*`, deploy config). These cannot
   move; that is not clutter, it is the floor.
3. **Verified at every step.** Nothing merges red. Typecheck + tests + lint
   must pass, and for anything that can break the build, the build must pass
   too — *on the real deploy target's terms*, not just locally.
4. **Read-mostly intelligence.** Any AI/automation layer proposes; it does not
   mutate the database of record directly. Mutations go through the same
   audited write path as the UI.
5. **Self-documenting.** A future session should understand the whole system
   from the docs alone. One canonical "what this is" doc (`CLAUDE.md` /
   `README.md`), one file map, one blueprint (this file).
6. **Secrets never touch source.** No keys/tokens in code, comments, commits,
   or PR text. Only `.env*.example` templates are committed.

---

## 2. Recommended stack (proven here, and *why*)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router)** | Server Components keep data on the server; one deploy artifact for FE+BE; server actions remove most API boilerplate. |
| Language | **TypeScript, strict** | The typechecker is your cheapest, fastest test. A migration that compiles is 90 % done. |
| ORM / DB | **Prisma + Cloudflare D1** (prod), `@prisma/adapter-d1` via the Worker's `DB` binding | Serverless SQLite at the edge, zero DB ops. Local dev/seeds/scripts use `@prisma/adapter-libsql` over a file DB — same schema, same client, different adapter. **D1 has no interactive transactions** (`$transaction` callbacks run non-atomically) — design multi-row writes around that (§ conventions below), don't assume Postgres transaction semantics. |
| Auth | **Cookie session (`iron-session`) + `bcryptjs`** | No heavyweight auth framework; sealed stateless cookie; roles as a plain string column + TS union (portable across DBs). |
| Styling | **Tailwind + a small set of brand classes** | Reuse named classes (`.btn`, `.card`, `.kpi`) over utility soup; theme via CSS-variable overrides at the route-group root. |
| Deploy | **Cloudflare Workers** (`wrangler`, static assets + Worker in one deploy) | Edge-native, pairs with D1 with zero network hop. **Static assets are served BEFORE the Worker runs** — a `public/<path>` that collides with an app route silently shadows it (auto-served `index.html`); never let a static folder share a path with a route. Deploy is a manual/CI-triggered `wrangler deploy`, not a git-push auto-deploy — know which one your CI actually runs. |
| Tests | **Vitest** (pure unit) | Fast node-env suite over the logic layer; no DB/network/runtime. |
| Intelligence | **MCP tool registry + orchestrator loop** | Typed tools fronted by an LLM tool-loop; same tools exposed over stdio MCP. See `docs/BLUEPRINT.md`. |

**Pin your runtime.** Set `engines.node` in `package.json` to the framework's
minimum (e.g. `">=20.9.0"` for Next 16). Nixpacks/most builders read it. The
single worst deploy bug in this project: a major framework upgrade (Next 14→16,
which dropped Node 18) shipped green through CI but **failed every build on the
deploy target** because no Node version was pinned — and CI didn't build. See
§6.

---

## 3. Architecture blueprint (layered)

```
presentation     →  Server Components render; Client Components only for interactivity
routing/edge     →  middleware/proxy: auth gate, RBAC, rate-limit, cookie routing
write path       →  Server Actions (default) ; API routes only for streaming/export/webhooks
services/domain  →  one folder per pillar under lib/ ; pure cores + .live siblings that touch IO
data             →  Prisma scoped client ; soft-delete ; tenant scoping in one middleware
intelligence     →  read-mostly layer that proposes via the write path, never writes directly
```

Rules that keep this honest:
- **Server Actions are the default** for CRUD (`<resource>/actions.ts`,
  `"use server"`): validate with a schema, write via the ORM,
  revalidate/redirect. Reach for an API route only when an action can't do the
  job (SSE, file export, public protocol, webhooks).
- **One enforcement point** for auth/RBAC (the `middleware`/`proxy` file). Safe
  by default: ship inert behind a flag, validate, then flip.
- **Pure core + `.live` sibling.** Keep each subsystem's logic pure and tested;
  isolate DB/LLM calls in a sibling file. The core stays readable and unit-testable.
- **String columns + TS unions over DB enums** for role/status/sector — keeps
  the schema portable to the dev DB and migrations trivial.

---

## 4. Folder skeleton (ready to copy)

```
project-root/
├── src/                      # ALL source lives here (src-directory convention)
│   ├── app/                  #   App Router: route groups (auth)/(app)/(admin)/…
│   ├── components/           #   grouped by domain, not file type
│   ├── lib/                  #   one folder per pillar — NO loose files at lib root
│   └── proxy.ts              #   edge middleware (auth/RBAC/rate-limit)
├── prisma/                   # schema (folder layout) + migrations + seeds
├── scripts/                  # ops/ seed/ verify/ build/ — never a flat dump
├── docs/                     # ALL docs: this blueprint, MAP, deploy, security
├── public/                   # static assets
├── .github/                  # CI workflows
└── [root config]             # package.json, tsconfig.json, framework + deploy config,
                              # .env* templates, .gitignore  — MANDATED at root, cannot move
```

Mandated-at-root files (every framework project has them; moving breaks the
build): package manager manifests, `tsconfig.json`, framework config,
PostCSS/Tailwind config, lint/test config, `.env*`, deploy config, `.gitignore`.
The `@/*` import alias maps to `./src/*` so source moves never touch imports.

**One folder per pillar — everywhere.** `lib/`, `components/`, `scripts/` are
domain folders, not flat dumps. A new file lives inside the pillar it serves.

---

## 5. Security baseline (the minimum every system ships with)

- **Auth & RBAC:** single enforcement point; protected routes default-deny;
  roles checked server-side. No sensitive endpoint unauthenticated.
- **Secrets:** zero in source or git history; validated at startup; public
  (`NEXT_PUBLIC_*`) vs server-only vars strictly separated. Compare secrets in
  **constant time** (`crypto.timingSafeEqual` with a length pre-check) — never
  `===`.
- **Input:** validate every server-action / route input with a schema; ORM
  parameterized queries only (no string-built SQL); XSS-safe rendering.
- **Headers/transport:** HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  a real CSP, cookie flags (`httpOnly`/`secure`/`sameSite`).
- **Rate-limit** auth and write endpoints.
- **Dependencies:** keep `npm audit` clean of *high* findings; a major-version
  upgrade to clear runtime CVEs is worth the migration cost — schedule it as its
  own PR.

---

## 6. Tooling & CI baseline

- **Green gate before every merge:** typecheck, unit tests, lint. For changes
  that can break the build, **build locally too** — and know exactly what your
  CI does and does NOT run.
- **CI ≠ the build.** If CI only runs typecheck + tests (cheap, fast), then the
  *deploy target* is your first real build. A break that compiles but fails to
  build (Node-version incompat, config drift, OOM) ships green and dies on
  deploy. Mitigate: pin `engines.node`, and run `next build` locally before any
  framework-version or layout change.
- **PRs only — never push to the trunk.** Branch from the up-to-date trunk, open
  a PR, let CI go green, squash-merge. The trunk is the production line.
- **Behaviour-preserving refactors.** Moving/renaming must not change behaviour;
  rewire every importer in the same commit and prove it with typecheck.
- **Env-template discipline:** one canonical `.env.example`, well-commented,
  placeholders only. Delete redundant templates.
- **Lessons become instructions.** Anything a future session would otherwise
  re-learn (a moved path, a build trap, a deploy gotcha) gets written into the
  canonical doc so it is never re-debugged.

---

## 7. MCP & subagent scaffolding (intelligence from day one)

- **Front the intelligence layer with a typed tool registry**, run it with an
  **orchestrator tool-loop** (LIVE) and a **single-shot path** (STUB / zero-cost
  local), and expose the *same* tools over a **stdio MCP server**
  (tenant-scoped). No god "conductor" class — tools + loop.
- **STUB mode by default** locally: the system runs with zero API spend; flip a
  key to go LIVE. Never spend paid credits without explicit go-ahead.
- **Subagents = one owner per pillar.** Keep `.claude/agents/*` briefs accurate
  to the current layout (stale paths steer future work into dead ends). A
  registry doc (`docs/SUBAGENTS-AND-MCP-CATALOG.md`) lists every agent + MCP:
  name, purpose, trigger, location.

---

## 8. Bootstrap checklist (stand up a new system, in order)

1. **Scaffold** the framework app; immediately move source under `src/`, set the
   `@/*` → `./src/*` alias, and **pin `engines.node`** to the framework minimum.
2. **Configure the ORM:** schema-folder layout, prod DB provider committed, a
   documented dev flip for speed. Migrations are the source of truth.
3. **Auth + RBAC** behind one enforcement point, shipped inert behind a flag.
4. **One pillar, end-to-end** as the canonical CRUD pattern (list/create/edit/
   delete via server actions + a shared page header). Mirror it for every later
   resource. If the system must serve more than one company/industry, decide
   the module catalog (§9) here, before pillar 2 — retrofitting per-module
   gating onto ungated routes is a bigger job than gating them from the start.
5. **Security baseline** (§5) wired before the second feature, not after.
6. **CI green gate** (§6) + a `.env.example` + a clean `.gitignore`.
7. **Docs spine:** canonical "what this is" doc, a file map, this blueprint, a
   deploy doc. Cross-link them.
8. **Intelligence layer** (§7) last, as a read-mostly bolt-on.

**Pitfalls (learned the hard way here):**
- No pinned Node version → green CI, dead deploy on a major framework bump.
- Async framework APIs (e.g. `cookies()`/`headers()` going async) cascade
  `await` through every caller — budget for it on framework upgrades; a codemod
  + the typechecker drive it to completion.
- CI that doesn't build hides build breaks until production.
- Stale doc/agent paths after a reorg silently misdirect the next session.
- A file literally named for "secrets" trips secret scanners — name docs plainly.
- On an edge SQLite target (D1 or similar) with no interactive transactions: a
  multi-row write done as several `$transaction` array items is several
  separate round trips, not one atomic unit — an interruption mid-write can
  leave a real partial state (e.g. a ledger posted before its guard row
  exists, so a retry double-posts). Prefer one `createMany` + a single
  atomic status-flip `UPDATE` (write DRAFT, then flip to POSTED) over
  per-row creates in a transaction array.

---

## 9. Universal module catalog (multi-industry / multi-company blueprint)

A single system serves radically different companies (a hotel group, a dairy
producer, a farm, a school, a repair shop, a professional-services firm) the
same way SaaS ERPs like Daftra do it: **one shared module catalog, per-tenant
toggles, gated navigation** — not a bespoke rebuild per company. This section
is the reusable spec for that; §7 already gives H-Nerve's *intelligence*
layer this shape per-vertical (`agents/HospitalityExpert.ts` etc.) — this
generalizes the same idea to the whole ERP surface, not just the brain.

### 9.1 Derive the catalog from business-shape axes, don't just copy a menu

The reason a Daftra-style catalog transfers to "any company alive" isn't the
list of 33 modules — it's that the list is *generated* from a small set of
yes/no/both axes about how the business operates. Capture these on tenant
setup (mirrors the "Account Information" step every such system asks first):

| Axis | Values | Drives |
|------|--------|--------|
| Sells | goods / services / both | Inventory+Purchasing on vs off; Work Orders/Time Tracking on vs off |
| Client type | B2B / B2C / both | Client Follow-Up + Loyalty vs raw Invoicing |
| Invoicing | one-off / recurring / both | Subscriptions/Installments module |
| Fulfillment shape | make / resell / rent-out / any combo | Manufacturing vs plain Inventory vs Rental & Lease Contracts |
| Branch count | single / multi | Branches add-on, per-branch stock/HR scoping |
| Jurisdiction | which e-invoicing/tax regime | The one country-specific compliance module (e.g. Jordan's e-invoice) |

A fresh company answers these axes once; the catalog below is what gets
offered, pre-filtered, from that answer — not a flat menu the owner must
puzzle through cold.

### 9.2 The catalog (Daftra-shaped, industry-neutral)

Seven departments, each a toggle group. `requires` names the module keys a
toggle needs already-on before it can be enabled — **encode this as data, not
UI copy**: a module enabled with a missing dependency produces an incoherent
system (POS ringing sales with no Inventory to decrement is the concrete
failure mode).

```
sales:            sales, pos [requires: inventory], sales-targets-commissions,
                   installments, offers, insurance, loyalty-points,
                   e-invoice-<jurisdiction>
inventory-purchasing: inventory, purchase-cycle
accounting:        finance, chart-of-accounts [requires: finance],
                   cheque-cycle [requires: finance]
operations:        work-orders, rental-unit-mgmt, lease-contracts
                   [requires: rental-unit-mgmt], bookings-mgmt,
                   time-tracking, manufacturing [requires: inventory,
                   work-orders], workflow-automation
crm:               clients, client-follow-up [requires: clients],
                   membership [requires: clients], client-attendance
                   [requires: clients], points-credits
hr:                employees, requests [requires: employees],
                   payroll [requires: employees], employee-attendance
                   [requires: employees], org-structure [requires: employees]
add-on:            sms, shop-front [requires: sales, inventory], branches
```

Map to H-Nerve's existing verticals as a sanity check, not a 1:1 translation:
hospitality ≈ bookings-mgmt + pos + clients; dairy/agri ≈ inventory +
manufacturing + purchase-cycle; education ≈ membership + client-attendance +
employees. The catalog is finer-grained than industry packs on purpose — a
hotel and a farm both want `employees` + `payroll`, but only one wants
`bookings-mgmt`.

### 9.3 Where this plugs into the existing schema

`prisma/schema/tenancy.prisma` has `TenantPack { tenantId, packKey, enabled }`,
unique on `(tenantId, packKey)`. It was industry-grained (`hospitality | dairy
| agri | education | finance`) with a single write-only consumer
(`scripts/seed/seed-demo.ts`) — nothing read it for gating, so going
module-grained was a data-contract change, not a breaking one. **Shipped:**

1. **`src/lib/tenancy/moduleCatalog.ts`** — the `MODULE_CATALOG` constant
   (single source of truth: key, department, labelEn/labelAr, `requires:
   ModuleKey[]`), `MODULES_BY_DEPARTMENT` *derived* from it (same principle
   as `INTEL_SUBGROUPS.flatMap` — never hand-list the same catalog twice),
   plus the pure functions `canEnableModule()` and `resolveEnabledModules()`
   that enforce the `requires` edges. Covered by
   `src/lib/tenancy/moduleCatalog.test.ts` (13 tests: catalog integrity, the
   POS-needs-Inventory case, transitive cascade-blocking, two full
   tenant-shaped module sets).
2. `TenantPack.packKey` now holds a module key from that catalog (schema
   comment updated; column/constraint unchanged — no migration needed since
   the type stays `String`).
3. `scripts/seed/seed-demo.ts` seeds real module-grained sets per tenant
   (hospitality: `sales, pos, inventory, clients, …`; dairy:
   `inventory, purchase-cycle, manufacturing, …`) and asserts
   `resolveEnabledModules(tenant.packs)` reports nothing `blocked` *before*
   the DB round trip — the seed cannot silently write an incoherent tenant.

**Shipped (second pass):**

4. `toggleTenantModule()` in
   `src/app/(admin)/admin/tenants/actions.ts` — the toggle server action.
   Calls `canEnableModule()` on enable (blocks + toasts the missing
   dependency) and the new `dependentsOf()` on disable (blocks + toasts
   which enabled module still needs it) — enforced in **both** directions,
   not just enable. This is exactly the failure mode Daftra's own UI shows
   uncaught: one screenshot has "Clients Loyalty Points" labeled
   **Deactivated** next to a toggle rendered on — a label and a toggle that
   are two separate booleans and can drift. Here the label is always
   derived from the single `enabled` column; there is no second boolean to
   drift.
5. `src/app/(admin)/admin/tenants/[id]/modules/page.tsx` — the admin
   settings page, one card per department via `MODULES_BY_DEPARTMENT`, one
   row per module, a real toggle (zero client JS — each row is its own
   `<form>` posting to the action above). The tenant detail page's old
   "Packs" section (`[id]/page.tsx`) read the *industry* `PACK_CATALOG`
   against now-module-keyed `TenantPack` rows — always showed 0 enabled
   post-migration. Replaced with a count + link to the new page.
6. **The seam this surfaced:** `createTenant()`'s wizard still wrote raw
   industry strings (`hospitality`, `dairy`, …) as `packKey` — those were
   never valid `ModuleKey`s and would have rotted as orphan rows next to the
   real module keys the seed script and the toggle action write. Fixed by
   adding `STARTER_MODULE_BUNDLES` + `resolveStarterModules()` to
   `moduleCatalog.ts` — the wizard's 5 industry checkboxes now expand to
   their starter module bundle (deduplicated, `requires`-resolved) before
   the `TenantPack` write, so every write path into that table uses the same
   key space. Every module now added is covered by
   `moduleCatalog.test.ts` (bundle-coherence + toggle-guard tests).

**Shipped (third pass) — route gating, `(app)` group only:**

7. `src/lib/tenancy/moduleCatalog.ts` gained a pure `ROUTE_MODULE_MAP`
   (path prefix → `ModuleKey`, longest-prefix-match) and `moduleAccessible()`
   — mirrors `src/lib/auth/permissions.ts`'s pure `POLICY`/`canAccess()`
   deliberately, for the same reason that file states: middleware, a client
   component, and a layout can all read one source of truth. **Deliberately
   partial** — only unambiguous 1:1 route↔module pairs are listed (`/pos`
   → `pos`, `/hr/payroll` → `payroll`, …); an unmapped route (dashboards,
   the Brain, cross-vertical analysis, company/user admin, most of
   `/admin/*`) always default-allows. A test asserts `ROUTE_MODULE_MAP`
   never touches a `BREAK_GLASS` or `UNIVERSAL` path — a module-gated
   redirect target that is itself gated would be an infinite loop.
8. `src/lib/tenancy/moduleGate.ts` — the DB-backed half, mirroring
   `permissions.ts`'s override-cache layer: `getEnabledModuleSet(tenantId,
   loadPacks)` with a 60s TTL cache, `invalidateModuleCache()` (called from
   `toggleTenantModule()` so a toggle is visible on the very next
   navigation), and a `modulesEnforced()` flag
   (`H_NERVE_MODULES_ENFORCED`) — **default off, ships inert**, same
   contract as `H_NERVE_PERMS_ENFORCED`. Fail-open by design: no tenant
   found, zero `TenantPack` rows (never migrated onto module-grained
   packs), or a load error all return `null` → allow everything, so an
   unconfigured tenant is never locked out.
9. Wired into `src/app/(app)/layout.tsx`, right after the existing
   `effectiveCanAccess` block — but **not** skipped for `role === "ADMIN"`
   like that block is. Module gating is an orthogonal axis (which features
   this tenant's business has) from role authority, and the seeded
   `admin@hourani.jo` account is the primary day-to-day operator, not an
   edge case to exempt.

**Deliberately not done — the orbit nav.** The actual live navigation in
`(app)` is not a conventional sidebar: `src/components/layout/Sidebar.tsx`
(which already has the `enforcePerms`/`canAccess` pattern this section
mirrors) is dead code, removed from the render tree per the comment at
`(app)/layout.tsx` — navigation is exclusively the Orrery hub (`/orrery`, a
**prebuilt static HTML** asset at `public/hub/index.html`) plus
`ConstellationRail`/`MiniOrrery`, both reading `src/lib/orrery/groups.ts`.
That file's own header states the static hub and the React groups "MUST
stay 1-to-1" and documents a past divergence bug from exactly this kind of
edit; [[feedback_keep_the_orbit]] is an explicit standing instruction that
the orbit's organization is sensitive to the owner and animation-breaking
changes have caused real friction before. Filtering it by per-tenant module
state — especially the static hub half, which can't read live DB state
without a build-time regeneration pipeline that doesn't exist — is a
separate, higher-risk project than route gating and was not attempted
under this task. Net effect today: a disabled module's link may still be
*visible* in the orbit, but clicking it redirects to `/dashboard` once
`H_NERVE_MODULES_ENFORCED=true` — visible-but-blocked, not the reverse. The
existing role-permission precedent this section mirrors ships the same gap
(its comment: "Server-side middleware is the real gate; this just avoids
showing dead links") — nav-hiding was already treated as cosmetic sugar on
the route gate, not the gate itself.
