// scripts/create-test-managers.ts
//
// One-shot, idempotent. Creates 4 MANAGER accounts — one per company —
// against whichever database DATABASE_URL is currently pointed at.
// Upserts by email; safe to re-run.
//
//   npx tsx scripts/create-test-managers.ts
//
// Passwords match what the user is sharing internally. Each one passes
// the lib/password policy (≥12 chars, upper+lower+digit).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { passwordError } from "@/lib/password";

type Seed = {
  email: string;
  name: string;
  title: string;
  password: string;
  companyCode: "MAHA" | "HOTELS" | "LORAN" | "TANK";
};

const SEEDS: Seed[] = [
  { email: "manager-maha@hourani.jo",   name: "مدير ألبان المها",        title: "Maha Dairy Manager",     password: "Maha2026!Manager",   companyCode: "MAHA"   },
  { email: "manager-hotels@hourani.jo", name: "مدير فنادق الحوراني",     title: "Hourani Hotels Manager", password: "Hotels2026!Manager", companyCode: "HOTELS" },
  { email: "manager-loran@hourani.jo",  name: "مدير لوران للزراعة",     title: "Loran Agri Manager",     password: "Loran2026!Manager",  companyCode: "LORAN"  },
  { email: "manager-tank@hourani.jo",   name: "مدير حاضنة The Tank",     title: "Tank Incubator Manager", password: "Tank2026!Manager",   companyCode: "TANK"   },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const s of SEEDS) {
      const policy = passwordError(s.password, false);
      if (policy) {
        console.error(`REFUSED: ${s.email} — ${policy}`);
        continue;
      }
      const company = await prisma.company.findUnique({
        where: { code: s.companyCode },
        select: { id: true },
      });
      if (!company) {
        console.error(`SKIPPED: ${s.email} — company ${s.companyCode} not in DB`);
        continue;
      }
      const passwordHash = await bcrypt.hash(s.password, 12);
      const user = await prisma.user.upsert({
        where: { email: s.email },
        create: {
          email: s.email,
          name: s.name,
          title: s.title,
          role: "MANAGER",
          passwordHash,
          companyId: company.id,
          active: true,
        },
        update: {
          name: s.name,
          title: s.title,
          role: "MANAGER",
          passwordHash,
          companyId: company.id,
          active: true,
        },
      });
      console.log(`OK · ${s.email} → company ${s.companyCode} (user.id=${user.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
