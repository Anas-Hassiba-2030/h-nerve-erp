"use server";

// app/(app)/voac/actions.ts — the human gate, made real.
//
// This file is where "agents propose, humans commit" stops being a slogan. Two
// rules are enforced here rather than trusted:
//
//   1. A rejection MUST carry a reason. Accept/reject alone conflates "wrong",
//      "already knew", "politically impossible" and "bad timing" — four
//      different lessons that would otherwise be trained on as one. This is the
//      only place that distinction can still be captured, so it is required.
//   2. The decider is recorded by id. Liability sits with the person who
//      clicked, and the row has to be able to say who that was.
//
// Note what these actions do NOT do: they never touch a domain table. Accepting
// a proposal marks it ACCEPTED — carrying it out is a separate, ordinary action
// the operator takes in the relevant module. The VOAC proposes; it does not act.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { logActivity } from "@/lib/auth/activityLog";
import { flashToast } from "@/lib/utils/toast";
import { reportError } from "@/lib/observability/report";

const decideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  note: z.string().max(1000).optional(),
});

export async function decideProposal(formData: FormData) {
  const user = await requireRole("MANAGER");

  const parsed = decideSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    note: String(formData.get("note") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: "طلب غير صالح." });
    revalidatePath("/voac");
    return;
  }

  const { id, decision, note } = parsed.data;

  // A rejection without a reason is a lost lesson. Block it here — this is the
  // last moment the distinction exists.
  if (decision === "REJECTED" && !note) {
    await flashToast({
      type: "info",
      entity: "info",
      label: "الرفض يحتاج سبباً — لماذا لا يصلح هذا المقترح؟",
    });
    revalidatePath("/voac");
    return;
  }

  try {
    // The scoped client returns null for another tenant's proposal, so this
    // doubles as the authorization check.
    const before = await prisma.agentProposal.findUnique({ where: { id } });
    if (!before) {
      await flashToast({ type: "info", entity: "info", label: "المقترح غير موجود." });
      revalidatePath("/voac");
      return;
    }

    // Terminal means terminal — a decided proposal is part of the audit trail
    // and must not be silently re-decided.
    if (before.status !== "PENDING") {
      await flashToast({
        type: "info",
        entity: "info",
        label: "تم البتّ في هذا المقترح مسبقاً.",
      });
      revalidatePath("/voac");
      return;
    }

    await prisma.agentProposal.update({
      where: { id },
      data: {
        status: decision,
        decidedById: user.id,
        decidedAt: new Date(),
        decisionNote: note ?? null,
      },
    });

    await logActivity({
      action: "UPDATE",
      entity: "INSIGHT",
      entityId: id,
      summary: `${decision === "ACCEPTED" ? "قبول" : "رفض"} مقترح: ${before.title}`,
      summaryEn: `${decision === "ACCEPTED" ? "Accepted" : "Rejected"} proposal: ${before.title}`,
      module: "VOAC",
      meta: { decision, hasNote: Boolean(note) },
    });

    await flashToast({
      type: "info",
      entity: "info",
      label:
        decision === "ACCEPTED"
          ? "تم قبول المقترح — نفّذه من الوحدة المعنية."
          : "تم رفض المقترح، وسُجّل السبب.",
    });
  } catch (e) {
    // Tells the USER something went wrong; reportError tells the OPERATOR what.
    await flashToast({ type: "info", entity: "info", label: "تعذّر حفظ القرار." });
    reportError("voac.decideProposal failed", e, { userId: user.id, entityId: id });
  }

  revalidatePath("/voac");
}

const outcomeSchema = z.object({
  id: z.string().min(1),
  realizedValueJod: z.coerce.number().finite(),
});

/**
 * Record what a proposal was actually worth, 30-60 days later.
 *
 * This is the only non-circular reward signal the system has — everything else
 * is the model grading itself. It is also the only number worth putting in a
 * pitch, because it is the one nobody could have made up.
 */
export async function recordOutcome(formData: FormData) {
  const user = await requireRole("MANAGER");

  const parsed = outcomeSchema.safeParse({
    id: formData.get("id"),
    realizedValueJod: formData.get("realizedValueJod"),
  });

  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: "قيمة غير صالحة." });
    revalidatePath("/voac");
    return;
  }

  try {
    const before = await prisma.agentProposal.findUnique({ where: { id: parsed.data.id } });
    if (!before) {
      revalidatePath("/voac");
      return;
    }

    // Only an accepted proposal has an outcome — recording one against a
    // rejected proposal would invent a counterfactual nobody measured.
    if (before.status !== "ACCEPTED") {
      await flashToast({
        type: "info",
        entity: "info",
        label: "النتيجة تُسجَّل للمقترحات المقبولة فقط.",
      });
      revalidatePath("/voac");
      return;
    }

    await prisma.agentProposal.update({
      where: { id: parsed.data.id },
      data: { realizedValueJod: parsed.data.realizedValueJod, realizedAt: new Date() },
    });

    await flashToast({ type: "info", entity: "info", label: "سُجّلت النتيجة الفعلية." });
  } catch (e) {
    await flashToast({ type: "info", entity: "info", label: "تعذّر تسجيل النتيجة." });
    reportError("voac.recordOutcome failed", e, { userId: user.id, entityId: parsed.data.id });
  }

  revalidatePath("/voac");
}

/** Re-read for the detail page; kept here so the page stays a server component. */
export async function touchVoac() {
  await requireUser();
  revalidatePath("/voac");
}
