"use client";

// Phase 21 — the destructive "re-seed from scratch" gate.
//
// A stray click must never wipe a populated workspace, so the reseed button
// stays disabled until the operator ticks the acknowledgement. The ticked box
// posts confirm=WIPE, which runGenesisSeed() verifies server-side (defense in
// depth — the action rejects any submit without the token).

import { useState } from "react";
import { runGenesisSeed } from "./actions";

export function DangerReseed({ ar, total }: { ar: boolean; total: number }) {
  const [ack, setAck] = useState(false);

  return (
    <form action={runGenesisSeed}>
      <input type="hidden" name="confirm" value={ack ? "WIPE" : ""} />
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 16,
          fontSize: 12.5,
          color: "var(--admin-text-muted)",
          cursor: "pointer",
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          style={{ marginTop: 2, accentColor: "#b3553f" }}
        />
        <span>
          {ar
            ? `أفهم أن هذا سيحذف نهائياً جميع السجلات الحالية (${total.toLocaleString("en-US")}) ويستبدلها ببيانات تجريبية.`
            : `I understand this permanently deletes all current records (${total.toLocaleString("en-US")}) and replaces them with demo data.`}
        </span>
      </label>
      <button type="submit" className="admin-btn-danger" disabled={!ack} aria-disabled={!ack}>
        {ar ? "إعادة البذر من الصفر" : "Re-seed from scratch"}
      </button>
    </form>
  );
}
