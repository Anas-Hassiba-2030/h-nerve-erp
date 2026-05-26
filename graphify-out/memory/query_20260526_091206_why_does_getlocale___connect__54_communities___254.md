---
type: "query"
date: "2026-05-26T09:12:06.938415+00:00"
question: "Why does getLocale() connect ~54 communities / 254 callers?"
contributor: "graphify"
source_nodes: ["getLocale()", "App Routes & API Handlers", "Preferences & Root Layout"]
---

# Q: Why does getLocale() connect ~54 communities / 254 callers?

## Answer

getLocale() (lib/i18n.server.ts:15) reads the h_nerve_locale cookie and returns Locale; getMessages/t/isRtl all derive from it. 254 callers span every route group ((app) 210, (admin) 20, (auth) 6, m 4, theater 2) plus Footer/PageHeader. Arabic-first + RTL mandate means every server-rendered surface must resolve locale before emitting text/direction, making i18n the substrate — ranked above auth (requireUser 125) in connectivity. Betweenness 0.093, top bridge.

## Source Nodes

- getLocale()
- App Routes & API Handlers
- Preferences & Root Layout