# Dashboard — pitch-grade redesign (2026-06-28)

Owner feedback on the live `/dashboard`: "terrible, needs a lot of work."
Goal: a credible, uncluttered Executive dashboard that holds up as the hero
screen of the investor pitch. Heritage Modern, NetSuite-style clarity.

Anchored decisions (owner): **both** credibility + declutter; **enrich the
demo data** (not presentation-only); cards become **5 sector cards, drill on
click**.

## Root-cause diagnosis (from code + the screenshot)

- **Looks fake.** Default period is `30D` ([period.ts](../../../src/lib/finance/period.ts) `isValidPeriod` → `"30D"`),
  which is nearly empty in the seed, so the hero shows `Expenses JOD 0` →
  `Net = Revenue` → `100% margin`, and 8/10 unit cards show `JOD 0` yet a green
  `HEALTHY` pill. The 12-month "Financial pulse" (JOD 3.08M / 428k) doesn't
  reconcile with the 30-day hero (161k), with no anchoring label.
- **Cluttered.** Header eyebrow repeats the H1 ("Executive dashboard" twice);
  the brain badge prints the raw model id `LIVE · CLAUDE-SONNET-4-6` (jargon to
  an owner); the live ticker repeats the hero KPIs (occupancy, revenue); 10
  near-identical cards mix two tiers (`Maha Dairy Industries` + `Maha Dairy`,
  `Loran Agricultural` + `Loran Agriculture`).
- **Structure is fine.** The 5-band layout in [page.tsx](../../../src/app/(app)/dashboard/page.tsx)
  stays. This is a data + presentation + IA pass, not a re-layout.

`Company` has **no parent/child** ([companies.prisma](../../../prisma/schema/companies.prisma)) —
the 10 rows are flat, grouped only by `sector`
(HOSPITALITY/DAIRY/AGRICULTURE/EDUCATION/INVESTMENT). So "5 sectors" = group by
`sector`, **no schema change**.

## A. Credibility

### A1. Idempotent finance enrichment
A new additive seed script (e.g. `prisma/seed-finance-demo.ts`, callable from
`scripts/seed/`) that, for every `Company`, ensures REVENUE + EXPENSE
`Transaction` rows across the **trailing 12 months including the last 30 days**.

- **Idempotent:** deterministic `reference` per row, e.g.
  `DEMO-FIN-{companyCode}-{YYYYMM}-{REV|EXP}-{n}`. Re-runs `upsert` on
  `reference` (unique) — never duplicates. Safe to run on a populated prod DB.
- **Realistic shape:** per-sector monthly base (Arena hospitality largest →
  Tank incubator smallest), mild month-to-month variance, and
  **expenses ≈ 60–80% of revenue** so margins land in a believable 20–40% band —
  never 0 expenses, never 100% margin. Recent 30 days populated so the default
  view is non-empty.
- **Categories:** sector-appropriate (`ROOM_REVENUE`, `F&B`, `PAYROLL`,
  `FEED`, `UTILITIES`, …) so the finance pages also read real.
- Does **not** touch any non-demo data; only inserts `DEMO-FIN-*` references.

### A2. Presentation guards (`data.ts` / `page.tsx`)
- **Margin:** when `expenseInRange === 0`, do not render "100% margin" — show
  `—` (or omit the hint). Margin only shown when expenses > 0.
- **Card health:** a sector/unit with 0 revenue in the active period reads
  neutral ("No activity" / `—`), never green `Healthy`. Keep existing WARN/CRIT
  signals (agri alert, dairy expiry).
- **Human period labels:** `range.label` rendered as "last 30 days", "this
  quarter", "year to date" (not the raw `30D`/`QTD` codes), so the hero
  reconciles with "Last 12 months" on the pulse.
- Fix the latent `companyRevenue` bound (uses `>= range.start` with no upper
  bound) to `>= start && <= end` for period correctness.

## B. Declutter

- **Header:** drop the eyebrow that duplicates the title; set a contextual
  eyebrow ("Hourani Group · all units" or the date).
- **Badge:** [BrainStatusBadge](../../../src/components/brain/BrainStatusBadge.tsx)
  shows just **"Live"** with the emerald pulse dot; move the model id into the
  `title` attribute (ops can still hover). Honours the rule against surfacing
  internal model ids. STUB path unchanged.
- **Ticker:** dedupe — remove the items already shown as hero KPIs (Arena
  occupancy, Revenue-in-range); keep complementary signals (Equities, ESG,
  Pipeline, Live forecasts).

## C. Cards → 5 sector cards, drill on click

- Server groups the 10 companies by `sector` into **5 roll-up cards**:
  aggregated revenue + 6-month sparkline + sector health + one ops metric
  (sector-appropriate, reusing existing per-sector logic).
- **Drill:** clicking a sector card **expands inline** (client toggle) to
  reveal that sector's member units as the existing tiles; each member tile
  still submits `enterWorkspace` (unchanged behaviour). No navigation away.
- Health roll-up: sector = worst member health (CRITICAL > WARN > OK), with the
  0-revenue neutral guard from A2.

## Out of scope (YAGNI)
- No new layout/bands. No new finance models. No company hierarchy in schema.
- No changes to the other bands (calendar, tasks, activity, intelligence).

## Build / verify
- ~5 files: `prisma/seed-finance-demo.ts` (+ wire into `scripts/seed`),
  `data.ts`, `page.tsx`, `CompanyStrip.tsx` (sector roll-up + drill),
  `BrainStatusBadge.tsx`.
- Two commits: (1) data/seed enrichment + guards; (2) UI declutter + sector
  cards.
- Green gate: `npm run typecheck`, `npm test`, changed-file lint.
- Verify locally (sqlite dev.db) by running the enrichment script + the
  dashboard; confirm: no JOD 0 / 100%-margin, 5 sector cards drilling to units,
  badge = "Live", header non-redundant. Then a **prod reseed/enrichment run**
  on Railway for the live pitch URL.
