"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { seedMemoryLake } from "@/lib/brain/seedMemories";
import { memoryLake } from "@/lib/brain/memory.live";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

export async function seedMemories(): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  try {
    await seedMemoryLake();
  } catch (e) {
    await flashToast({
      type: "info",
      entity: "info",
      id: "seed-memories",
      label: ar
        ? `تعذّر بذر الذاكرة: ${(e as Error).message || "خطأ"}`
        : `Memory seed failed: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/brain/memory");
    return;
  }
  revalidatePath("/brain/memory");
  revalidatePath("/insights");
}

export async function deleteMemory(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.memory.delete({ where: { id } });
  revalidatePath("/brain/memory");
}

export async function clearMemories(): Promise<void> {
  await requireUser();
  await prisma.memory.deleteMany({});
  revalidatePath("/brain/memory");
}

/** For client components / debug — fetch top-K memories matching a free-text situation. */
export async function recallMemories(input: {
  situation: string;
  topK?: number;
  filterTags?: string[];
}) {
  await requireUser();
  const result = await memoryLake().recall({
    situation: input.situation.slice(0, 1000),
    topK: input.topK ?? 3,
    filterTags: input.filterTags ?? [],
  });
  return result;
}
