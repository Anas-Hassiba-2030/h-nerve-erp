"use client";

// ProvisioningClient — runs the 5 provisioning steps in sequence and
// updates the UI after each one completes. Shows a checklist with a tick
// pulse + duration mono badge per step. After step 5, redirects to the
// tenant detail page.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { runProvisioningStep } from "../../actions";
import type { ProvisioningStepKey } from "@/lib/tenancy/tenancy";

// Module-level lock so React StrictMode's double-mount in dev doesn't
// race the provisioning loop against itself. The second mount sees the
// lock, bails, and lets the first run complete cleanly.
const inFlight = new Set<string>();

type StepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

type Step = {
  id: string;
  orderIndex: number;
  key: ProvisioningStepKey;
  labelEn: string;
  labelAr: string;
  status: StepStatus;
  durationMs: number | null;
};

export function ProvisioningClient({
  tenantId,
  steps: initial,
  ar,
}: {
  tenantId: string;
  steps: Step[];
  ar: boolean;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(initial);
  const [failedStep, setFailedStep] = useState<Step | null>(null);

  useEffect(() => {
    // StrictMode-safe lock: the second mount in dev sees this and bails.
    if (inFlight.has(tenantId)) return;
    inFlight.add(tenantId);

    (async () => {
      let failedKey: ProvisioningStepKey | null = null;
      for (const s of initial) {
        if (s.status === "DONE") continue;

        // Mark RUNNING client-side immediately so the spinner shows.
        setSteps((prev) =>
          prev.map((x) => (x.key === s.key ? { ...x, status: "RUNNING" } : x))
        );

        const result = await runProvisioningStep(tenantId, s.key);

        setSteps((prev) =>
          prev.map((x) =>
            x.key === s.key
              ? { ...x, status: result.status, durationMs: result.ms }
              : x
          )
        );

        if (result.status === "FAILED") {
          failedKey = s.key;
          break;
        }
      }

      inFlight.delete(tenantId);

      if (failedKey) {
        // Do NOT redirect on failure — that would mask a half-provisioned
        // tenant as a success. Surface the failed step + offer a retry.
        setFailedStep(initial.find((x) => x.key === failedKey) ?? null);
        return;
      }

      // Brief pause so the user reads the final tick, then redirect.
      await new Promise((r) => setTimeout(r, 700));
      router.push(`/admin/tenants/${tenantId}`);
    })();
    // No cleanup needed — the loop is naturally bounded by step count
    // and the server actions are idempotent. The module-level lock
    // prevents StrictMode double-mount from racing.
  }, [tenantId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDone = steps.filter((s) => s.status === "DONE").length;
  const allDone = totalDone === steps.length;

  return (
    <section className="admin-provisioning">
      <div className="admin-provisioning-progress">
        <span className="admin-progress-label">
          {allDone
            ? (ar ? "جاهز" : "READY")
            : (ar ? `${totalDone} / ${steps.length} مكتمل` : `${totalDone} / ${steps.length} COMPLETE`)}
        </span>
        <span
          className="admin-progress-bar"
          aria-hidden
          style={{
            width: `${(totalDone / steps.length) * 100}%`,
          }}
        />
      </div>

      <ol className="admin-checklist">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className="admin-check-row"
            data-status={s.status}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="admin-check-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="admin-check-icon">
              {s.status === "DONE" ? (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              ) : s.status === "RUNNING" ? (
                <Loader2 className="h-4 w-4 admin-check-spin" strokeWidth={1.75} />
              ) : s.status === "FAILED" ? (
                <span className="admin-check-fail">✕</span>
              ) : (
                <CircleDashed className="h-4 w-4" strokeWidth={1.5} />
              )}
            </span>
            <span className="admin-check-label">{ar ? s.labelAr : s.labelEn}</span>
            <span className="admin-check-meta">
              {s.status === "DONE" && s.durationMs != null
                ? `${s.durationMs}ms`
                : s.status === "RUNNING"
                  ? (ar ? "جارٍ" : "RUNNING")
                  : s.status === "FAILED"
                    ? (ar ? "فشل" : "FAILED")
                    : (ar ? "في الانتظار" : "QUEUED")}
            </span>
          </li>
        ))}
      </ol>

      {failedStep ? (
        <div className="admin-provisioning-failed" role="alert">
          <p>
            {ar
              ? `✕ فشلت خطوة التهيئة: «${failedStep.labelAr}». لم يكتمل تجهيز المستأجر.`
              : `✕ Provisioning failed at step: “${failedStep.labelEn}”. The tenant was not fully provisioned.`}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.refresh()}
          >
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      ) : allDone ? (
        <p className="admin-provisioning-done">
          {ar ? "✓ المستأجر جاهز. جارٍ التوجيه إلى لوحة التحكم…" : "✓ Tenant ready. Redirecting to console…"}
        </p>
      ) : null}
    </section>
  );
}
