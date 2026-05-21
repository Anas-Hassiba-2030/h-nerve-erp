CREATE TABLE "CouncilReply" (
  "id"             TEXT PRIMARY KEY,
  "tenantId"       TEXT NOT NULL,
  "discussionId"   TEXT NOT NULL,
  "authorUserId"   TEXT,
  "body"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CouncilReply_tenantId_idx" ON "CouncilReply"("tenantId");
CREATE INDEX "CouncilReply_discussionId_createdAt_idx" ON "CouncilReply"("discussionId","createdAt");
