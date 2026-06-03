import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const r1: any = await p.$queryRaw`SELECT "tenantId", COUNT(*)::int as n FROM "Booking" GROUP BY "tenantId" ORDER BY "tenantId"`;
  const r2: any = await p.$queryRaw`SELECT "tenantId", COUNT(*)::int as n FROM "Crop" GROUP BY "tenantId"`;
  console.log("Booking by tenant:", r1);
  console.log("Crop by tenant:", r2);
  await p.$disconnect();
})();
