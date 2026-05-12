"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  connectProvider,
  disconnectProvider,
  updateSettings,
} from "@/lib/integrations/runtime";

export async function connect(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  const account = String(formData.get("account") ?? "").trim() || undefined;
  if (!providerKey) throw new Error("providerKey required");
  // Synthetic delay so the connect flip animation has time to play.
  await new Promise((r) => setTimeout(r, 420));
  await connectProvider(providerKey, "default", account);
  revalidatePath("/integrations");
  revalidatePath(`/integrations/${providerKey}`);
}

export async function disconnect(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  if (!providerKey) return;
  await disconnectProvider(providerKey, "default");
  revalidatePath("/integrations");
  revalidatePath(`/integrations/${providerKey}`);
}

export async function saveSettings(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  if (!providerKey) return;

  const settings: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "providerKey") continue;
    if (k.startsWith("setting:")) {
      settings[k.slice("setting:".length)] = String(v);
    }
  }
  await updateSettings(providerKey, settings, "default");
  revalidatePath(`/integrations/${providerKey}`);
}

export async function connectAndOpen(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  if (!providerKey) throw new Error("providerKey required");
  await new Promise((r) => setTimeout(r, 420));
  await connectProvider(providerKey, "default");
  revalidatePath("/integrations");
  redirect(`/integrations/${providerKey}`);
}
