"use server";

// Server actions for /crm (Phase 27 — CRM). Lead / Opportunity / CrmActivity
// are tenant-scoped (they carry tenantId; the scoped prisma client filters by
// the active tenant). Mirrors the admin/customers action style: a role gate +
// flashToast + revalidatePath. tenantId is resolved SERVER-SIDE from the active
// tenant — never trusted from the form (the scope middleware also guards
// cross-tenant writes by id).

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";

// Active pipeline stages (terminal WON/LOST handled by closeOpportunity).
const FLOW = ["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION"] as const;
type FlowStage = (typeof FLOW)[number];
const PROBABILITY: Record<string, number> = {
  NEW: 10,
  QUALIFYING: 30,
  PROPOSAL: 55,
  NEGOTIATION: 75,
};

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER", "STAFF"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}
async function ok(label: string) {
  await flashToast({ type: "info", entity: "info", label });
  revalidatePath("/crm");
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/crm");
}
function field(formData: FormData, key: string, max: number): string | null {
  return String(formData.get(key) ?? "").trim().slice(0, max) || null;
}

export async function createLead(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!name) return fail(ar ? "الاسم مطلوب" : "name is required");
  const tenantId = ((await getActiveTenantSlug()) ?? "hourani-hotels").slice(0, 64);
  const expectedRaw = String(formData.get("expectedValue") ?? "").trim();
  const expectedValue = expectedRaw ? Math.max(0, Number(expectedRaw) || 0) : null;
  try {
    await prisma.lead.create({
      data: {
        tenantId,
        name,
        email: field(formData, "email", 200),
        phone: field(formData, "phone", 60),
        company: field(formData, "company", 200),
        source: field(formData, "source", 30),
        expectedValue,
        notes: field(formData, "notes", 1000),
      },
    });
  } catch {
    return fail(ar ? "تعذّر إنشاء العميل المحتمل" : "could not create lead");
  }
  await ok(ar ? "تمت إضافة عميل محتمل" : "Lead added");
}

export async function convertLead(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return fail(ar ? "العميل المحتمل غير موجود" : "lead not found");
  // Opportunity.leadId is @unique, so a second conversion would throw and be
  // swallowed as a generic "conversion failed". Check explicitly instead so a
  // double-click reads as "already converted" rather than as an error.
  if (lead.status === "CONVERTED") {
    return fail(ar ? "تم تحويل هذا العميل المحتمل مسبقاً" : "lead is already converted");
  }
  const tenantId = ((await getActiveTenantSlug()) ?? lead.tenantId).slice(0, 64);
  try {
    await prisma.opportunity.create({
      data: {
        tenantId,
        leadId: lead.id,
        title: lead.company || lead.name,
        stage: "NEW",
        amount: lead.expectedValue ?? 0,
        probability: PROBABILITY.NEW,
        ownerId: lead.ownerId,
      },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "CONVERTED" },
    });
  } catch {
    return fail(ar ? "تعذّر التحويل" : "conversion failed");
  }
  await ok(ar ? "تم تحويل العميل المحتمل إلى فرصة" : "Lead converted to opportunity");
}

export async function moveStage(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  const dir = String(formData.get("dir") ?? "");
  if (!id) return;
  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return;
  const at = FLOW.indexOf(opp.stage as FlowStage);
  const idx = at < 0 ? 0 : at;
  let next: FlowStage = (FLOW[idx] ?? FLOW[0]);
  if (dir === "next") next = FLOW[Math.min(idx + 1, FLOW.length - 1)];
  else if (dir === "prev") next = FLOW[Math.max(idx - 1, 0)];
  try {
    await prisma.opportunity.update({
      where: { id },
      data: { stage: next, probability: PROBABILITY[next] ?? opp.probability },
    });
  } catch {
    return fail(ar ? "تعذّر تحديث المرحلة" : "could not update the stage");
  }
  await ok(ar ? "تم تحديث المرحلة" : "Stage updated");
}

export async function closeOpportunity(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "");
  if (!id || (outcome !== "WON" && outcome !== "LOST")) return;
  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: { leadRef: true },
  });
  if (!opp) return fail(ar ? "الفرصة غير موجودة" : "opportunity not found");

  // WON is the CRM → finance handoff: a deal that closes has to become a real
  // Customer, or the pipeline is a toy that never touches the books. Customer
  // is @@unique([tenantId, name]), so an existing account is reused rather than
  // duplicated — the same buyer can win many opportunities. If the customer
  // write fails the opportunity is deliberately NOT closed, so the operator
  // retries one coherent action instead of ending up with a WON deal that has
  // no account behind it (D1 runs $transaction callbacks without atomicity, so
  // ordering is the only guarantee available here).
  let customerId = opp.customerId;
  if (outcome === "WON" && !customerId) {
    const accountName = (opp.leadRef?.company || opp.leadRef?.name || opp.title).slice(0, 200);
    try {
      const customer = await prisma.customer.upsert({
        where: { tenantId_name: { tenantId: opp.tenantId, name: accountName } },
        update: {},
        create: {
          tenantId: opp.tenantId,
          name: accountName,
          email: opp.leadRef?.email ?? null,
          phone: opp.leadRef?.phone ?? null,
          notes: ar ? "أُنشئ من فرصة رابحة" : "Created from a won opportunity",
        },
      });
      customerId = customer.id;
    } catch {
      return fail(ar ? "تعذّر إنشاء حساب العميل — لم تُغلق الفرصة" : "could not create the customer account — opportunity left open");
    }
  }

  try {
    await prisma.opportunity.update({
      where: { id },
      data: {
        stage: outcome,
        probability: outcome === "WON" ? 100 : 0,
        customerId,
        lostReason: outcome === "LOST" ? (field(formData, "lostReason", 200) ?? "—") : null,
      },
    });
  } catch {
    return fail(ar ? "تعذّر إغلاق الفرصة" : "could not close the opportunity");
  }
  await ok(
    outcome === "WON"
      ? ar ? "🎉 فرصة رابحة — تم إنشاء حساب العميل" : "🎉 Opportunity won — customer account ready"
      : ar ? "فرصة خاسرة" : "Opportunity marked lost",
  );
}
