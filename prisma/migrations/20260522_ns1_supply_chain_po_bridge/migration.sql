-- Phase NS-1 — cross-tenant supply-chain → purchase-order bridge.
-- All additive + nullable. No backfill. Seeded data survives.

-- AlterTable
ALTER TABLE "SupplyForecast" ADD COLUMN     "linkedPurchaseOrderId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "sourceForecastId" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "linkedTenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_sourceForecastId_key" ON "PurchaseOrder"("sourceForecastId");

-- CreateIndex
CREATE INDEX "Supplier_linkedTenantId_idx" ON "Supplier"("linkedTenantId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_sourceForecastId_fkey" FOREIGN KEY ("sourceForecastId") REFERENCES "SupplyForecast"("id") ON DELETE SET NULL ON UPDATE CASCADE;
