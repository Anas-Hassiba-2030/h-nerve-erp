-- Phase i18n — bilingual AI insights.
-- Additive, nullable English columns so the insight feed translates with the
-- UI locale. Existing rows keep NULL and fall back to the Arabic title/body
-- at render time, so this is safe on a populated production database.
ALTER TABLE "AIInsight" ADD COLUMN "titleEn" TEXT;
ALTER TABLE "AIInsight" ADD COLUMN "bodyEn" TEXT;
