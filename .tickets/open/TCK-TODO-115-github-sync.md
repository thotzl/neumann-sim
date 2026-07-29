---
id: TCK-TODO-115
title: "GitHub Issues & Projects Direct Code Sync Integration"
epic_phase: "Developer Experience & CI"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-TODO-114"]
---

## Description
Entwicklung eines nativen, leichtgewichtigen Synchronisations-Skripts (`sim_engine/utils/sync_github.js`), welches die lokalen YAML-basierten Ticket-Dateien unter `.tickets/` direkt über die GitHub REST & GraphQL API mit GitHub Issues und dem GitHub Project Board v2 abgleicht.

## Verified Code Gap
- **Code Path:**
  - Neues Skript `sim_engine/utils/sync_github.js` (Nutzt native Node.js fetch API und process.env.GITHUB_TOKEN).
  - Integration eines Git-Hooks (`.git/hooks/post-commit`) oder einer GitHub Action zur automatischen Synchronisierung bei Code-Änderungen.

## Synergies & Dependencies
- **Dependencies:** `TCK-TODO-114` (Struktur-Refactoring).
- **Synergies:** Ermöglicht die nahtlose Verwaltung deines Project-Boards direkt aus dem Code heraus. Jedes Verschieben eines Tickets im Code verschiebt das Ticket automatisch auf GitHub.

## References
- Git-basierter Betriebsguide: [EPIC_CONSOLIDATION_BACKLOG.md](../docs/EPIC_CONSOLIDATION_BACKLOG.md)
