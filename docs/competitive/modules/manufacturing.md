# Manufacturing Module

New vs. the original in-app map — surfaced from Daftra's public
`/en/manufacturing-software/`. A discrete-manufacturing layer sitting on top of
Inventory + Accounting. Marketed for 50+ industries.

## Entities & capabilities (public feature bullets)

### Bill of Materials (BOM)
- Build comprehensive BOMs; **customizable per manufacturing process**.
- Component list + quantities → the recipe consumed by a manufacturing order.

### Manufacturing Order
- Create and track production orders.
- **Production routing** — ordered stages a product passes through.
- **Stage / workstation management** — assign work to stations, track per stage.

### Inventory & material consumption
- Links orders to inventory; **consumes raw materials** on production.
- Outputs finished goods back into stock.

### Cost management
- Track **direct and indirect costs**; roll up into product cost.
- Detailed cost reports → price products accurately, financial insight.

## Workflow
1. Define BOM (recipe) → 2. Raise manufacturing order → 3. Route through stages /
workstations → 4. Consume raw materials from inventory → 5. Produce finished goods
→ 6. Cost rollup (direct + indirect) → 7. Cost reports.

## Accounting hooks
Material consumption + labor/overhead post to journals (double-entry) and feed
product average cost — ties Manufacturing → Inventory valuation → Accounting.

## H-Nerve mapping
**Greenfield — no analog today.** Relevant to the dairy vertical (المها): a
DairyBatch is conceptually a manufacturing order (raw milk → product, with yield,
cost, QC). H-Nerve's `DairyBatch` model is the natural seed for a general
BOM/manufacturing-order engine. Lower Phase 27 priority than Accounting/CRM/
Invoicing, but a real gap. See [hnerve-gap-map](../hnerve-gap-map.md).

## ✅ SHIPPED — v1 core (PR #301, `feat/phase27-manufacturing`)

`prisma/schema/manufacturing.prisma` + `src/lib/manufacturing/manufacturing.ts`
+ `src/app/(app)/manufacturing/`. Built informed by this map, our own models
and server actions — not copied.

| Daftra capability | H-Nerve v1 |
|---|---|
| BOM (component list + qty, per-process) | `BillOfMaterials` + `BomLine` — output product, component lines, `outputQty` yield, per-run `laborCost`/`overheadCost`. Reference data only (no stock/journal effect until an order completes — matches Daftra's BOM semantics). |
| Manufacturing order + lifecycle | `ManufacturingOrder`, `runs` executions, `DRAFT → IN_PROGRESS → DONE / CANCELLED`. |
| Consume raw materials → produce finished goods | `MFG_CONSUME` per component + one `MFG_PRODUCE` (carrying moving unit cost) into the existing `InventoryMovement` ledger; quantity recalced from the ledger. |
| Cost rollup → product cost | Pure `rollupCost`: material scales with runs, labor/overhead per run, total ÷ output units = unit cost, frozen on the order. |
| Accounting hooks (double-entry) | Labor+overhead **accrual only** as one balanced `JournalEntry` (`5100 Manufacturing Expense` / `2150 Accrued Manufacturing Costs`). Materials already expensed at purchase → **not** re-posted (no double count). |

Live-verified end-to-end (component stock down, output up at correct unit cost,
balanced accrual journal). 5 unit tests on the cost math.

## 🟠 v2 frontier — deeper Daftra manufacturing (NOT built)

Surfaced from Daftra's public help center during the Phase-27 research pass
(functional facts only; verification panels hit an account limit, so these are
recorded as **unverified public-doc claims**, not confirmed spec):

- **Production Routings** — a named, *ordered* sequence of production stages
  ("Production Operations", e.g. mixing → forming → drying → firing). Every BOM/
  order line is tagged to a stage, so the total-cost report breaks down by stage.
- **Workstations** — stages carry operating time + workstation cost; a line's
  cost type is `Fixed Amount | Based on QTY | Formula`, which governs how it
  scales when order qty ≠ BOM qty.
- **Scrap items** — expected waste output modeled on the BOM.
- **Indirect costs** — separate records (account + date range + distribution
  type) prorated across orders `Based on Amount` or `Based on QTY`.
- **"Work Orders"** in Daftra is a *separate* project/job-costing container
  (budget + linked transactions), **not** the manufacturing order — don't
  conflate them.

v1 covers the material→labor→overhead→unit-cost→ledger backbone; routings/
workstations/scrap/indirect-cost distribution are the enrichment wave if a
tenant needs stage-level costing.
