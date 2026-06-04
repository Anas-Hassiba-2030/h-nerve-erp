"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { generateDigest } from "@/lib/ai/digest";

// Spawns a fresh weekly digest. Manager-grade only — these snapshots are
// expensive (run every heuristic) and become permanent records.
export async function generateNewDigest() {
  const user = await requireUser();
  if (!hasRole(user, "MANAGER")) {
    throw new Error("FORBIDDEN");
  }
  const digest = await generateDigest();
  revalidatePath("/digest");
  redirect(`/digest/${digest.id}`);
}
