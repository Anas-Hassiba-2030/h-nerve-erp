-- Phase V3-final — bundled migration.
ALTER TABLE "User" ADD COLUMN "reportsToId" TEXT;
CREATE INDEX "User_reportsToId_idx" ON "User"("reportsToId");

CREATE TABLE "CouncilDiscussion" (
  "id"             TEXT PRIMARY KEY,
  "tenantId"       TEXT NOT NULL,
  "insightId"      TEXT,
  "sharedByUserId" TEXT,
  "title"          TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CouncilDiscussion_tenantId_idx" ON "CouncilDiscussion"("tenantId");
CREATE INDEX "CouncilDiscussion_createdAt_idx" ON "CouncilDiscussion"("createdAt");
CREATE INDEX "CouncilDiscussion_insightId_idx" ON "CouncilDiscussion"("insightId");

UPDATE "User"
SET "reportsToId" = (SELECT id FROM "User" WHERE email='admin@hourani.jo' LIMIT 1)
WHERE email IN (
  'manager-maha@hourani.jo','manager-hotels@hourani.jo',
  'manager-loran@hourani.jo','manager-tank@hourani.jo'
);

UPDATE "User" staff
SET "reportsToId" = (
  SELECT mgr.id FROM "User" mgr
  WHERE mgr.role='MANAGER' AND mgr."companyId" = staff."companyId" LIMIT 1
)
WHERE staff.role='STAFF' AND staff."companyId" IS NOT NULL AND staff."reportsToId" IS NULL;
