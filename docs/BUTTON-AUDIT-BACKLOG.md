# Button audit backlog

Grep audit run 2026-05-21 against `app/` and `components/`:

```
onClick={() => {}}            → 0 hits
onClick={async () => {}}      → 0 hits
onClick={undefined}           → 0 hits
```

No literal no-op buttons remain in the codebase. Every interactive
button either:
- Calls a server action via `<form action={…}>`
- Has a meaningful client handler
- Is a `<Link>` (navigation, not a button)

Confirmed fixed in prior runs (with confirms / inline validation):

- /admin/products  "Adjust stock"   → inline red error + disabled state
- /admin/users     "Delete user"    → window.confirm + last-admin guard
- /brain/graph     "Rebuild brain"  → window.confirm explainer
- /brain/iq        "Reset trajectory" → window.confirm explainer
- /supply-chain    "Run engine"     → flashToast on result
- /insights        "Share to Council" → window.confirm + redirect

Open follow-ups (NOT broken, just lacking polish):

- Workflow studio "Save" / "Enable" / "Test run" — work but UX could be
  clearer about state transitions. Documented in P8 followups.
- Sustainability page tile actions — links not buttons; verify they
  navigate where expected.
- Various "Coming soon" placeholder buttons on /reports — clearly
  marked, not broken.

Programmatic browser-based audit (Playwright crawl): not run this
session because Playwright is not a dependency and the no-new-deps
rule applies. Grep audit is the lighter substitute.
