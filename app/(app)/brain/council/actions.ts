"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { council } from "@/lib/brain/council.live";
import { prisma } from "@/lib/db";

export async function convene(formData: FormData): Promise<void> {
  await requireUser();
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic || topic.length < 6) {
    throw new Error("topic too short");
  }
  // contextRefs is optional — comma-separated node ids
  const refsRaw = String(formData.get("contextRefs") ?? "").trim();
  const contextRefs = refsRaw ? refsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const session = await council().convene(topic, contextRefs);
  revalidatePath("/brain/council");
  redirect(`/brain/council/${session.id}`);
}

export async function deleteSession(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.councilSession.delete({ where: { id } });
  revalidatePath("/brain/council");
}
