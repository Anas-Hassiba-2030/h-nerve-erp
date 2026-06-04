-- Phase ISO-4 — workspace scoping for AIInsight.
--
-- AIInsight previously had NO tenant/company column, so it could not be
-- isolated per workspace. Add a NULLABLE companyId (FK to Company, SetNull
-- on company delete) so the SHARED_COMPANY_SCOPED_MODELS plane in
-- lib/tenancy/workspaceScope.ts can scope it:
--   • companyId IS NULL  -> GROUP-WIDE insight, visible in every workspace
--     (engine heuristics like cross-company synergy / group cash-burn, plus
--     an ADMIN's manual notes).
--   • companyId = <id>   -> pinned to one company; a workspace-pinned operator
--     sees only its own company's signals plus the group-wide ones.
--
-- Mirrors AlertRule.scopeCompanyId's null-is-group-wide convention.
ALTER TABLE "AIInsight" ADD COLUMN "companyId" TEXT;

-- BACKFILL — existing rows have no company attribution. The engine produced
-- them as GROUP-WIDE signals (the `module` field maps to a sector, not a
-- single company, so it cannot be used to derive one), and they are visible
-- to everyone today. Leaving companyId NULL preserves that exact visibility:
-- the migration is behaviour-preserving for the existing feed. This explicit
-- statement documents the decision (NULL = group-wide) for legacy rows.
UPDATE "AIInsight" SET "companyId" = NULL WHERE "companyId" IS NULL;

-- FK + index. SetNull so deleting a company demotes its insights to
-- group-wide rather than cascading them away.
ALTER TABLE "AIInsight"
  ADD CONSTRAINT "AIInsight_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AIInsight_companyId_idx" ON "AIInsight"("companyId");
