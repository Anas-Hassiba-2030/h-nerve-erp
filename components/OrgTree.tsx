// Phase V3-P13 — collapsible org-tree view of the User reportsTo chain.
// Pure server-component: takes a list of users and renders them
// hierarchically. Uses native <details>/<summary> for the collapse so
// no client JS is required and the tree degrades gracefully without
// hydration.

type UserNode = {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string | null;
  companyCode?: string | null;
  reportsToId?: string | null;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase();
}

function colorFor(seed: string): string {
  // Simple deterministic Heritage-palette pick.
  const palette = [
    "var(--heri-terracotta)",
    "var(--heri-ochre)",
    "var(--heri-teal)",
    "var(--heri-copper)",
    "var(--heri-rose)",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function Node({
  u,
  childrenByParent,
  ar,
  depth,
}: {
  u: UserNode;
  childrenByParent: Map<string, UserNode[]>;
  ar: boolean;
  depth: number;
}) {
  const kids = childrenByParent.get(u.id) ?? [];
  const hasKids = kids.length > 0;
  return (
    <details
      open={depth < 2}
      className="org-tree-node"
      style={{
        marginInlineStart: depth === 0 ? 0 : 18,
        borderInlineStart: depth > 0 ? "1px solid var(--heri-rule)" : undefined,
        paddingInlineStart: depth > 0 ? 12 : 0,
        marginTop: 6,
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: hasKids ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px",
          background: "var(--heri-cream-2)",
          border: "1px solid var(--heri-rule)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: colorFor(u.id),
            color: "var(--heri-cream)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.04em",
          }}
        >
          {initialsFor(u.name)}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--heri-ink)" }}>
            {u.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--heri-ink-3)",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.04em",
            }}
          >
            {u.role}
            {u.title ? ` · ${u.title}` : ""}
            {u.companyCode ? ` · ${u.companyCode}` : ""}
          </div>
        </span>
        {hasKids ? (
          <span
            className="heri-eyebrow"
            style={{ color: "var(--heri-ink-3)", fontSize: 10 }}
          >
            {kids.length} {ar ? "تابع" : "reports"}
          </span>
        ) : null}
      </summary>
      {hasKids ? (
        <div style={{ marginTop: 4 }}>
          {kids.map((k) => (
            <Node
              key={k.id}
              u={k}
              childrenByParent={childrenByParent}
              ar={ar}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </details>
  );
}

export function OrgTree({ users, ar }: { users: UserNode[]; ar: boolean }) {
  const childrenByParent = new Map<string, UserNode[]>();
  for (const u of users) {
    const p = u.reportsToId ?? null;
    if (p) {
      const list = childrenByParent.get(p) ?? [];
      list.push(u);
      childrenByParent.set(p, list);
    }
  }
  const roots = users.filter((u) => !u.reportsToId);
  if (roots.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "var(--heri-ink-3)",
          fontStyle: "italic",
          fontSize: 13,
        }}
      >
        {ar
          ? "لا توجد جذور في شجرة التنظيم بعد."
          : "No org-tree root yet. Assign 'reports to' on /admin/users."}
      </div>
    );
  }
  return (
    <div>
      {roots.map((r) => (
        <Node
          key={r.id}
          u={r}
          childrenByParent={childrenByParent}
          ar={ar}
          depth={0}
        />
      ))}
    </div>
  );
}
