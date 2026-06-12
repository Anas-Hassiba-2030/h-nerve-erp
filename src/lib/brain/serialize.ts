// lib/brain/serialize.ts — Phase RAG-2-tail: Python-dict context serialization.
//
// Surprising but well-replicated finding (ch. 14.7): LLMs read structured
// context — especially graph/relational data — markedly more accurately when
// it's rendered as a Python-dict/literal (≈68%) than as JSON (≈26%). The
// likely cause is pre-training mix: far more Python-dict-shaped data than
// pretty-printed JSON in code corpora.
//
// So we render the prompt's `# CONTEXT` block (the council's subgraph, the
// narrator's facts, retrieved documents) as a Python literal instead of
// JSON.stringify. Pure + dependency-free, deterministic, unit-testable.

/** Python-style single-quoted string with the escapes Python expects. */
function pyStr(s: string): string {
  return (
    "'" +
    s
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    "'"
  );
}

function render(value: unknown, depth: number, indent: number): string {
  const pad = " ".repeat(depth * indent);
  const padIn = " ".repeat((depth + 1) * indent);

  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "None";
  if (typeof value === "bigint") return String(value);
  if (typeof value === "string") return pyStr(value);
  if (value instanceof Date) return pyStr(value.toISOString());

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => padIn + render(v, depth + 1, indent));
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    if (entries.length === 0) return "{}";
    const items = entries.map(
      ([k, v]) => `${padIn}${pyStr(k)}: ${render(v, depth + 1, indent)}`,
    );
    return `{\n${items.join(",\n")}\n${pad}}`;
  }

  // Functions/symbols and anything else: stringify defensively.
  return pyStr(String(value));
}

/**
 * Render a JS value as a pretty-printed Python literal (dict/list/str with
 * True/False/None). Use for LLM prompt context in place of JSON.stringify.
 */
export function toPyLiteral(value: unknown, indent = 2): string {
  return render(value, 0, Math.max(0, indent));
}
