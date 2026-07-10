# H-Nerve — Test Strategy & Definition of Done

> **Purpose:** state what is tested, how, to what standard, and what "done"
> means — so a developer knows the bar without asking. Grounded in the actual
> setup (`vitest.config.ts`, the `lib/**/*.test.ts` suite, 580+ passing tests (run `npm test` for the live count)).
> Owner: platform. Last-updated: 2026-06-02.
> Part of the spec set in `docs/RE-INFRASTRUCTURE-PLAN.md` §3.

---

## 1. Philosophy: test the logic, not the framework

H-Nerve's test suite is **pure-unit by deliberate design**. The runner is
**Vitest** (`npm test` → `vitest run`), node environment, with one include glob:

```
include: ["lib/**/*.test.ts"]   // no DB, no network, no Next runtime
```

The rule that makes this fast and reliable: **business logic that deserves a test
is extracted into a pure function in `lib/`**, with zero I/O, then tested in
isolation. The canonical example is `lib/workspaceScope.ts` — the entire
tenant-isolation decision is a pure function *precisely so* it can be proven
without a database (see ADR-005). The same pattern holds for the brain's
`verifier.ts` / `confidence.ts` (Phase 22).

**Current state:** ~24 test files across `lib/` and `lib/brain/`, **580+ tests**,
all green. They run in ~3 seconds.

---

## 2. What is tested (and must stay tested)

- **Tenant isolation** (`lib/workspaceScope.test.ts`) — the pass-through
  invariant, company- and tenant-scoping, the unscoped-model exclusions. This is
  the **highest-stakes** suite: a regression here is a data-leak.
- **Brain trust layer** (`lib/brain/verifier.test.ts`, `confidence.test.ts`) —
  claim extraction, fact matching with tolerance, the coverage veto, confidence
  axes. Phase 22.
- **Routing / nav** (`lib/orrery/routeMap.test.ts`) — every orrery href maps to a
  real route, no dead mocks.
- **Pure helpers** — auth role hierarchy (`authz`), permissions, period math,
  formatting utils, etc.

When you add or change a pure function in `lib/`, add/extend its `.test.ts` in the
same PR. `npm test` is required green before any commit that touches `lib/`.

---

## 3. What is NOT tested today (the honest gaps)

This is the candid coverage map — important for the rebuild's risk assessment:

| Layer | Tested? | Note / risk |
|---|---|---|
| Pure logic in `lib/` | ✅ unit | The strong core. |
| Server actions (`actions.ts`) | ❌ | ~150 actions, no tests. They do auth + zod + prisma + revalidate — logic worth extracting + testing. **Biggest gap.** |
| React components | ❌ | No component/RTL tests. |
| Prisma queries / DB | ❌ | No DB-integration tests (suite is DB-free by design). |
| API routes (`app/api`) | ❌ | No handler tests. |
| End-to-end (browser) | ❌ | No Playwright/Cypress. Smoke tests are **manual** (`docs/SMOKE-*.md`, `docs/ops/WORKFLOWS-SMOKE-TEST.md`). |

The two operator-reported bugs that pure-unit can't catch — 26.7 (FAB disappear)
and perceived lag — are exactly the class an **e2e/browser** layer would cover.

---

## 4. Target test pyramid (for the re-infrastructure)

Recommended additions, in priority order (each is a candidate ADR/PR):

1. **Extract + unit-test server-action logic.** Pull the validate/decide step of
   each action into a pure `lib/` function (mirroring `workspaceScope`), unit-test
   it. Closes the biggest gap without needing a DB.
2. **A thin DB-integration tier** (Vitest + a disposable Postgres or sqlite),
   gated separately from the fast pure suite, for the tenancy middleware and
   critical queries.
3. **A small e2e smoke** (Playwright) for the top 5 flows: login → orrery →
   create a record → brain narrate → workspace switch. This catches 26.7-class
   UI regressions.
4. **Component tests** only where logic lives in the component (rare; most logic
   should move to `lib/`).

Keep the **fast pure suite separate** from DB/e2e so `npm test` stays sub-5s and
runs on every commit; DB/e2e run in CI.

---

## 5. Definition of Done (the PR acceptance gate)

A change is **done** when:
- [ ] `npm test` is green (580+ tests).
- [ ] `npx tsc --noEmit` is clean (typecheck).
- [ ] `npm run lint` is clean.
- [ ] `next build` exits 0 (for changes touching app/components/pages).
- [ ] New pure logic in `lib/` has a `.test.ts`.
- [ ] New server action is gated (`requireUser`/`requireRole`), zod-validated, and
      listed in `docs/spec/API-CONTRACTS.md` §3.
- [ ] New model decisions recorded in `docs/spec/DATA-MODEL.md` (isolation set,
      soft-delete, status union).
- [ ] New user-facing term has locked Arabic/English in `docs/spec/GLOSSARY.md`.
- [ ] Soft-deletable list queries filter `deletedAt: null`.
- [ ] No `prismaUnscoped` without a `// CROSS-TENANT INTENT:` comment.

This gate is the same one used throughout this session (every PR ran tests +
typecheck + lint + build before push).
