"use client";

// Step 6/8 — "Test mapping" preview. Pure, client-side: paste a sample
// raw record (their format), Apply, see the canonical result side by
// side. Uses the SAME applyMapping/parseMappingRow the endpoint uses
// (pure, no DB) so the preview is faithful. No DB write.

import { useState } from "react";
import { Play } from "lucide-react";
import { applyMapping, parseMappingRow } from "@/lib/importMapping";

export function MappingTester({
  fieldMapJson,
  defaultsJson,
  ar,
}: {
  fieldMapJson: string;
  defaultsJson: string | null;
  ar: boolean;
}) {
  const [input, setInput] = useState(
    '{\n  "Item Code": "DEMO-1",\n  "Stock Level": 12\n}',
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function run() {
    setError("");
    setOutput("");
    let rec: unknown;
    try {
      rec = JSON.parse(input);
    } catch {
      setError(ar ? "إدخال JSON غير صالح" : "Input is not valid JSON");
      return;
    }
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
      setError(ar ? "أدخل كائن سجل واحد" : "Enter a single record object");
      return;
    }
    const mapping = parseMappingRow({
      fieldMapJson,
      defaultsJson,
      active: true,
    });
    const result = applyMapping({ records: [rec] }, mapping);
    setOutput(JSON.stringify(result.records[0], null, 2));
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        {ar ? "اختبار الخريطة" : "Test mapping"}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold">
          {ar ? "سجل خام (تنسيقهم)" : "Raw record (their format)"}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="input font-mono text-xs"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          {ar ? "النتيجة القانونية" : "Canonical result"}
          <textarea
            value={output}
            readOnly
            rows={6}
            className="input font-mono text-xs"
            style={{ background: "var(--surface-elevated)" }}
            placeholder={ar ? "اضغط تطبيق" : "Click Apply"}
          />
        </label>
      </div>
      {error ? (
        <div className="text-xs font-bold" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}
      <div>
        <button type="button" onClick={run} className="btn-secondary btn-sm">
          <Play className="h-3.5 w-3.5" />
          {ar ? "تطبيق الخريطة" : "Apply mapping"}
        </button>
      </div>
    </div>
  );
}
