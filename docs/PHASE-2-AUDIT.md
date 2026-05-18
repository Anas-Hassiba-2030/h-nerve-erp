# Phase 2 — Broken-Functionality Audit

**Date:** 2026-05-18
**Scope agreed:** server-side audit (this environment has no browser
automation; CLAUDE.md = "no test runner"). Client click-behaviour is
the user's browser pass — see the checklist at the bottom.

## Method

- Booted `npm run dev`, minted an authenticated **ADMIN** session.
- Curled **every** route under `app/(app)/` and `app/(admin)/`
  (107 routes; dynamic `[id]`/`[key]` segments hit with a sentinel to
  force the not-found path and still exercise module load + render).
- Scraped the dev-server log for `⨯`, `digest:`, ` 500 ` after the
  full run (HTTP 200 is **not** sufficient — the earlier warehouses
  bug returned 200 *with* an error boundary, so the log is the truth).
- `npx tsc --noEmit` over the whole tree (catches broken form/action
  wiring, missing imports, type-level broken logic).
- Static scan: every `app/**/actions.ts` for non-async exports from a
  `"use server"` module (the warehouses crash class).
- Broken-nav cross-check: every internal `href="/…"` in `app/` +
  `components/` resolved against the real route set.

## Result — server-side: NO ISSUES FOUND

| Check | Result |
|---|---|
| Route render crashes (107 routes) | **0** — no `⨯`, no `digest:`, no 500 |
| HTTP failures | 0 (only the sentinel `/admin/tenants/__audit__` → 404, which is *correct* notFound behaviour) |
| `tsc --noEmit` | **clean** (whole tree) |
| `"use server"` non-async exports | **0** repo-wide (warehouses class fully eradicated) |
| Broken navigation | 0 (only false positives: `/login`,`/signup` live in `app/(auth)/`, valid) |

The systemic crash class found earlier (`/admin/warehouses`,
`WAREHOUSE_TYPES` exported from a `"use server"` file) was the only
server-side functional break in the codebase; it was fixed in commit
`3b62d98` and no sibling instance exists.

## Out of server-side scope — needs your browser click-pass

Server-side audit **cannot** detect: buttons with no/dead `onClick`,
client handlers that throw only in the browser, form submits that
fail client-side validation silently, optimistic-UI that doesn't
revert, modals/drawers that don't open. Per the agreed scope, verify
these in the browser (logged in, both AR and EN):

1. **QuickAddFAB** (bottom +): opens panel, each shortcut navigates.
2. **Sidebar / SidebarDrawer**: every group link navigates; ADMIN
   group visible as ADMIN; ⌘B collapse; mobile hamburger drawer.
3. **CRUD forms** on companies / hotels / dairy / farms / education /
   finance / products / suppliers / customers: create, edit, delete
   each actually persist + redirect + toast.
4. **/admin/system hub**: all 13 cards navigate to the right page.
5. **Topbar**: bell → (no destination yet; Phase 9), search ⌘K
   (Phase 10 — currently may be a no-op), language + theme toggles.
6. **Time Machine pill** + scrubber: opens, scrubs, banner appears.
7. **Brain pages** (graph/scenarios/council): interactive controls.
8. **Trash**: restore + permanent-delete actions.

Log anything broken there and it becomes the fix list for a Phase 2b
or rolls into the relevant later phase.

## Deploy

**No code changes** were required by Phase 2 (server-side clean), so
no new production deploy was made — the live site already carries the
latest code (last deploy = the `/admin/system` hub, `READY`).
Deviation from the "deploy each phase" rule is intentional: a no-op
build adds risk and no value.
