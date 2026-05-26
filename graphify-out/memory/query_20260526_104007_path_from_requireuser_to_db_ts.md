---
type: "path_query"
date: "2026-05-26T10:40:07.922933+00:00"
question: "Path from requireUser to db.ts"
contributor: "graphify"
source_nodes: ["requireUser()", "db.ts"]
---

# Q: Path from requireUser to db.ts

## Answer

requireUser() (lib/session.ts) --imports--> a feature actions.ts --imports_from--> db.ts (lib/db.ts), which contains makeScopedClient(). So auth and the scoped Prisma client meet inside each server action module: the action imports both the guard and the client.

## Source Nodes

- requireUser()
- db.ts