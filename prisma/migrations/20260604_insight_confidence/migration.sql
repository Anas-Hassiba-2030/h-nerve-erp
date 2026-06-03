-- Phase 22 — engine confidence for each insight, drives the TrustChip on
-- /insights. Additive + nullable so existing rows are unaffected (the chip
-- simply hides when confidence is null).
ALTER TABLE "AIInsight" ADD COLUMN "confidence" DOUBLE PRECISION;
