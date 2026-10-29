// memory.corpus.ts — the text a Memory is embedded from. Shared by the live
// memory lake (memory.live.ts) and the offline re-index script
// (scripts/reindex-embeddings.ts) so both embed EXACTLY the same string.
// Pure: no Prisma, no network.

/** Combine the editorial fields of a memory into a single string for embedding. */
export function memoryCorpus(m: {
  headlineEn: string;
  bodyEn: string;
  lessonEn: string | null | undefined;
  tags?: string[];
  module?: string;
}): string {
  return [
    m.headlineEn,
    m.bodyEn,
    m.lessonEn ?? "",
    (m.tags ?? []).join(" "),
    m.module ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
