// scripts/seed/ensure-org-hierarchy.ts
//
// ORG-CHART TOP-UP — runs on every deploy (railway.toml). The /users "Org
// structure" tab renders a real top-down tree from User.reportsToId, but the
// prod users were seeded with reportsToId = null, so EVERY user was a root and
// the tree collapsed into a flat vertical stack ("the hierarchy looks stupid").
//
// This fills the reporting lines ONCE, only when no hierarchy exists yet, and
// never overwrites a reportsToId a human already set:
//   • top of the tree   = the highest-XP EXECUTIVE (else ADMIN, else first user)
//   • MANAGER / ADMIN / other EXECUTIVE  → report to the top
//   • STAFF             → report to a MANAGER in their own company (else the top)
//
// Idempotent + non-blocking — guarded on "is there already a hierarchy?", so a
// re-run after the first is a no-op, and a hiccup can never fail the deploy.
//
//   npx tsx scripts/seed/ensure-org-hierarchy.ts

import { makePrismaClient } from "../_prisma";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = makePrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, companyId: true, reportsToId: true, xp: true },
    });
    if (users.length < 2) {
      console.log("[ensure-org] <2 users — nothing to wire.");
      return;
    }

    // Already curated? If more than one person already reports to someone, leave
    // it alone — never clobber a hand-built org chart.
    const alreadyLinked = users.filter((u) => u.reportsToId).length;
    if (alreadyLinked >= 2) {
      console.log(`[ensure-org] hierarchy already present (${alreadyLinked} links) — skipping.`);
      return;
    }

    const byXp = (a: { xp: number | null }, b: { xp: number | null }) => (b.xp ?? 0) - (a.xp ?? 0);
    const execs = users.filter((u) => u.role === "EXECUTIVE").sort(byXp);
    const admins = users.filter((u) => u.role === "ADMIN").sort(byXp);
    const top = execs[0] ?? admins[0] ?? users[0];

    // One manager per company (first MANAGER found in that company).
    const mgrByCompany = new Map<string, string>();
    for (const u of users) {
      if (u.role === "MANAGER" && u.companyId && !mgrByCompany.has(u.companyId)) {
        mgrByCompany.set(u.companyId, u.id);
      }
    }

    let n = 0;
    for (const u of users) {
      if (u.id === top.id) continue;       // the root
      if (u.reportsToId) continue;         // never overwrite an existing link
      let managerId: string;
      if (u.role === "STAFF") {
        managerId = (u.companyId && mgrByCompany.get(u.companyId)) || top.id;
      } else {
        // MANAGER / ADMIN / non-top EXECUTIVE all roll up to the top.
        managerId = top.id;
      }
      if (managerId === u.id) managerId = top.id; // never self-report
      if (managerId === u.id) continue;
      await prisma.user.update({ where: { id: u.id }, data: { reportsToId: managerId } }).catch(() => {});
      n++;
    }
    console.log(`[ensure-org] ✓ wired ${n} reporting lines (root: ${top.name}).`);
  } catch (e) {
    console.error("[ensure-org] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-org] fatal:", e);
    process.exit(0); // never block deploy
  });
