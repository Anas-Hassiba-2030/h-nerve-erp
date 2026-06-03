-- Phase i18n — bilingual task titles.
-- Additive, nullable English column so task lists translate with the UI locale.
-- Existing rows keep NULL and fall back to the Arabic title at render time.
ALTER TABLE "Task" ADD COLUMN "titleEn" TEXT;
