"use server";

// Phase 21 — Genesis Seed.
// Superadmin-only action that populates (or resets) the workspace with the
// full Hourani demo dataset: companies, hotels, rooms, dairy, farms, brain
// memory, council history, and default credentials.
//
// Boundary: the seed runs through its own Prisma instance (not the scoped
// operator client) because it must bypass workspace isolation to wipe and
// rebuild. This is intentional and mirrors how npm run db:seed works.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { seedOperator } from "@/prisma/seed";

export async function runGenesisSeed(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("ADMIN role required");

  await seedOperator();
  redirect("/admin/genesis?seeded=1");
}
