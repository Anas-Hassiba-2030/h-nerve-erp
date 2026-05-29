-- Phase 20 — The Living Protocol.
-- Additive: a brand-new table, no change to any existing row. Safe to apply
-- against a populated DB. tenantId is an opaque Tenant.slug label (no FK),
-- scoped by the workspaceScope middleware like Product/BrainInsight.
CREATE TABLE "ProtocolClause" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "body" TEXT NOT NULL,
    "bodyEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolClause_pkey" PRIMARY KEY ("id")
);

-- One clause per (tenant, key); display ordered per tenant.
CREATE UNIQUE INDEX "ProtocolClause_tenantId_key_key" ON "ProtocolClause"("tenantId", "key");
CREATE INDEX "ProtocolClause_tenantId_orderIndex_idx" ON "ProtocolClause"("tenantId", "orderIndex");
