// MemoryRecall — server component that renders matched memories as a
// horizontal carousel beneath an alert/insight. Shows the "I remember
// when..." cards from Phase 6 of docs/PHASES-INTELLIGENCE.md.
//
// This is a server component. It runs the recall query at render time so
// the page is fully populated on first paint — no client fetch needed.

import { memoryLake } from "@/lib/brain/memory.live";
import { MemoryCard } from "./MemoryCard";

export async function MemoryRecall({
  situation,
  topK = 2,
  filterTags,
  ar,
  className,
}: {
  situation: string;
  topK?: number;
  filterTags?: string[];
  ar: boolean;
  className?: string;
}) {
  if (!situation || situation.trim().length === 0) return null;

  const matches = await memoryLake().recall({
    situation,
    topK,
    filterTags,
    minSimilarity: 0.06,
  });
  if (matches.length === 0) return null;

  return (
    <section
      className={className}
      style={{
        position: "relative",
        animation: "memory-rise 460ms cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <header
        className="mb-3 inline-flex items-center gap-2"
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--heri-copper)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 18,
            height: 1.5,
            background: "var(--heri-copper)",
          }}
        />
        {ar ? "بحيرة الذاكرة · أتذكّر عندما…" : "Memory lake · I remember when…"}
      </header>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            matches.length === 1
              ? "minmax(0, 1fr)"
              : "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
        }}
      >
        {matches.map((m) => (
          <MemoryCard
            key={m.id}
            memory={m as any}
            similarity={(m as any).similarity}
            ar={ar}
            compact
          />
        ))}
      </div>
    </section>
  );
}
