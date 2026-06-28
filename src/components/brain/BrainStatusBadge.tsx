// Server component — reads env at render time. No "use client" needed.
import { llmConfig } from "@/lib/brain/llm";

export function BrainStatusBadge({ className }: { className?: string }) {
  const cfg = llmConfig();
  if (cfg.enabled) {
    // Owner-facing: show only "LIVE". The raw model id is jargon to a business
    // audience (and an internal identifier) — keep it in the tooltip for ops.
    return (
      <span
        title={`AI engine live · ${cfg.model}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 ${className ?? ""}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        LIVE
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 bg-amber-50 text-amber-700 ring-amber-200 ${className ?? ""}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      STUB MODE
    </span>
  );
}
