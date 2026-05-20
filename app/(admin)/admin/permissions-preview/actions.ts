"use server";

// Phase P5 — toggle a single (role, path) cell. ADMIN-gated.
// Writes to RolePermission and revalidates the preview page.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function togglePermission(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("forbidden");

  const role = String(formData.get("role") ?? "").trim();
  const path = String(formData.get("path") ?? "").trim();
  const allowed = String(formData.get("allowed") ?? "") === "true";
  if (!role || !path) return;

  // Upsert by composite unique (role, path). updatedBy stamps audit trail.
  await prisma.rolePermission.upsert({
    where: { role_path: { role, path } },
    create: { role, path, allowed, updatedBy: user.email },
    update: { allowed, updatedBy: user.email },
  });
  revalidatePath("/admin/permissions-preview");
}
