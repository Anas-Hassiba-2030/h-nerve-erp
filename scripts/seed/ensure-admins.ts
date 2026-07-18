// scripts/ensure-admins.ts
//
// LOGIN SAFETY NET — runs on EVERY deploy (railway.toml preDeployCommand),
// independently of scripts/seed-if-empty.ts.
//
// seed-if-empty only bootstraps a *completely empty* database. But a
// half-seeded DB, a DB where the owner signed up as plain STAFF, or a DB
// where the demo admin was never created leaves no way in — the exact
// lockout we hit in production. This script closes that hole: it UPSERTS the
// known administrator accounts so there is ALWAYS at least one credential
// that works, and it can never lock anyone out.
//
//   admin@hourani.jo              — demo/recovery admin (password: admin123)
//   <each lib/owner.ts owner>     — the product owner(s), always ADMIN
//
// Idempotent by design:
//   • CREATE  → makes the account with a known password, ADMIN, active.
//   • UPDATE  → force role=ADMIN + active=true (fixes the STAFF lockout),
//               and reset the password to the known value so a forgotten
//               password is always recoverable after a deploy.
//
// Passwords:
//   • admin@hourani.jo always uses admin123 (it's the documented demo login).
//   • owner accounts use SEED_ADMIN_PASSWORD if set, else admin123. Set
//     SEED_ADMIN_PASSWORD on Railway to keep the owner password private.
//   • Set ENSURE_ADMINS_RESET_PASSWORD=0 to skip resetting passwords on
//     existing accounts (still fixes role/active). Default resets, because
//     guaranteed access is the whole point of this script.
//
//   npx tsx scripts/ensure-admins.ts

import { makePrismaClient } from "../_prisma";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ownerEmails } from "@/lib/auth/owner";

const DEMO_ADMIN_EMAIL = "admin@hourani.jo";
const DEMO_ADMIN_PASSWORD = "admin123";

async function ensure(
  prisma: PrismaClient,
  email: string,
  name: string,
  password: string,
  resetPasswordOnUpdate: boolean,
) {
  const lower = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (!existing) {
    await prisma.user.create({
      data: { email: lower, name, passwordHash, role: "ADMIN", active: true },
    });
    console.log(`[ensure-admins] created ${lower} (ADMIN).`);
    return;
  }

  await prisma.user.update({
    where: { email: lower },
    data: {
      role: "ADMIN",
      active: true,
      ...(resetPasswordOnUpdate ? { passwordHash } : {}),
    },
  });
  console.log(
    `[ensure-admins] ensured ${lower} (ADMIN, active${resetPasswordOnUpdate ? ", password reset" : ""}).`,
  );
}

async function main() {
  const prisma = makePrismaClient();
  const resetPasswordOnUpdate = process.env.ENSURE_ADMINS_RESET_PASSWORD !== "0";
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD || DEMO_ADMIN_PASSWORD;

  try {
    // The demo/recovery admin — always exists with the documented password.
    await ensure(prisma, DEMO_ADMIN_EMAIL, "مدير النظام", DEMO_ADMIN_PASSWORD, true);

    // Every configured product owner (lib/owner.ts + OWNER_EMAILS env).
    for (const email of ownerEmails()) {
      await ensure(prisma, email, "Anas MK Hasiba", ownerPassword, resetPasswordOnUpdate);
    }
    console.log("[ensure-admins] ✓ done.");
  } catch (e) {
    // Never fail the deploy because of this — log and continue.
    console.error("[ensure-admins] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-admins] fatal:", e);
    process.exit(0); // do not block deploy
  });
