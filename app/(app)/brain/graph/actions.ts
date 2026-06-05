"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { seedBrainGraph } from "@/lib/brain/seedGraph";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

/**
 * Form-friendly variant: returns void so it can be used directly in
 * `<form action={rebuildBrainGraph}>`. The result is reflected via
 * revalidatePath rather than returned data.
 */
export async function rebuildBrainGraph(): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  try {
    await seedBrainGraph();
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "rebuild-graph",
      label: ar
        ? `تعذّر إعادة بناء الرسم البياني: ${(e as Error).message || "خطأ"}`
        : `Graph rebuild failed: ${(e as Error).message || "error"}`,
    });
  }
  revalidatePath("/brain/graph");
}

/** Programmatic variant — returns the seeder's report. */
export async function rebuildBrainGraphReport() {
  await requireUser();
  const result = await seedBrainGraph();
  revalidatePath("/brain/graph");
  return result;
}

export async function clearBrainGraph(): Promise<void> {
  await requireUser();
  // Edges first (cascade would handle it but be explicit).
  await prisma.brainEdge.deleteMany({});
  await prisma.brainNode.deleteMany({});
  revalidatePath("/brain/graph");
}
