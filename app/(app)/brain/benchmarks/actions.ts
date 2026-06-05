"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import {
  enableFederation,
  disableFederation,
  aggregate,
} from "@/lib/brain/federation.live";
import { seedFederation } from "@/lib/brain/seedFederation";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

export async function optInFederation(): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  try {
    await enableFederation("default", me.id);
    await aggregate({ scope: "default" });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "federation-opt-in",
      label: ar
        ? `تعذّر تفعيل الاتحاد: ${(e as Error).message || "خطأ"}`
        : `Federation opt-in failed: ${(e as Error).message || "error"}`,
    });
  }
  revalidatePath("/brain/benchmarks");
}

export async function optOutFederation(): Promise<void> {
  await requireUser();
  await disableFederation("default");
  revalidatePath("/brain/benchmarks");
}

export async function refreshFederation(): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  try {
    await aggregate({ scope: "default" });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "federation-refresh",
      label: ar
        ? `تعذّر تحديث الاتحاد: ${(e as Error).message || "خطأ"}`
        : `Federation refresh failed: ${(e as Error).message || "error"}`,
    });
  }
  revalidatePath("/brain/benchmarks");
}

export async function seedFederationPeers(): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  try {
    await seedFederation();
    await aggregate({ scope: "default" });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "federation-seed",
      label: ar
        ? `تعذّر بذر بيانات الاتحاد: ${(e as Error).message || "خطأ"}`
        : `Federation seed failed: ${(e as Error).message || "error"}`,
    });
  }
  revalidatePath("/brain/benchmarks");
}

export async function clearFederation(): Promise<void> {
  await requireUser();
  await prisma.federationPattern.deleteMany({});
  await prisma.federationPeer.deleteMany({});
  revalidatePath("/brain/benchmarks");
}
