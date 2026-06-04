"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { seedBrainGraph } from "@/lib/brain/seedGraph";

/**
 * Form-friendly variant: returns void so it can be used directly in
 * `<form action={rebuildBrainGraph}>`. The result is reflected via
 * revalidatePath rather than returned data.
 */
export async function rebuildBrainGraph(): Promise<void> {
  await requireUser();
  await seedBrainGraph();
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
