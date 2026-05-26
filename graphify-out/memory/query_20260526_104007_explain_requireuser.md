---
type: "explain"
date: "2026-05-26T10:40:07.502575+00:00"
question: "Explain requireUser"
contributor: "graphify"
source_nodes: ["requireUser()"]
---

# Q: Explain requireUser

## Answer

requireUser() at lib/session.ts:75, degree 125. Auth choke-point imported by virtually every server action (admin tenants, alerts, brain/*, imports). Gates each mutation before prisma writes.

## Source Nodes

- requireUser()