-- Phase i18n — bilingual supply-forecast labels.
-- Additive, nullable English column so forecast labels translate with the UI
-- locale. Existing rows keep NULL and fall back to productLabel at render time.
ALTER TABLE "SupplyForecast" ADD COLUMN "productLabelEn" TEXT;
