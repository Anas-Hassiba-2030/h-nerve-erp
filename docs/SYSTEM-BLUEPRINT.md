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
| ORM / DB | **Prisma + PostgreSQL** (prod) | Type-safe queries, migrations as source of truth. A SQLite *dev flip* keeps local iteration fast. |
| Auth | **Cookie session (`iron-session`) + `bcryptjs`** | No heavyweight auth framework; sealed stateless cookie; roles as a plain string column + TS union (portable across DBs). |
| Styling | **Tailwind + a small set of brand classes** | Reuse named classes (`.btn`, `.card`, `.kpi`) over utility soup; theme via CSS-variable overrides at the route-group root. |
| Deploy | **Railway** (container, Postgres attached) | `preDeploy` runs migrations + idempotent seeds; healthcheck + restart policy. |
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
   resource.
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
