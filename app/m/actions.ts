"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";

// Approve / dismiss handlers for the mobile today screen.
// Each is a thin wrapper that mutates the right table and triggers a
// path revalidation so the next pull-to-refresh sees the updated list.

export async function dismissInsight(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.aIInsight.update({
    where: { id },
    data: { status: "DISMISSED" },
  });
  revalidatePath("/m");
}

export async function approveWorkflowRetry(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // We don't actually re-run the workflow here — the workflows runtime
  // owns retries. We mark the run as DRY_RUN so it leaves the FAILED
  // bucket and the next pull surfaces something else.
  await prisma.workflowRun.update({
    where: { id },
    data: { status: "DRY_RUN" },
  });
  revalidatePath("/m");
}

export async function reconnectIntegration(formData: FormData): Promise<void> {
  await requireUser();
  const providerKey = String(formData.get("providerKey") ?? "");
  if (!providerKey) return;
  await prisma.integration.update({
    where: { scope_providerKey: { scope: "default", providerKey } },
    data: { status: "CONNECTED", errorCount: 0 },
  });
  revalidatePath("/m");
  revalidatePath("/integrations");
  revalidatePath(`/integrations/${providerKey}`);
}
