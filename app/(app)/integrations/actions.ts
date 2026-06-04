"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  connectProvider,
  disconnectProvider,
  updateSettings,
} from "@/lib/integrations/runtime";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";

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
  // Phase NS-4 — API-key providers route to their detail page; do
  // NOT pre-mark CONNECTED before a real key is validated.
  if (providerKey === "sendgrid" || providerKey === "resend") {
    revalidatePath(`/integrations/${providerKey}`);
    redirect(`/integrations/${providerKey}`);
  }
  await new Promise((r) => setTimeout(r, 420));
  await connectProvider(providerKey, "default");
  revalidatePath("/integrations");
  redirect(`/integrations/${providerKey}`);
}

// Phase NS-4 — real API-key validation. Hits the provider's "whoami"
// endpoint with the supplied key; only persists on 200 OK.
async function validateSendGridKey(apiKey: string) {
  try {
    const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false as const, error: `SendGrid rejected the key (HTTP ${res.status}).` };
    const data: any = await res.json().catch(() => ({}));
    return { ok: true as const, account: data.email ?? data.username ?? "SendGrid account" };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "network error" };
  }
}

async function validateResendKey(apiKey: string) {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false as const, error: `Resend rejected the key (HTTP ${res.status}).` };
    const data: any = await res.json().catch(() => ({}));
    const firstDomain = Array.isArray(data?.data) && data.data[0]?.name ? data.data[0].name : "Resend account";
    return { ok: true as const, account: firstDomain };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "network error" };
  }
}

export async function connectWithApiKey(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const fromAddress = String(formData.get("fromAddress") ?? "").trim();
  if (!providerKey || !apiKey) {
    flashToast({ type: "info", entity: "info", label: "API key مطلوب · API key required" });
    return;
  }
  const validator =
    providerKey === "sendgrid" ? validateSendGridKey :
    providerKey === "resend"   ? validateResendKey :
    null;
  if (!validator) {
    flashToast({ type: "info", entity: "info", label: "Provider doesn't support API-key auth." });
    return;
  }
  const result = await validator(apiKey);
  if (!result.ok) {
    flashToast({ type: "info", entity: "info", label: `⚠ ${result.error}` });
    revalidatePath(`/integrations/${providerKey}`);
    return;
  }
  await prisma.integration.upsert({
    where: { scope_providerKey: { scope: "default", providerKey } },
    create: {
      scope: "default",
      providerKey,
      status: "CONNECTED",
      account: result.account,
      scopesJson: JSON.stringify(providerKey === "sendgrid" ? ["mail.send"] : ["emails:send"]),
      settingsJson: JSON.stringify({ fromAddress }),
      connectedAt: new Date(),
      lastUsedAt: new Date(),
      credential: { create: { tokenBlob: apiKey, expiresAt: null } },
    },
    update: {
      status: "CONNECTED",
      account: result.account,
      settingsJson: JSON.stringify({ fromAddress }),
      connectedAt: new Date(),
      lastUsedAt: new Date(),
      errorCount: 0,
      credential: {
        upsert: {
          create: { tokenBlob: apiKey, expiresAt: null },
          update: { tokenBlob: apiKey, expiresAt: null, rotatedAt: new Date() },
        },
      },
    },
  });
  flashToast({ type: "info", entity: "info", label: "✓ Connected · تم الاتصال" });
  revalidatePath("/integrations");
  revalidatePath(`/integrations/${providerKey}`);
}
