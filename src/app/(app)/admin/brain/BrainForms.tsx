"use client";

// Client forms for /admin/brain (Phase 10). Run-analysis with a
// pending spinner (useFormStatus), plus per-insight Resolve / Dismiss.
// Plain FormData → the server actions; mirrors the admin family.

import { useFormStatus } from "react-dom";
import { Brain, Check, X } from "lucide-react";
import { runAnalysis, resolveInsight, dismissInsight } from "./actions";

function RunBtn({ ar }: { ar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary btn-sm" disabled={pending}>
      <Brain className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} />
      {pending
        ? ar
          ? "جارٍ التحليل…"
          : "Analyzing…"
        : ar
          ? "تشغيل التحليل"
          : "Run Analysis"}
    </button>
  );
}

export function RunAnalysisForm({
  tenantId,
  ar,
}: {
  tenantId: string;
  ar: boolean;
}) {
  return (
    <form action={runAnalysis}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <RunBtn ar={ar} />
    </form>
  );
}

export function ResolveButton({ id, ar }: { id: string; ar: boolean }) {
  return (
    <form action={resolveInsight}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-secondary btn-sm">
        <Check className="h-3.5 w-3.5" />
        {ar ? "حلّ" : "Resolve"}
      </button>
    </form>
  );
}

export function DismissButton({ id, ar }: { id: string; ar: boolean }) {
  return (
    <form action={dismissInsight}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-ghost btn-sm">
        <X className="h-3.5 w-3.5" />
        {ar ? "تجاهل" : "Dismiss"}
      </button>
    </form>
  );
}
