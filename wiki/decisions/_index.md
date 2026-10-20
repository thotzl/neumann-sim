# Decisions (ADRs)

Architecture decision records. They are kept 1:1 (German, unchanged); this index only links them.

| ADR | Decision |
|---|---|
| [0001 Linux container runtime](../../docs/adr/0001-linux-container-runtime.md) | Development and tests run only in Linux containers; Windows/macOS are hosts only |
| [0002 Containerized simulation runtime](../../docs/adr/0002-containerized-simulation-runtime.md) | Simulations with real LLM agents run only in the hardened runtime container |
| [0003 Ticket pool and epics](../../docs/adr/0003-ticket-pool-and-epics.md) | Status = folder; `pool/` for ideas and `epics/` for roadmaps, both synced to GitHub |

New ADRs are written when a ticket closes with an architecture, runtime or process decision ([[wiki/operations/ticket-workflow]]).
