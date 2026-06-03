// scripts/reset-admin-password.ts
//
// One-shot admin password reset against whichever database DATABASE_URL
// is currently pointed at. NEVER prints the password. Usage:
//
//   ADMIN_NEW_PW='whatever' npx tsx scripts/reset-admin-password.ts admin@hourani.jo
//
// Guards: password must satisfy lib/password policy; target user must
// exist; refuses to run with no ADMIN_NEW_PW. Delete this file after
// running if you don't need it again.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { passwordError } from "@/lib/password";

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const pw = process.env.ADMIN_NEW_PW ?? "";

  if (!email) {
    console.error("Usage: ADMIN_NEW_PW=... npx tsx scripts/reset-admin-password.ts <email>");
    process.exit(2);
  }
  const policy = passwordError(pw, false);
  if (policy) {
    console.error("REFUSED: password fails policy —", policy);
    process.exit(3);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`REFUSED: no user with email ${email}`);
      process.exit(4);
    }
    const hash = await bcrypt.hash(pw, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, active: true },
    });
    console.log(`OK · password reset for ${email} (role=${user.role}, active=true)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
