"use server";

// Server action for the client-driven recall surface (/memory).
//
// "forget" is a HARD delete: the Memory model has no `deletedAt` column
// (it is brain-owned schema; adding soft-delete there is a separate,
// brain-team migration), so forgetting a memory removes the row. Same
// behavior as the existing /brain/memory deleteMemory action — kept
// consistent rather than inventing a half-soft variant.

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/db";

export async function forgetMemory(id: string): Promise<void> {
  await requireRole("MANAGER");
  if (!id) return;
  await prisma.memory.delete({ where: { id } });
  revalidatePath("/memory");
  revalidatePath("/brain/memory");
}
