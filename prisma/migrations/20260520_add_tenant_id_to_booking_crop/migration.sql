-- Phase F4: add tenantId to Booking + Crop and backfill via parent.
ALTER TABLE "Booking" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Crop"    ADD COLUMN "tenantId" TEXT;

UPDATE "Booking" b
SET "tenantId" = CASE c.code
  WHEN 'HOTELS' THEN 'hourani-hotels'
  WHEN 'MAHA'   THEN 'maha-dairy'
  WHEN 'LORAN'  THEN 'loran-agri'
  WHEN 'TANK'   THEN 'tank-incubator'
  ELSE NULL
END
FROM "Hotel" h, "Company" c
WHERE b."hotelId" = h.id AND h."companyId" = c.id;

UPDATE "Crop" cr
SET "tenantId" = CASE c.code
  WHEN 'HOTELS' THEN 'hourani-hotels'
  WHEN 'MAHA'   THEN 'maha-dairy'
  WHEN 'LORAN'  THEN 'loran-agri'
  WHEN 'TANK'   THEN 'tank-incubator'
  ELSE NULL
END
FROM "Farm" f, "Company" c
WHERE cr."farmId" = f.id AND f."companyId" = c.id;

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM "Booking" WHERE "tenantId" IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'Booking has % rows with NULL tenantId', n; END IF;
  SELECT COUNT(*) INTO n FROM "Crop" WHERE "tenantId" IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'Crop has % rows with NULL tenantId', n; END IF;
END $$;

ALTER TABLE "Booking" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Crop"    ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX "Crop_tenantId_idx"    ON "Crop"("tenantId");
