-- Phase 22 — Brain Trustworthiness Layer.
-- Additive columns on Narrative: every cached row carries the verifier's
-- coverage telemetry so the trust dashboard reads real data instead of
-- self-extracting numbers from prose. Defaults preserve existing rows.
ALTER TABLE "Narrative" ADD COLUMN "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Narrative" ADD COLUMN "trustLabel" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Narrative" ADD COLUMN "claimsTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Narrative" ADD COLUMN "claimsMatched" INTEGER NOT NULL DEFAULT 0;

-- Index to support the trust dashboard's distribution counts.
CREATE INDEX "Narrative_trustLabel_idx" ON "Narrative"("trustLabel");
