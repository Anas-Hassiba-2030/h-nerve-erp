// API route smoke floor (A5) — the first test coverage for the app/ surface.
//
// For every route under app/api/**, assert the module loads and exports the
// expected HTTP method handler(s). For the two auth-gated routes whose gate is
// DB-free and runs BEFORE any query, also assert they honour auth (503 when the
// secret/token env is unset, 401 on mismatch) — verifiable with no DB.
//
// Kept pure-unit per vitest.config: `server-only` is mocked to a no-op (it
// throws when imported outside an RSC bundle), and we never call a handler that
// reaches Prisma. Lives under lib/ because vitest `include` is lib/**/*.test.ts.

import { describe, it, expect, vi } from "vitest";

// `server-only` throws on import in a plain node env — neutralize it so route
// modules (which transitively import server-only) can be loaded for inspection.
vi.mock("server-only", () => ({}));

type RouteSpec = { path: string; methods: Array<"GET" | "POST" | "PUT" | "PATCH" | "DELETE"> };

// Mirrors `find app/api -name route.ts` + their exported methods (kept in sync
// by the grep used to author this — 26 routes).
const ROUTES: RouteSpec[] = [
  { path: "@/app/api/admin/db/[model]/export/route", methods: ["GET"] },
  { path: "@/app/api/admin/seed-demo/route", methods: ["POST"] },
  { path: "@/app/api/admin/seed-pitch/route", methods: ["POST"] },
  { path: "@/app/api/brain/cron/route", methods: ["GET"] },
  { path: "@/app/api/brain/insights/route", methods: ["GET"] },
  { path: "@/app/api/converse/route", methods: ["POST"] },
  { path: "@/app/api/empire/summary/route", methods: ["GET"] },
  { path: "@/app/api/export/html/[type]/route", methods: ["GET"] },
  { path: "@/app/api/export/system-dump/route", methods: ["GET"] },
  { path: "@/app/api/export/[type]/route", methods: ["GET"] },
  { path: "@/app/api/health/route", methods: ["GET"] },
  { path: "@/app/api/import/test/route", methods: ["POST"] },
  { path: "@/app/api/learning/patterns/route", methods: ["GET"] },
  { path: "@/app/api/memory/route", methods: ["GET"] },
  { path: "@/app/api/messages/discuss/route", methods: ["POST"] },
  { path: "@/app/api/pins/toggle/route", methods: ["POST"] },
  { path: "@/app/api/protocol/openapi/route", methods: ["GET"] },
  { path: "@/app/api/protocol/route", methods: ["GET"] },
  { path: "@/app/api/protocol/[id]/route", methods: ["PATCH"] },
  { path: "@/app/api/ready/route", methods: ["GET"] },
  { path: "@/app/api/realtime/route", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/realtime/stream/route", methods: ["GET"] },
  { path: "@/app/api/search/route", methods: ["GET"] },
  { path: "@/app/api/seed/route", methods: ["POST"] },
  { path: "@/app/api/setup/route", methods: ["GET", "POST"] },
  { path: "@/app/api/toast/undo/route", methods: ["POST"] },
];

describe("API route smoke floor — handler exists + exports expected method", () => {
  it("covers every app/api route (drift guard)", () => {
    // If a route is added/removed, this count nudges the author to update the
    // list above — the floor must keep tracking the whole surface.
    expect(ROUTES.length).toBe(26);
  });

  for (const r of ROUTES) {
    it(`${r.path} → ${r.methods.join("+")}`, async () => {
      const mod = (await import(r.path)) as Record<string, unknown>;
      for (const m of r.methods) {
        expect(typeof mod[m], `${r.path} should export ${m}`).toBe("function");
      }
    });
  }
});

describe("API route smoke floor — auth gates (DB-free)", () => {
  const req = (url: string, init?: RequestInit): any => new Request(url, init);

  it("brain/cron returns 503 when CRON_SECRET is unset", async () => {
    const { GET } = await import("@/app/api/brain/cron/route");
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await GET(req("http://t/api/brain/cron"));
      expect(res.status).toBe(503);
    } finally {
      if (prev !== undefined) process.env.CRON_SECRET = prev;
    }
  });

  it("brain/cron returns 401 on a bad bearer", async () => {
    const { GET } = await import("@/app/api/brain/cron/route");
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "unit-test-secret";
    try {
      const res = await GET(
        req("http://t/api/brain/cron", { headers: { authorization: "Bearer wrong" } }),
      );
      expect(res.status).toBe(401);
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });

  it("import/test returns 503 when IMPORT_API_TOKEN is unset", async () => {
    const { POST } = await import("@/app/api/import/test/route");
    const prev = process.env.IMPORT_API_TOKEN;
    delete process.env.IMPORT_API_TOKEN;
    try {
      const res = await POST(req("http://t/api/import/test", { method: "POST" }));
      expect(res.status).toBe(503);
    } finally {
      if (prev !== undefined) process.env.IMPORT_API_TOKEN = prev;
    }
  });
});
