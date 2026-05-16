"use server";

// Phase C — enter / exit a company workspace. Setting the cookie makes
// the scoped Prisma client (lib/db.ts) filter allow-listed models to this
// company until the user exits.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function enterWorkspace(formData: FormData) {
  await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  // Validate against the UNSCOPED client — the switcher must see every
  // company regardless of any active workspace.
  const company = await prismaUnscoped.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) redirect("/companies");
  cookies().set(WORKSPACE_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/workspace"); // Phase G1: land on the Company Command Center
}

export async function exitWorkspace() {
  await requireUser();
  cookies().delete(WORKSPACE_COOKIE);
  redirect("/companies");
}
