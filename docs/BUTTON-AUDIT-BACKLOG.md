# Button audit backlog

Grep audit run 2026-06-05 against `app/` and `components/`:

```
onClick={() => {}}            → 0 hits
onClick={async () => {}}      → 0 hits
onClick={undefined}           → 0 hits
```

No literal no-op buttons remain in the codebase. Every interactive
button either:
- Calls a server action via `<form action={…}>`
- Has a meaningful client handler
- Is a `<Link>` (navigation, not a button)

Confirmed fixed in prior runs (with confirms / inline validation):

- /admin/products     "Adjust stock"       → inline red error + disabled state
- /admin/users        "Delete user"        → window.confirm + last-admin guard
- /brain/graph        "Rebuild brain"      → window.confirm explainer
- /brain/iq           "Reset trajectory"   → window.confirm explainer
- /supply-chain       "Run engine"         → flashToast on result
- /insights           "Share to Council"   → window.confirm + redirect

Confirmed fixed 2026-06-04/05 (PRs #188–#190 — previously silent-failing):

- /insights           "Generate plan"      → try/catch + bilingual flashToast (was: silent throw → no feedback)
- /insights           "Run engine"         → try/catch on Promise.all fan-out (was: any heuristic error killed the whole run silently)
- /insights           "Resolve" (bulk)     → success toast + empty-list guard
- /brain/council      "Convene"            → try/catch on LLM call + error toast (was: short topic or API error = silent fail)
- /plans              "Generate from insight/council" → try/catch → error toast, no more `/plans/undefined` redirect
- /education          "Delete program"     → try/catch → success/error toast
- /dairy              "Set batch status"   → null guard before update (workspace-scoped row not found = silent bail)

Open follow-ups (NOT broken, just lacking polish):

- Workflow studio "Save" / "Enable" / "Test run" — work but UX could be
  clearer about state transitions. Documented in P8 followups.
- Sustainability page tile actions — links not buttons; verify they
  navigate where expected.
- Various "Coming soon" placeholder buttons on /reports — clearly
  marked, not broken.

Programmatic browser-based audit (Playwright crawl): not run this
session because Playwright is not a dependency and the no-new-deps
rule applies. Grep audit is the lighter substitute.

---

## Batch 1 — known suspects (2026-06-05, live prod + local sqlite repro)

Verified against live prod (`hnerve.up.railway.app`) and a local sqlite
instance seeded with the demo data + brain memories.

| Surface | Control | Result |
|---|---|---|
| /orrery | "Ask the Brain" FAB circle | ✅ opens styled panel live (`fixed/z100`) |
| /orrery | "Time Machine" FAB circle | ✅ opens styled panel live (`fixed/z70`) |
| /orrery | "Quick Add" FAB circle | ✅ works (already passing) |
| /insights | "Generate plan" | ✅ creates plan **and** redirects to /plans (destination visible) |
| /hotels /dairy /farms /education | list data | ✅ populated (20 / 30 / 5 / 5 rows) via deploy seed |
| **/brain/memory** | page render | ❌→✅ **FIXED** (was crashing into the error boundary) |

### /brain/memory — the REAL throw (not what #203 guarded)

`#203` wrapped `prisma.memory.findMany` in try/catch, but the page kept
crashing on prod once memories were seeded. Root cause found via a local
repro + dev-server stack trace, not assumed:

```
⨯ Error: Functions cannot be passed directly to Client Components unless
  you explicitly expose it by marking it with "use server".
```

The page (Server Component) passed `labels.countTemplate: (shown,total) => …`
— a **function** — into `<MemoryLake>` (a `"use client"` component). Functions
can't cross the RSC boundary. It only throws when `rows.length > 0` (MemoryLake
renders), so it was dormant until `ensure-brain-seed` populated the lake — which
is exactly when the page started crashing. `findMany` was never the problem.

Fix: build the "X of Y memories" count string **inside** MemoryLake from the
`ar` flag it already receives; drop the function prop entirely. Verified locally:
page now renders all 8 memory cards + heading, zero function errors in the log.

Bug-class scan: grepped `app/` for other `Template/render/format: (…) =>` props
crossing into client components — no other instances; `countTemplate` was unique.

---

## Batch 2 — intelligence "where did it go" flows (2026-06-05, code-trace)

Focus: every create / commit / convene / generate control must leave the user
where the thing now lives, or toast its destination.

| Surface | Control | Before | After |
|---|---|---|---|
| /insights | Generate plan | redirects to /plans | ✅ already correct (Batch 1 verified) |
| /brain/council | Convene | redirects to /brain/council/[id] | ✅ already correct (lands on the new session) |
| /plans | **Commit** | flips DRAFT→ACTIVE silently — no toast, no try/catch | ✅ **fixed**: try/catch + toast naming the plan ("now active") |
| /plans | **Abandon** | silent, no try/catch | ✅ **fixed**: try/catch + toast |
| /plans | **Step "Done"** | silent | ✅ **fixed**: try/catch + toast ("Step done" / "Plan fully completed ✓") |
| /plans | **Step "Block"** | silent | ✅ **fixed**: try/catch + toast |
| /plans | Generate from insight/council | redirects to /plans/[id] | ✅ already correct |

The Commit fix is the one the user called out: the plan does flip to ACTIVE in
place (chip + KPI update + it re-sorts up the list), but with no toast the click
read as "nothing happened." Now it confirms by name and new state.

### Found-but-deferred (silent destructive actions — NOT yet fixed)
Logged so they aren't lost; fix in a later batch (they're delete-confirmations,
a different class than the create/commit destinations this batch targets):
- /brain/memory `clearMemories` — `deleteMany` + revalidate, **no toast**.
- /brain/council `deleteSession` — `delete` + revalidate, **no toast, no confirm**.

---

## Batch 3 — sector operators (2026-06-05, code-trace, all 5 sectors)

Audited every server action in hotels / dairy / farms / education / supply-chain.

**Silent-create bug class (fixed):** six actions called `schema.parse()` (which
throws on invalid input or a failed `.refine`) and `prisma.x.create()` with **no
try/catch** — on any bad input or DB error the form just re-rendered with zero
feedback (the #1 "button does nothing" class). All now wrap parse+create in
try/catch + `flashToast`; the success `redirect` stays outside the try so it
isn't swallowed (NEXT_REDIRECT).

| File | Action | Fix |
|---|---|---|
| hotels | `createBooking` | ✅ try/catch + toast (incl. a clear "check-out after check-in" message) |
| farms | `createFarm` | ✅ try/catch + toast |
| farms | `createCrop` | ✅ try/catch + success/error toast |
| farms | `updateSensors` | ✅ try/catch + success/error toast |
| education | `createProgram` | ✅ try/catch + toast |
| supply-chain | `createForecast` | ✅ try/catch + toast (covers the date / same-company refines) |

**Already correct (no change):**
- hotels `createHotel`, dairy `createBatch` — use the `parseFormState` pattern (inline field errors).
- dairy `setBatchStatus`, supply `setForecastStatus` — workspace null-guard + revalidate (status flips visibly).
- supply `autoGenerateForecasts` / `approveForecast` / `rejectForecast` / delete / restore — already try/catch + toast (incl. the cross-tenant PO bridge result).
- education `setProgramStage` (safeParse guard), `deleteProgram` (try/catch + toast, #190).

**Deferred (silent, low-risk delete/status — not in this PR):**
- hotels `deleteHotel` / `deleteBooking` / `setBookingStatus`, farms `deleteFarm` / `deleteCrop`, dairy `deleteBatch` — delete/status actions with no toast (row visibly disappears / chip flips, so not "dead", but a toast would be nicer).
