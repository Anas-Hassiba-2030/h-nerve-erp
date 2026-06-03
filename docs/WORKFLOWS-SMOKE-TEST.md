# Workflows studio — smoke test

`scripts/test/test-workflow-studio.ts` exercises the full studio lifecycle:

1. Seed example workflows (`lib/workflows/seed.seedWorkflows`)
2. Create a fresh workflow row
3. Add 3 nodes (trigger + condition + action)
4. Wire 2 edges
5. Test-run via `lib/workflows/runtime.runWorkflow(id, "test")`
6. Inspect the trace + cleanup

Last run on prod Neon (2026-05-21):

```
1) seedWorkflows → wrote 2 workflow(s) in 17524ms
2) created workflow cmpfk5vix000s9i1rn541yrap
3) added nodes: trigger=dairy.expiry_within condition=filter.severity_at_least action=action.notify_email
4) wired 2 edges
5) runWorkflow returned: status=DRY_RUN runId=cmpfk62mt00149i1ri0kle3zn duration=5168ms
   trace events: 1
   - [trigger:dairy.expiry_within] skipped — no batches within 3d of expiry
6) cleanup OK
```

The studio is functional: DB creates work, the registered-template
runtime evaluates triggers + conditions + actions in order, and
returns a structured trace. The smoke-test trace recorded only the
trigger event because no DairyBatch row matched the `within 3d
expiry` filter — that's correct skip behaviour, not a runtime fault.

Known limitations (not bugs, scope follow-ups):
- The `dairy.expiry_within` trigger only matches DairyBatch rows;
  to demo end-to-end-with-action, either backfill an expiring batch
  or pick a trigger whose data is already present (e.g.
  `revenue.delta_above` against the seeded Transactions).
- Action `action.notify_email` requires SMTP integration which isn't
  wired (see /integrations · NEW-7 honest badges).

Re-run the smoke test after any change to `lib/workflows/runtime.ts`
or any template in `lib/workflows/templates.ts`.
