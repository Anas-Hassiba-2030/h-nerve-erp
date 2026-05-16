// lib/importMapping.ts
//
// Phase 4 — per-tenant column-name translation. Pure, no DB access.
//
// The import endpoint resolves a TenantImportMapping row (tenantId +
// source-prefix), parses its String-JSON columns via parseMappingRow(),
// then calls applyMapping() on the payload BEFORE the per-record Zod
// validation. Opt-in: no mapping / inactive → payload passes through
// byte-identical (backward compatible with the canonical n8n shape).
//
// Field-level only (decision #3): "their column" → "our field".
// Value normalization (units, currency, yes/no) is Phase 5.

/** Normalized, ready-to-apply mapping (JSON already parsed). */
export type ImportMapping = {
  /** { theirField: ourField }, e.g. { "Item Code": "sku" }. */
  fieldMap: Record<string, string>;
  /** Fallbacks for fields still missing after remap. */
  defaults?: Record<string, unknown>;
  active: boolean;
};

/** The subset of a TenantImportMapping row this module needs. */
type MappingRow = {
  fieldMapJson: string;
  defaultsJson: string | null;
  active: boolean;
};

/**
 * Parse a TenantImportMapping DB row (String-JSON columns) into an
 * ImportMapping. Returns null when the row is absent, inactive, or its
 * JSON is malformed / not a flat object — callers then skip mapping and
 * pass the payload through unchanged (fail-open, never 500 an import).
 */
export function parseMappingRow(
  row: MappingRow | null | undefined,
): ImportMapping | null {
  if (!row || !row.active) return null;
  const fieldMap = safeObject(row.fieldMapJson);
  if (!fieldMap) return null;
  // fieldMap values must be non-empty strings (our field names).
  const cleanMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(fieldMap)) {
    if (typeof v === "string" && v) cleanMap[k] = v;
  }
  const defaults =
    row.defaultsJson != null
      ? safeObject(row.defaultsJson) ?? undefined
      : undefined;
  return { fieldMap: cleanMap, defaults, active: true };
}

function safeObject(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

type Payload = { records: unknown[] };

/**
 * Rewrite each record's keys per `mapping`. Pure.
 *
 * - mapping null/undefined/inactive → payload returned unchanged.
 * - Each record object: ALL original keys kept (unmapped data preserved
 *   — harmless + debuggable per spec), then for each theirKey→ourKey the
 *   value is copied when the source key is present (!== undefined).
 *   Finally any field still undefined is filled from `defaults`.
 * - Non-object records (string/null) pass through untouched; the
 *   per-record Zod rejects them downstream exactly as before.
 */
export function applyMapping<T extends Payload>(
  payload: T,
  mapping?: ImportMapping | null,
): T {
  if (!mapping || mapping.active === false) return payload;
  const entries = Object.entries(mapping.fieldMap);
  const defaults = mapping.defaults ? Object.entries(mapping.defaults) : [];

  const records = payload.records.map((rec) => {
    if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
      return rec; // leave non-objects for Zod to reject
    }
    const src = rec as Record<string, unknown>;
    const out: Record<string, unknown> = { ...src }; // preserve unmapped keys
    for (const [theirKey, ourKey] of entries) {
      if (src[theirKey] !== undefined) out[ourKey] = src[theirKey];
    }
    for (const [field, val] of defaults) {
      if (out[field] === undefined) out[field] = val;
    }
    return out;
  });

  return { ...payload, records };
}
