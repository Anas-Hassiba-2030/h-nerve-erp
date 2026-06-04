"use server";

// Phase 21 — Genesis Seed.
// Superadmin-only actions behind the /admin/genesis wizard.
//
//   • runGenesisSeed     — DESTRUCTIVE full reseed (wipes + rebuilds the Hourani
//                          demo dataset). Guarded by an explicit confirmation
//                          token so a stray click can never wipe live data.
//   • seedMissingGenesis — ADDITIVE, IDEMPOTENT. Reads live counts, finds the
//                          EMPTY recipe sectors, ensures shared parents exist
//                          (find-or-create, NO wipe), then builds only those
//                          missing sectors. Fills a sparse workspace without
//                          ever deleting or overwriting existing data.
//   • topUpDemoCorpus    — IDEMPOTENT, non-destructive. Inserts the demo document
//                          corpus only when the Document table is empty (mirrors
//                          scripts/seed/ensure-demo-docs.ts), so it fixes a bare
//                          workspace without ever touching uploaded data.
//
// Boundary: these run through the unscoped Prisma instance because genesis
// operates across the whole workspace, mirroring how `npm run db:seed` works.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { seedOperator } from "@/prisma/seed";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("ADMIN role required");
  return user;
}

export async function runGenesisSeed(formData: FormData): Promise<void> {
  await requireAdmin();

  // No-accidental-wipe guard: the destructive reseed only fires when the
  // operator has explicitly acknowledged the wipe (the danger panel posts
  // confirm=WIPE once its checkbox is ticked). Anything else is rejected.
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "WIPE") {
    redirect("/admin/genesis?error=confirm");
  }

  await seedOperator();
  redirect("/admin/genesis?seeded=1");
}

export async function seedMissingGenesis(): Promise<void> {
  await requireAdmin();

  // CROSS-TENANT INTENT: additive genesis fills the default-scope demo dataset
  // across the whole workspace, exactly like the deploy-time seed — but it only
  // creates EMPTY sectors and never wipes, so it's safe with no confirm token.
  const { prismaUnscoped } = await import("@/lib/db");
  const { seedMissingSectors } = await import("@/prisma/seedSectors");

  let result;
  try {
    result = await seedMissingSectors(prismaUnscoped);
  } catch {
    redirect("/admin/genesis?fill=error");
  }

  if (result.nothingToDo) {
    redirect("/admin/genesis?fill=skip");
  }
  redirect(`/admin/genesis?fill=${result.built.length}`);
}

export async function topUpDemoCorpus(): Promise<void> {
  const user = await requireAdmin();

  // CROSS-TENANT INTENT: genesis top-up writes the default-scope demo corpus
  // across the whole workspace, exactly like the deploy-time ensure script.
  const { prismaUnscoped } = await import("@/lib/db");
  const { seedDemoDocuments } = await import("@/prisma/seedDemoDocuments");

  const existing = await prismaUnscoped.document.count().catch(() => 0);
  if (existing > 0) {
    // Non-destructive: never overwrite a workspace that already has documents
    // (including ones a user uploaded). Report "nothing to do".
    redirect("/admin/genesis?topup=skip");
  }

  const adminId =
    (await prismaUnscoped.user
      .findFirst({ where: { role: "ADMIN" }, select: { id: true } })
      .catch(() => null))?.id ?? user.id;

  let n = 0;
  try {
    n = await seedDemoDocuments(prismaUnscoped, adminId);
  } catch {
    redirect("/admin/genesis?topup=error");
  }
  redirect(`/admin/genesis?topup=${n}`);
}
