// app/dev/explorer — Industrial Precision API explorer.
//
// Lists the protocol endpoints from OPENAPI_DOC + a sample request/
// response panel. Click an endpoint to see its method, path, and the
// curl sample inline.
//
// Phase 20 of docs/PHASES-INTELLIGENCE.md.

import { OPENAPI_DOC, PROTOCOL_VERSION } from "@/lib/protocol/spec";

type Op = {
  path: string;
  method: string;
  summary: string;
};

function flattenOps(): Op[] {
  const ops: Op[] = [];
  for (const [path, methods] of Object.entries(OPENAPI_DOC.paths as any)) {
    for (const [method, op] of Object.entries(methods as any)) {
      ops.push({
        path,
        method: method.toUpperCase(),
        summary: (op as any).summary ?? "",
      });
    }
  }
  return ops;
}

const METHOD_TONE: Record<string, string> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

export default function ExplorerPage() {
  const ops = flattenOps();
  const baseUrl = "/api/v1";

  return (
    <>
      <header className="dev-page-head">
        <p className="dev-page-eyebrow">EXPLORER · v{PROTOCOL_VERSION}</p>
        <h1 className="dev-page-title">Protocol API</h1>
        <p className="dev-page-sub">
          Every endpoint is JSON-in, JSON-out. Every response carries a
          stable trace ID. Auth is bearer-token (scoped per tenant).
        </p>
      </header>

      <section className="dev-explorer">
        <aside className="dev-explorer-list">
          <header className="dev-explorer-list-head">
            <span>ENDPOINTS</span>
            <span className="dev-explorer-count">{ops.length}</span>
          </header>
          <ol>
            {ops.map((op) => (
              <li
                key={op.method + op.path}
                className="dev-explorer-row"
                data-method={METHOD_TONE[op.method] ?? "get"}
              >
                <span className="dev-explorer-method">{op.method}</span>
                <span className="dev-explorer-path">{op.path}</span>
                <span className="dev-explorer-summary">{op.summary}</span>
              </li>
            ))}
          </ol>
        </aside>

        <article className="dev-explorer-panel">
          <header className="dev-explorer-panel-head">
            <span className="dev-explorer-panel-mark">CURL</span>
            <span className="dev-explorer-panel-path">POST {baseUrl}/agents/dairy:expiry-watcher/decide</span>
          </header>
          <pre className="dev-explorer-pre">
{`curl -X POST ${baseUrl}/agents/dairy:expiry-watcher/decide \\
  -H "Authorization: Bearer $H_NERVE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "expiry-risk",
    "context": {
      "nodes": [
        { "id": "batch:MAHA-00012", "kind": "metric", "label": "TPC", "value": 32 },
        { "id": "expiry",            "kind": "risk",   "label": "Expiry risk", "value": 0.74 }
      ],
      "edges": [
        { "from": "expiry", "to": "margin", "weight": -0.71 }
      ],
      "memory": []
    }
  }'`}
          </pre>
          <header className="dev-explorer-panel-head">
            <span className="dev-explorer-panel-mark">200</span>
            <span className="dev-explorer-panel-path">application/json</span>
          </header>
          <pre className="dev-explorer-pre dev-explorer-pre-out">
{`{
  "vote": 1,
  "rationale": "Two batches above expiry threshold (0.7). Recommend retail redirect.",
  "confidence": 0.82,
  "citations": [
    { "id": "c1", "label": "batch:MAHA-00012", "href": "/dairy/MAHA-00012" }
  ],
  "trace_id": "trc_01J7Q9F0M5R..."
}`}
          </pre>
        </article>
      </section>

      <p className="dev-explorer-foot">
        Full schema:{" "}
        <a href="/api/protocol/openapi" className="dev-link">
          /api/protocol/openapi
        </a>
      </p>
    </>
  );
}
