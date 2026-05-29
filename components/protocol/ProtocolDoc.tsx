"use client";

// components/protocol/ProtocolDoc.tsx — Phase 20 Living Protocol.
//
// Renders the constitution clauses as a numbered editorial document. For an
// ADMIN each clause body is editable inline: Edit → textarea → Save PATCHes
// /api/protocol/[id], and the returned (version-bumped, possibly newly
// persisted) clause replaces the local one. Non-admins see read-only prose.

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { ProtocolClauseDTO } from "@/lib/protocol/load";

export function ProtocolDoc({
  clauses: initial,
  ar,
  admin,
}: {
  clauses: ProtocolClauseDTO[];
  ar: boolean;
  admin: boolean;
}) {
  const [clauses, setClauses] = useState<ProtocolClauseDTO[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(c: ProtocolClauseDTO) {
    setEditingId(c.id);
    setDraft(c.body);
    setError(null);
  }
  function cancel() {
    setEditingId(null);
    setDraft("");
    setError(null);
  }
  async function save(c: ProtocolClauseDTO) {
    const next = draft.trim();
    if (!next) {
      setError(ar ? "النص مطلوب." : "Body is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/protocol/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? String(res.status));
      }
      const { clause } = (await res.json()) as { clause: ProtocolClauseDTO };
      setClauses((prev) => prev.map((x) => (x.id === c.id ? clause : x)));
      setEditingId(null);
      setDraft("");
    } catch {
      setError(ar ? "تعذّر الحفظ. حاول مجدداً." : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ol className="proto-clauses">
      {clauses.map((c, i) => {
        const title = ar ? c.title : c.titleEn || c.title;
        const bodyText = ar ? c.body : c.bodyEn || c.body;
        const isEditing = editingId === c.id;
        return (
          <li key={c.id} className="proto-clause">
            <div className="proto-clause-head">
              <span className="proto-clause-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="proto-clause-title">{title}</h2>
              <span className="proto-clause-ver" title={ar ? "النسخة" : "version"}>
                v{c.version}
              </span>
              {admin && !isEditing ? (
                <button
                  type="button"
                  className="proto-edit-btn"
                  onClick={() => startEdit(c)}
                  aria-label={ar ? "تحرير البند" : "Edit clause"}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                  <span>{ar ? "تحرير" : "Edit"}</span>
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="proto-edit">
                <textarea
                  className="proto-edit-area"
                  dir="rtl"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  disabled={saving}
                  autoFocus
                />
                {error ? <p className="proto-edit-error">{error}</p> : null}
                <div className="proto-edit-actions">
                  <button
                    type="button"
                    className="proto-btn proto-btn-save"
                    onClick={() => save(c)}
                    disabled={saving}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "حفظ" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="proto-btn proto-btn-cancel"
                    onClick={cancel}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {ar ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="proto-clause-body">{bodyText}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
