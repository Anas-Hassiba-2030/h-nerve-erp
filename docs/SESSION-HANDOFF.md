# Session handoff — `feat/finals-polish`

One PR, fully verified, merges cleanly into `main`. **Merge:**
https://github.com/Anas-Hassiba-2030/h-nerve-erp/compare/main...feat/finals-polish?expand=1

This was an autonomous "finish it while I sleep" session. Below is everything that
changed, how it was verified, and the two things only you can do.

---

## 1. The English/Arabic problem — solved end-to-end

This was the recurring complaint. Two layers were broken; both are fixed.

- **The toggle never persisted.** The Orrery hub's language switch only flipped the
  iframe's own pixels — it never wrote the app's `h_nerve_locale` cookie, so the rest
  of the app stayed in the old language. Now the toggle posts to the host
  (`OrreryFrame`), which writes the cookie + reloads → whole-app switch.
- **English still showed Arabic *data*.** Even in English, company/hotel/farm/program
  names and dozens of detail-page labels were hard-coded Arabic. Swept every surface:
  section pages, the company profile, **all 11 entity detail pages**, and the mobile
  surface. Names flip to their `nameEn`; labels flip on locale.

**Verified (real browser, seeded DB):** default-Arabic user toggles to English from the
Orrery → whole app switches and persists; English user opening the Orrery is **not**
reverted; Arabic mode still renders correctly (no regression).

## 2. Per-company ERP descent — surfaced

Every company profile now has an **"Open back-office / دخول نظام الشركة"** button that
enters that company's scoped ERP (`enterWorkspace` → `/workspace`). The back-office
existed but was only reachable from inside itself. **Verified** entering the command
center in both languages.

## 3. Navigation & feature recovery ("don't forget the effort")

- Fixed the dead **"New member"** button (was 404'ing via a wrong route match).
- Recovered **2 orphaned built features** with no nav link: **Audit 360** and **Trash**
  (soft-delete recovery) — now in the System sidebar group.
- Reconnected the Orrery hub dives that were landing on static design mocks instead of
  real pages (Brain, Causal graph, Council, Memory, Learning, Benchmarks, What-if, Supply
  chain, Workflows, Integrations, Workspace, Holding, Search, Pinned, System, Trash, Audit,
  Admin/Empire, Help, …). Then consolidated: `OrreryFrame` had its own untested inline
  map while `lib/orrery/routeMap.ts` — a comprehensive, **unit-tested** resolver — sat
  unused. Wired the live path to the tested resolver and deleted the duplicate, so **every
  dive now lands on a real route** (incl. `narrate → /brain`) and the live navigation is
  covered by `lib/orrery/routeMap.test.ts`.

## 4. Self-review caught & fixed 3 real bugs

A code-review pass over the branch (before you merge) found three bugs introduced during
the automated i18n edits — all fixed and re-verified:

1. **Serious:** the Orrery language bridge could *revert* English users to Arabic on
   every hub load (the hub hardcodes `setLang("ar")` at init). Guarded so only genuine
   user toggles persist.
2. The company "Founded" badge dropped the age number + unit (`• 12 yrs`) — restored.
3. The farm detail title was left in raw Arabic — now flips to English.

---

## Verification summary

| Check | Result |
|---|---|
| `tsc --noEmit` (Postgres client) | 0 errors |
| `next build` | compiles |
| `scripts/build-orrery.mjs` rebuild | idempotent |
| `npm test` | 393 / 393 pass |
| AR + EN render, all surfaces | no errors |
| CRUD (create/edit company, create transaction) | writes to DB |
| Orrery language round-trip + 6 dive targets | navigate to real routes |

---

## What only you can do

1. **Merge this PR.** The automation here has no GitHub API auth, so the merge button is
   yours. Railway auto-deploys `main`.
2. **Pitch / seed data.** This is your lane (wipe → calculated load). The i18n work means
   whatever you load renders bilingually. Two notes from analysing the current seed:

   - **Hotel occupancy reads low (≈0–13%).** Root cause: only ~15 bookings are seeded per
     hotel (`prisma/seed.ts:319`, loop of 60 across 4 hotels) against 140–220 rooms each,
     and the hotels page counts last-30-day `CONFIRMED|CHECKED_IN` rooms ÷ total rooms.
     To show a healthy ~70%, each hotel needs ~0.7 × its room count in active booked rooms
     (~50 bookings/hotel, ~200 total). **Caveat:** booking volume also drives revenue
     (the JOD figures on Finance + the per-company table), so this is a *coupled* number —
     raising occupancy raises revenue. That's why it's a pitch-modelling decision for you,
     not a mechanical fix.
   - The status logic at `seed.ts:327-329` is **correct** as written (COMPLETED = past,
     CHECKED_IN = active, CONFIRMED = future). The `? "CONFIRMED" : "CONFIRMED"` on line 329
     is a harmless redundant ternary, not a bug — do **not** change it to `CHECKED_IN`,
     which would wrongly mark *future* bookings as checked-in.
3. **Branch cleanup (optional).** The old `feat/*-daylight` branches are already
   represented in `main`; safe to delete after merging.
