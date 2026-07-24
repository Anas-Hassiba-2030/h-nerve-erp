# D1 atomicity — what can half-commit, and what we do about it

Gap **#2** of the 100/100 readiness list (`docs/OWNER-ACTIONS.md`).

## The constraint

Cloudflare D1 has **no interactive transactions**. Prisma's engine hard-throws
the moment `$transaction(callback)` is called, so `src/lib/db/db.ts` intercepts
it and runs the callback against the client directly (`db.ts:254`). Statements
auto-commit individually — exactly D1's own documented "transactions are ignored
and run as individual queries" behaviour.

The array form, `$transaction([...])`, **is** supported by D1 and is still
delegated to the real client.

So every `await prisma.$transaction(async (tx) => { … })` in this codebase is a
sequence of independent writes. **An interruption partway leaves the earlier
writes committed.** There is no rollback.

## The two failure shapes

Not every half-commit is equally bad. Sorting them is the whole job:

**Shape A — inert orphan (acceptable).** The interruption leaves a row that no
reader counts: a `DRAFT` journal entry, an unreferenced document. Ugly, not
harmful. This is the shape `createPostedJournalEntry` deliberately produces —
it writes `DRAFT`, then flips to `POSTED` with one atomic `UPDATE`, and every
ledger reader filters `status: "POSTED"`. A crash can never expose a
half-visible ledger entry.

**Shape B — visible inconsistency (must be fixed).** The interruption leaves
state that readers *do* count, or that defeats a guard. Two sub-cases:

- **B1 — orphaned money.** A posted ledger entry whose business record never
  got created, or stock moved without the document that explains it.
- **B2 — defeated idempotency guard.** The "already did this" check keys off a
  record written *after* the money. An interruption between them makes the
  guard blind, and the retry posts the amount **twice**. This is the worst one:
  it is silent, it is money, and the operator's natural reaction (retry) is
  what triggers it.

## Fixed

### `lib/hr/payroll.ts` — B2, salary expense double-posted

`runPayroll` posted the ledger entry (Salary Expense debit / Treasury credit)
and *then* created the `PayrollRun`. The caller's "payroll already ran this
month" guard keys off `PayrollRun`. An interruption between the two left a
posted salary expense with no run record — so the guard saw nothing, the
operator retried, and the ledger took the salary expense **a second time**.

Fixed by making the function idempotent at the ledger level: before posting, it
looks for an existing `POSTED` entry carrying this run's `reference`. That entry
*is* the interrupted run's ledger half, so the retry adopts it and finishes the
job instead of posting again. Regression-tested in `payroll.test.ts`.

## The ordering rule (apply this to new code)

Order writes so that **the guard is written before, or together with, the money**
— and prefer one call over several:

1. **Cheap/inert rows first, money last.** If the sequence dies early, nothing
   countable was written.
2. **The idempotency key must be written no later than the amount it guards.**
   If it can't be (a required FK forces the other order), make the operation
   recoverable instead — look for the orphan and adopt it, as payroll now does.
3. **Prefer one `createMany` + a final status-flip `UPDATE`** over per-row
   creates. Each item in a `$transaction([...])` array is a separate D1 round
   trip.
4. **Readers filter on the committed status.** That is what makes shape A safe.

## Remaining sites — not yet individually assessed

`$transaction(callback)` appears at roughly 40 call sites. Payroll was triaged
and fixed because it is shape B2 with real money. The rest are **not** claimed
to be safe — they are unreviewed, and this section is the honest ledger of that.

Already carrying deliberate D1-aware ordering comments (previously reasoned
about, no re-litigation needed):

- `src/app/(app)/admin/lots/actions.ts`
- `src/app/(app)/crm/actions.ts`
- `src/lib/finance/recurring.ts`
- `src/lib/finance/accounting.ts` (the DRAFT→flip helper itself)

Highest-value to review next, ranked by how much money or stock moves per call:

| Site | Why it's next |
|------|---------------|
| `src/lib/finance/orders.ts` (5 sites) | Order → invoice → stock, several rows per call |
| `src/app/(app)/manufacturing/actions.ts` (6 sites) | Work orders consume + produce stock |
| `src/app/(app)/admin/landed-costs/actions.ts` | Redistributes cost across many lines |
| `src/app/(app)/admin/transfers/actions.ts` | Moves stock between warehouses |
| `src/app/(app)/assets/actions.ts` | Depreciation posts to the ledger |
| `src/app/(app)/estimates/actions.ts` | Estimate → invoice conversion |
| `src/lib/supply/bridge.ts` | Cross-tenant forecast + procurement write |

For each: identify whether an interruption leaves shape A or shape B, and if B,
apply the ordering rule or the adopt-the-orphan recovery.

## Testing this class of bug

The regression test that matters simulates the interrupted state directly —
stub the DB so the orphan already exists, then assert the retry does **not**
write the amount again. See `src/lib/hr/payroll.test.ts`
(`runPayroll — ledger idempotency after an interrupted run`).
