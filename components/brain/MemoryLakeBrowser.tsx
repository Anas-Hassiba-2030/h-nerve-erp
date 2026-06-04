"use client";

// MemoryLakeBrowser — the client-driven recall surface behind /memory.
//
// useEffect → GET /api/memory, a module filter rail, and the editorial
// MemoryCard grid (reused from the SSR /brain/memory page). Each card has
// a "forget" control wired to the forgetMemory server action. This is the
// API-driven twin of the server-rendered lake; both read the same Memory
// rows, one over fetch, one over SSR. (Distinct from MemoryRecall.tsx,
// which is the inline server-rendered "I remember when…" card beneath an
// alert.)
//
// Phase 6 of docs/PHASES-INTELLIGENCE.md.

import { useCallback, useEffect, useState, useTransition } from "react";
import { Database, Trash2 } from "lucide-react";
import { MemoryCard } from "@/components/brain/MemoryCard";
import { forgetMemory } from "@/app/(app)/memory/actions";

type ApiMemory = {
  id: string;
  occurredAt: string;
  module: string;
  headline: { ar: string; en: string };
  body: { ar: string; en: string };
  lesson: { ar: string | null; en: string | null };
  tags: string[];
  outcome: { metric: string; delta: number } | null;
};

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق", en: "Hotels" },
  DAIRY:     { ar: "الألبان", en: "Dairy" },
  FARMS:     { ar: "المزارع", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "المالية", en: "Finance" },
  GROUP:     { ar: "المجموعة", en: "Group" },
  SUPPLY:    { ar: "سلسلة التوريد", en: "Supply" },
};

export function MemoryLakeBrowser({ ar, canForget = false }: { ar: boolean; canForget?: boolean }) {
  const [all, setAll] = useState<ApiMemory[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    setError(false);
    fetch("/api/memory?limit=60", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { memories: ApiMemory[] }) => setAll(j.memories))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onForget = (id: string) => {
    // Optimistic removal, then the server action + reload reconciles. If the
    // action rejects (e.g. insufficient role), reload to restore the row
    // rather than leaving it optimistically — and never let it reject
    // unhandled inside the transition.
    setAll((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    startTransition(async () => {
      try {
        await forgetMemory(id);
      } catch {
        // swallow — the reload below puts the row back if it wasn't deleted
      }
      load();
    });
  };

  if (error) {
    return <Notice ar={ar} text={ar ? "تعذّر تحميل الذاكرة." : "Couldn't load memories."} />;
  }
  if (!all) {
    return <Notice ar={ar} text={ar ? "جارٍ التحميل…" : "Loading…"} />;
  }
  if (all.length === 0) {
    return (
      <Notice
        ar={ar}
        text={
          ar
            ? "البحيرة فارغة. ازرعها من /brain/memory."
            : "The lake is empty. Seed it from /brain/memory."
        }
      />
    );
  }

  const modules = Array.from(new Set(all.map((m) => m.module)));
  const shown = filter ? all.filter((m) => m.module === filter) : all;

  return (
    <>
      {/* Filter rail */}
      <div
        className="flex flex-wrap items-center gap-1.5 px-1 py-3"
        style={{
          borderTop: "1px solid var(--heri-rule)",
          borderBottom: "1px solid var(--heri-rule)",
        }}
      >
        <span className="heri-eyebrow me-2">{ar ? "تصفية" : "Filter"}</span>
        <Chip active={!filter} label={ar ? "الكل" : "All"} count={all.length} onClick={() => setFilter("")} />
        {modules.map((mod) => (
          <Chip
            key={mod}
            active={filter === mod}
            label={ar ? MODULE_LABEL[mod]?.ar ?? mod : MODULE_LABEL[mod]?.en ?? mod}
            count={all.filter((m) => m.module === mod).length}
            onClick={() => setFilter(mod)}
          />
        ))}
        <span className="grow" />
        <span
          aria-live="polite"
          className="heri-eyebrow"
          style={{ opacity: pending ? 1 : 0, transition: "opacity 160ms", color: "var(--heri-ink-3)" }}
        >
          <Database className="h-3 w-3 inline" strokeWidth={1.5} /> {ar ? "تحديث…" : "syncing…"}
        </span>
      </div>

      {/* Recall grid */}
      <div
        className="grid gap-4 heri-stagger mt-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}
      >
        {shown.map((m) => (
          <div key={m.id} className="relative">
            <MemoryCard
              ar={ar}
              memory={{
                id: m.id,
                ts: new Date(m.occurredAt),
                module: m.module,
                headline: m.headline,
                body: m.body,
                tags: m.tags,
                outcome: m.outcome
                  ? { metric: m.outcome.metric, delta: m.outcome.delta, lessonLearned: m.lesson.en ?? undefined }
                  : undefined,
                lesson: m.lesson,
              }}
            />
            {canForget ? (
              <button
                type="button"
                onClick={() => onForget(m.id)}
                title={ar ? "نسيان هذه الذكرى" : "Forget this memory"}
                className="heri-focusable absolute"
                style={{
                  top: 10,
                  insetInlineEnd: 10,
                  padding: "4px 6px",
                  background: "color-mix(in srgb, var(--heri-ink) 70%, transparent)",
                  color: "var(--heri-cream)",
                  border: "1px solid var(--heri-ochre)",
                  cursor: "pointer",
                }}
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function Chip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
      style={{
        background: active ? "var(--heri-ink)" : "var(--heri-cream)",
        border: active ? "1px solid var(--heri-ink)" : "1px solid var(--heri-rule-strong)",
        color: active ? "var(--heri-cream)" : "var(--heri-ink)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label}
      <span
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count.toLocaleString("en-US")}
      </span>
    </button>
  );
}

function Notice({ ar, text }: { ar: boolean; text: string }) {
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="mt-6"
      style={{
        padding: "40px 24px",
        textAlign: "center",
        fontSize: 13.5,
        color: "var(--heri-ink-3)",
        fontStyle: "italic",
        border: "1px solid var(--heri-rule)",
        background: "var(--heri-cream-2)",
      }}
    >
      {text}
    </div>
  );
}
