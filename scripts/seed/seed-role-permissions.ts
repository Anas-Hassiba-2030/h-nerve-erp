// scripts/seed-role-permissions.ts
//
// Idempotent: writes the current hardcoded POLICY in lib/permissions.ts
// into RolePermission rows. Re-running upserts; will not clobber rows
// the user has already toggled via /admin/permissions-preview.
//
//   npx tsx scripts/seed-role-permissions.ts

import { PrismaClient } from "@prisma/client";
import { canAccess, GATED_ROLES, type PermRole } from "@/lib/auth/permissions";

const prisma = new PrismaClient();

// Every route the permissions-preview UI surfaces. Adding a route to
// SECTIONS in app/(admin)/admin/permissions-preview/page.tsx? Add it
// here too so the seed covers the new cell.
const ALL_PATHS = [
  // Workspace
  "/dashboard", "/companies", "/analytics", "/compare", "/search", "/pinned",
  // Operations
  "/hotels", "/dairy", "/farms", "/education",
  // Intelligence
  "/brain/graph", "/supply-chain", "/insights", "/alerts", "/workflows", "/documents",
  // Growth & Capital
  "/finance", "/markets", "/sustainability", "/projects", "/reports",
  // People
  "/messages", "/tasks", "/achievements", "/employees", "/users",
  // Admin console
  "/admin/system", "/admin/tenants", "/admin/empire", "/admin/users", "/admin/permissions-preview",
  // Admin family
  "/admin/imports", "/admin/products", "/admin/warehouses", "/admin/journal", "/admin/accounts", "/admin/brain",
];

async function main() {
  console.log(`Seeding ${ALL_PATHS.length * GATED_ROLES.length} role-permission cells …\n`);
  let wrote = 0;
  for (const role of GATED_ROLES as readonly PermRole[]) {
    for (const path of ALL_PATHS) {
      const allowed = canAccess(role, path);
      await prisma.rolePermission.upsert({
        where: { role_path: { role, path } },
        create: { role, path, allowed, updatedBy: "seed" },
        update: {}, // do NOT overwrite manual toggles
      });
      wrote++;
    }
  }
  const total = await prisma.rolePermission.count();
  console.log(`Wrote/touched ${wrote} cells. Table total: ${total}.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
