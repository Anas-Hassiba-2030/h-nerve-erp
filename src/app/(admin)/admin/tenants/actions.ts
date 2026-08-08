"use server";

// Tenant provisioning server actions (Phase 11).
//
// Two patterns:
//   • createTenant: writes the Tenant row + 5 PENDING TenantStep rows,
//     redirects to /admin/tenants/[id]/provisioning so the user watches
//     the live checklist tick.
//   • runProvisioningStep: server-action called once per step from the
//     client side of the provisioning page. Each runs the real DB work
//     for its step + a synthetic delay so the UI feels like a real
//     provisioning sequence.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { scoped } from "@/lib/utils/logger";
import { flashToast } from "@/lib/utils/toast";

const log = scoped("tenancy");
import {
  STEP_ORDER,
  STEP_LABELS,
  STEP_DELAY_MS,
  isValidSlug,
  tenancyCookies,
  type ProvisioningStepKey,
} from "@/lib/tenancy/tenancy";
import { THEME_PRESETS, type ThemeKey, type PackKey } from "@/lib/brand/themes";
import {
  isModuleKey,
  canEnableModule,
  dependentsOf,
  resolveStarterModules,
  type IndustryKey,
} from "@/lib/tenancy/moduleCatalog";
import { invalidateModuleCache } from "@/lib/tenancy/moduleGate";

const VALID_PACKS: PackKey[] = ["hospitality", "dairy", "agri", "education", "finance"];

export async function createTenant(formData: FormData): Promise<void> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase().slice(0, 32);
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase().slice(0, 120);
  const region = String(formData.get("region") ?? "MENA").trim().slice(0, 32);
  const theme = String(formData.get("theme") ?? "heritage") as ThemeKey;
  // The wizard's "industry packs" checkboxes pick a starting vertical, not
  // individual modules — expand each chosen industry into its starter
  // module bundle (moduleCatalog.ts) so every TenantPack row written here
  // is a real ModuleKey, never the raw industry string. See
  // docs/SYSTEM-BLUEPRINT.md §9.3.
  const industries = formData
    .getAll("packs")
    .map((p) => String(p))
    .filter((p): p is IndustryKey => VALID_PACKS.includes(p as PackKey));
  const moduleKeys = resolveStarterModules(industries);

  if (!name || name.length < 2) throw new Error("name required");
  if (!isValidSlug(slugRaw)) throw new Error("invalid slug");
  if (!adminEmail || !adminEmail.includes("@")) throw new Error("admin email required");
  if (!THEME_PRESETS[theme]) throw new Error("invalid theme");

  const existing = await prisma.tenant.findUnique({ where: { slug: slugRaw } });
  if (existing) throw new Error("slug already in use");

  // Persist tenant + step ledger + theme + packs in a single transaction
  // so the provisioning page has everything to walk through.
  const tenant = await prisma.tenant.create({
    data: {
      slug: slugRaw,
      name,
      adminEmail,
      region: region || "MENA",
      tier: "standard",
      status: "PROVISIONING",
      steps: {
        create: STEP_ORDER.map((key, i) => ({
          orderIndex: i,
          key,
          labelEn: STEP_LABELS[key].en,
          labelAr: STEP_LABELS[key].ar,
          status: "PENDING",
        })),
      },
      theme: {
        create: {
          preset: theme,
          emblem: THEME_PRESETS[theme].emblem,
        },
      },
      packs: {
        create: moduleKeys.map((key) => ({ packKey: key, enabled: true })),
      },
    },
  });

  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants/${tenant.id}/provisioning`);
}

/**
 * Runs a single provisioning step. Idempotent: a DONE step short-circuits.
 * Each step does a small amount of real DB work + a synthetic delay so
 * the live checklist feels like an actual provisioning sequence.
 */
export async function runProvisioningStep(
  tenantId: string,
  key: ProvisioningStepKey
): Promise<{ ms: number; status: "DONE" | "FAILED" }> {
  await requireUser();

  const step = await prisma.tenantStep.findFirst({
    where: { tenantId, key },
  });
  if (!step) return { ms: 0, status: "FAILED" };
  if (step.status === "DONE") {
    return { ms: step.durationMs ?? 0, status: "DONE" };
  }

  const startedAt = new Date();
  await prisma.tenantStep.update({
    where: { id: step.id },
    data: { status: "RUNNING", startedAt },
  });

  try {
    // Real per-step work.
    if (key === "subdomain") {
      // Confirm slug uniqueness one more time (could have raced).
      // No-op for the demo since the form-action already reserved it.
    } else if (key === "schema") {
      // For the demo we don't actually clone schemas; track the gesture.
    } else if (key === "seed") {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        // For the demo we just bump a counter — in production this would
        // run the per-pack seed scripts.
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { seededCount: 42 },
        });
      }
    } else if (key === "theme") {
      // Theme already created at tenant creation; this step bumps the
      // updatedAt so the audit log shows it landed.
      await prisma.tenantTheme.updateMany({
        where: { tenantId },
        data: {},
      });
    } else if (key === "invite") {
      const token = `inv_${randomBytes(8).toString("hex")}`;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          inviteToken: token,
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });
    }

    // Synthetic delay for the demo punch.
    await sleep(STEP_DELAY_MS[key]);

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    await prisma.tenantStep.update({
      where: { id: step.id },
      data: { status: "DONE", completedAt, durationMs },
    });
    return { ms: durationMs, status: "DONE" };
  } catch (e) {
    log.error("step failed", { step: key, err: String(e) });
    await prisma.tenantStep.update({
      where: { id: step.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    return { ms: 0, status: "FAILED" };
  }
}

export async function viewAsTenant(formData: FormData): Promise<void> {
  await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return;
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { theme: true },
  });
  if (!t) return;
  const theme = (t.theme?.preset as ThemeKey) ?? "heritage";

  (await cookies()).set(tenancyCookies.VIEW_AS, t.slug, { path: "/", maxAge: 60 * 60 * 8 });
  (await cookies()).set(tenancyCookies.THEME, theme, { path: "/", maxAge: 60 * 60 * 8 });
  // Land on the tenant's Orbit hub — the top of their workspace — not a deep
  // operator page. The ViewAsBanner stays pinned so the admin can exit.
  redirect("/orrery");
}

export async function clearViewAs(): Promise<void> {
  await requireUser();
  (await cookies()).delete(tenancyCookies.VIEW_AS);
  (await cookies()).delete(tenancyCookies.THEME);
  revalidatePath("/dashboard");
  revalidatePath("/admin/tenants");
  // Exiting preview returns the admin to the console, not the operator UI.
  redirect("/admin/tenants");
}

/**
 * Toggle one module on/off for a tenant — the write path behind
 * /admin/tenants/[id]/modules. Enforces the catalog's `requires` edges
 * server-side in both directions so a checkbox alone can never produce an
 * incoherent tenant (docs/SYSTEM-BLUEPRINT.md §9.3 item 4):
 *   - enabling: every dependency must already be on.
 *   - disabling: nothing currently-enabled may still depend on this module.
 * Blocked attempts flash a toast naming exactly what's missing/blocking —
 * a disabled-looking button with no feedback reads as broken (feedback:
 * every mutating control needs visible confirmation).
 */
export async function toggleTenantModule(formData: FormData): Promise<void> {
  await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "");
  const moduleKey = String(formData.get("moduleKey") ?? "");
  const nextEnabled = String(formData.get("enabled") ?? "") === "true";

  if (!tenantId || !isModuleKey(moduleKey)) {
    await flashToast({ type: "info", entity: "info", label: "Invalid module toggle" });
    return;
  }

  const current = await prisma.tenantPack.findMany({
    where: { tenantId, enabled: true },
    select: { packKey: true },
  });
  const enabledKeys = current.map((c) => c.packKey).filter(isModuleKey);

  if (nextEnabled) {
    const { ok, missing } = canEnableModule(moduleKey, enabledKeys);
    if (!ok) {
      await flashToast({
        type: "info",
        entity: "info",
        label: `⚠ Enable ${missing.join(", ")} first`,
      });
      revalidatePath(`/admin/tenants/${tenantId}/modules`);
      return;
    }
  } else {
    const dependents = dependentsOf(moduleKey, enabledKeys);
    if (dependents.length > 0) {
      await flashToast({
        type: "info",
        entity: "info",
        label: `⚠ ${dependents.join(", ")} still need this`,
      });
      revalidatePath(`/admin/tenants/${tenantId}/modules`);
      return;
    }
  }

  await prisma.tenantPack.upsert({
    where: { tenantId_packKey: { tenantId, packKey: moduleKey } },
    create: { tenantId, packKey: moduleKey, enabled: nextEnabled },
    update: { enabled: nextEnabled },
  });
  // The (app) layout's module gate (moduleGate.ts) caches this tenant's
  // enabled set for 60s — invalidate now so a toggle is visible on the
  // toggling admin's very next navigation, not up to a minute later.
  invalidateModuleCache(tenantId);

  revalidatePath(`/admin/tenants/${tenantId}/modules`);
  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function deleteTenant(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.tenant.delete({ where: { id } });
  revalidatePath("/admin/tenants");
  redirect("/admin/tenants");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
