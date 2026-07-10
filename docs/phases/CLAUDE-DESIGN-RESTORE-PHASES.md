# Claude Design Restore — Phases

owner: Anas Hasiba
last-updated: 2026-07-10

The single mandate (the owner's words): **"I don't want to see the old interface.
I want to see the things we created in Claude Design. Use Claude Design as our god,
our main."**

Reference ("the god"): `docs/design/orrery/` (the hub) + `docs/design/system/sections/*.html`
(one faithful reference per section). Route ↔ reference mapping: `docs/design/orrery/PORT-MAP.md`.

Hard constraints (owner's words):
- Do **not** invent new sections. Port the existing Claude Design references.
- Do **not** hallucinate. When unsure what a section should look like, open its
  reference HTML/JS in `docs/design/system/sections/` and match it.
- Keep the Orbit hub + the ↺ Orbit return pill (teleport between sections) — the owner
  likes these.

---

## Phase 1 — Kill the old interface globally (the vaccine) ✅ priority
**Disease:** `(app)/layout.tsx` always renders the old `<Sidebar>` (`<aside>`); we only
*hid* it via `body:has(.dl-page) aside { display:none }`. Any page without `.dl-page`
(workflow studio, loading.tsx, error.tsx, not-yet-ported pages) leaks the old sidebar.
**Cure:** Remove `<Sidebar>` + `<SidebarDrawer>` from the layout entirely. Navigation is
the Orrery hub (`/orrery`) + the global ↺ Orbit pill (`OrbitReturn`). One edit fixes
EVERY page at once — no more whack-a-mole.

## Phase 2 — Fix the "clicked X → bounced to dashboard" redirects
**Disease:** 13 `(app)/admin/*` ERP pages do `redirect("/dashboard")` when the user
isn't ADMIN/EXECUTIVE/MANAGER. The signed-in owner account (Pawn/STAFF) gets bounced —
e.g. "Admin ERP" star → `/admin/products` → dashboard. CLAUDE.md says these are meant to
be "demo-gated to any logged-in user."
**Cure:** Drop the role redirect on those pages (keep the `!user → /login` check). Audit
every `redirect("/dashboard")` in `(app)` for the same trap.

## Phase 3 — Restore the Claude Design for What-if & Council (named by owner)
**Disease:** `/brain/scenarios` (What-if) and `/brain/council` were simplified to plain
Daylight panels; they no longer look like the rich Claude Design (cosmic orbit, voices,
impact wave).
**Cure:** Port `docs/design/system/sections/whatif.html` + `whatif.js` and `council.html`
+ `council.js` faithfully, wired to real data + server actions. No new invention.

## Phase 4 — Full section sweep against PORT-MAP.md
Go route-by-route through `PORT-MAP.md`. For each, open its reference and align the live
page to it. Catch every remaining "old interface" leak or design mismatch systematically
so the owner never has to report sections one by one.

## Phase 5 — Verify end-to-end & ship
`next build` clean; walk every route (logged in as the owner's role); confirm: zero old
sidebar/chrome anywhere, zero wrong dashboard bounces, What-if/Council match the design.
Push so Railway redeploys.
