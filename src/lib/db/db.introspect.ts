// lib/db.introspect.ts — runtime model introspection for the superadmin
// Data Browser (/admin/db). Reads Prisma's generated DMMF so the browser
// renders EVERY model with zero hand-maintained config: add a model to
// schema.prisma, re-run db:push, and it shows up.
//
// Pure + deterministic given the generated client — unit-tested in
// db.introspect.test.ts. NO database IO here; it only reads metadata.
// The pages do the querying (via prismaUnscoped, cross-tenant by intent).

import { Prisma } from "@prisma/client";

export type DbColumnKind = "scalar" | "enum";

export type DbColumn = {
  name: string;
  type: string; // Prisma scalar/enum type (String, Int, DateTime, …)
  kind: DbColumnKind;
  isId: boolean;
  isRequired: boolean;
};

export type DbModelMeta = {
  /** PascalCase model name as written in schema.prisma (e.g. "ActivityLog"). */
  name: string;
  /** Prisma client accessor property (e.g. "activityLog"). */
  prop: string;
  /** Underlying table name when @@map is used, else null. */
  dbName: string | null;
  /** Renderable columns — scalar + enum, non-list, non-relation. */
  columns: DbColumn[];
  /** String columns safe to run a `contains` search against. */
  searchable: string[];
  /** The @id field name, if any. */
  idField: string | null;
  /** Field used for default DESC ordering (createdAt › id › first column). */
  orderField: string;
  /** Total field count incl. relations (for the model list badge). */
  fieldCount: number;
};

/** model.name → client property: lowercase the first character only. */
function toProp(name: string): string {
  return name.length ? name[0].toLowerCase() + name.slice(1) : name;
}

function buildMeta(model: Prisma.DMMF.Model): DbModelMeta {
  const columns: DbColumn[] = [];
  let idField: string | null = null;

  for (const f of model.fields) {
    if (f.isId) idField = f.name;
    // Skip relations (kind "object") and list fields — not renderable as a cell.
    if ((f.kind === "scalar" || f.kind === "enum") && !f.isList) {
      columns.push({
        name: f.name,
        type: f.type,
        kind: f.kind === "enum" ? "enum" : "scalar",
        isId: !!f.isId,
        isRequired: !!f.isRequired,
      });
    }
  }

  const colNames = new Set(columns.map((c) => c.name));
  const orderField = colNames.has("createdAt")
    ? "createdAt"
    : idField && colNames.has(idField)
      ? idField
      : columns[0]?.name ?? "id";

  const searchable = columns
    .filter((c) => c.type === "String")
    .map((c) => c.name);

  return {
    name: model.name,
    prop: toProp(model.name),
    dbName: model.dbName ?? null,
    columns,
    searchable,
    idField,
    orderField,
    fieldCount: model.fields.length,
  };
}

/** Every model in the schema, alphabetised by name. */
export function listModels(): DbModelMeta[] {
  return [...Prisma.dmmf.datamodel.models]
    .map(buildMeta)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Look up one model by its client property (e.g. "activityLog").
 * Returns null for unknown names — callers use this to validate the
 * `[model]` route param BEFORE indexing into the prisma client, so a
 * crafted URL can never reach an arbitrary client property.
 */
export function getModel(prop: string): DbModelMeta | null {
  if (!prop) return null;
  return listModels().find((m) => m.prop === prop) ?? null;
}

/** Render a raw row value as a safe display string. */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 19);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
