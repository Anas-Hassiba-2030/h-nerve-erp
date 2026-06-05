"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { generateDigest } from "@/lib/ai/digest";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

// Spawns a fresh weekly digest. Manager-grade only — these snapshots are
// expensive (run every heuristic) and become permanent records.
export async function generateNewDigest() {
  const user = await requireUser();
  const ar = getLocale() === "ar";
  if (!hasRole(user, "MANAGER")) {
    throw new Error("FORBIDDEN");
  }
  let digestId: string;
  try {
    const digest = await generateDigest();
    digestId = digest.id;
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "generate-digest",
      label: ar
        ? `تعذّر إنشاء الملخص: ${(e as Error).message || "خطأ"}`
        : `Digest generation failed: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/digest");
    return;
  }
  revalidatePath("/digest");
  redirect(`/digest/${digestId}`);
}
