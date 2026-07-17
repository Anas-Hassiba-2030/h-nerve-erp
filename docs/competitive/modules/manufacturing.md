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
