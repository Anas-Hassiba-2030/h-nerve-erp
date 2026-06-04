// Local-only: the holding-company execs (admin, ceo) were seeded onto
// الحوراني القابضة (HH), which has no direct operations — so the workspace
// cookie scoped their "group pulse" dashboard to an empty company. Setting
// companyId=null makes them cross-tenant (no workspace cookie at login), so
// the executive dashboard aggregates the WHOLE group's real seeded data.
import { prismaUnscoped as prisma } from "@/lib/db/db";

(async () => {
  const r = await prisma.user.updateMany({
    where: { email: { in: ["admin@hourani.jo", "ceo@hourani.jo"] } },
    data: { companyId: null },
  });
  console.log(`set companyId=null on ${r.count} exec user(s)`);
  process.exit(0);
})();
