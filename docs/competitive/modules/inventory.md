# Inventory Module

Products/services catalog, multi-warehouse stock, requisitions, price lists, and
physical stocktaking. Grouped under Daftra's "Inventory & Purchases" app bucket.

## Entities (standard — verify against forms)

### Product / Service
- Name, SKU/code, type (stock product vs. non-stock service).
- Selling price, cost/buy price, tax class.
- Unit of measure; barcode.
- Category, image, description.
- Track-stock flag; reorder level; opening quantity per warehouse.
- Per-warehouse stock balances.

### Warehouse (Store)
- Name, code, location, default flag.
- Holds per-product quantities; movements post here.

### Price List
- Named list of product → price overrides.
- Assignable to clients/segments (e.g. wholesale vs. retail).

### Requisition
- Internal stock request / movement between warehouses.
- Lines: product, quantity, from/to warehouse; status (requested → approved → fulfilled).

### Stocktaking
- Physical-count session per warehouse.
- Lines: product, system qty, counted qty, variance → posts an adjustment.

## Workflows
1. Product created → stocked into a warehouse (opening balance / purchase).
2. Sale reduces stock; purchase increases it; requisition moves it; stocktaking reconciles it.
3. Valuation feeds Store Reports and COGS in accounting.

## H-Nerve mapping
H-Nerve has **no product catalog, warehouses, or stock tracking**. This is a
large greenfield area — likely a dedicated Phase 27 Inventory/Warehouse module.
See [hnerve-gap-map](../hnerve-gap-map.md).
