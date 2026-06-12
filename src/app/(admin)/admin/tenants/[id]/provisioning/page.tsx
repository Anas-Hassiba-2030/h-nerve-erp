// /admin/tenants/[id]/provisioning — the LIVE 5-step checklist.
//
// Server-side: renders the initial step ledger.
// Client-side (ProvisioningClient): walks through each step in sequence,
// calling runProvisioningStep() per key. Each completion ticks the
// checkbox and pulses a green check. After step 5, redirects to the
// tenant detail page.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { ProvisioningClient } from "./ProvisioningClient";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";

export default async function ProvisioningPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
      theme: true,
    },
  });
  if (!tenant) notFound();

  return (
    <div className="admin-page admin-page-narrow">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.provisioning"]} · {tenant.slug.toUpperCase()}</span>
          <h1 className="admin-h1">
            {ar ? `تجهيز ${tenant.name}` : `Standing up ${tenant.name}`}
          </h1>
          <p className="admin-sub">
            {ar
              ? "خمس خطوات. نحو ثلاث ثوانٍ من البداية إلى النهاية. كل خطوة تعمل مقابل قاعدة البيانات في الوقت الفعلي."
              : "Five steps. About three seconds end-to-end. Each one runs against the database in real time."}
          </p>
        </div>
        <div className="admin-tenant-emblem-large">{tenant.theme?.emblem ?? "◆"}</div>
      </header>

      <ProvisioningClient
        tenantId={tenant.id}
        ar={ar}
        steps={tenant.steps.map((s) => ({
          id: s.id,
          orderIndex: s.orderIndex,
          key: s.key as any,
          labelEn: s.labelEn,
          labelAr: s.labelAr,
          status: s.status as any,
          durationMs: s.durationMs ?? null,
        }))}
      />
    </div>
  );
}
