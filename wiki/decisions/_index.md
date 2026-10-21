# Decisions (ADRs)

Architecture decision records, kept 1:1 in German (only links were adjusted when `docs/` was removed, TCK-176).

| ADR | Decision |
|---|---|
| [0001 Linux container runtime](0001-linux-container-runtime.md) | Development and tests run only in Linux containers; Windows/macOS are hosts only |
| [0002 Containerized simulation runtime](0002-containerized-simulation-runtime.md) | Simulations with real LLM agents run only in the hardened runtime container |
| [0003 Ticket pool and epics](0003-ticket-pool-and-epics.md) | Status = folder; `pool/` for ideas and `epics/` for roadmaps, both synced to GitHub |
| [0004 Wiki replaces docs/](0004-wiki-replaces-docs.md) | `wiki/` is the documentation; tickets plan, wiki documents; ADRs in `wiki/decisions/`, changelog in the root, ticket index in `tickets/` |

New ADRs are written when a ticket closes with an architecture, runtime or process decision ([[wiki/operations/ticket-workflow]]).
