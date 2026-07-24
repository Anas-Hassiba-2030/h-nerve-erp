// src/instrumentation.ts — Next.js instrumentation hook.
//
// `onRequestError` is Next's catch-all for server-side errors: anything thrown
// in a server component, a route handler, a server action, or middleware lands
// here after Next has already handled the response. That makes it the one
// place where an uncaught production failure becomes visible without touching
// every call site.
//
// This complements, and does not replace, the per-action try/catch +
// flashToast rule in CLAUDE.md. Those catches keep the UI honest (the user
// gets feedback); this hook keeps the OPERATOR honest (you find out at all).
// Errors that are caught and swallowed never reach `onRequestError`, so those
// catch blocks call reportError() directly.
//
// `register` runs once per server instance. It is deliberately empty of
// third-party SDK bootstrapping — the reporter is keyless and needs no init.

import type { Instrumentation } from "next";

export function register(): void {
  // No-op. Reporting is stateless; see lib/observability/report.ts for why
  // there is no SDK to initialize.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Imported lazily so the reporter (and the logger it pulls in) is only
  // loaded on the error path, never in the happy-path bundle.
  const { reportError } = await import("@/lib/observability/report");

  reportError("unhandled request error", err, {
    path: request.path,
    method: request.method,
    // Next tells us WHERE it blew up — a server action failing is a very
    // different incident from a page render failing, and this is the field
    // that separates them when you filter the logs.
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
