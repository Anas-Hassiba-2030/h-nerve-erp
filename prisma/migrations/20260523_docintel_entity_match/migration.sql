-- Phase NS-8 — Document → Graph entity-match columns.
-- Additive + nullable: safe to apply against an existing populated table,
-- no backfill, no constraint. Opaque ids (no FK) by design — the match is
-- advisory and the supplier/customer rows may be deleted independently.
ALTER TABLE "Document" ADD COLUMN "matchedSupplierId" TEXT;
ALTER TABLE "Document" ADD COLUMN "matchedSupplierName" TEXT;
ALTER TABLE "Document" ADD COLUMN "matchedCustomerId" TEXT;
ALTER TABLE "Document" ADD COLUMN "matchedCustomerName" TEXT;
ALTER TABLE "Document" ADD COLUMN "matchConfidence" DOUBLE PRECISION;
