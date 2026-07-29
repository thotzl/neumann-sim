---
id: TCK-DONE-014
title: "GitHub Issues & Projects Direct Code Sync Integration"
epic_phase: "Developer Experience & CI"
status: "closed"
priority: "medium"
version: "v13.0"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Entwicklung eines nativen, leichtgewichtigen Synchronisations-Skripts (`.github/scripts/sync_github.js`), welches die lokalen YAML-basierten Ticket-Dateien unter `.tickets/` direkt über die GitHub REST & GraphQL API mit GitHub Issues und dem GitHub Project Board v2 abgleicht.

## Verification (Code SSoT)
- **Source Code (Sync Automation):**
  - `.github/scripts/sync_github.js` -> Standalone, dependenzfreier Node-Code. Parst das YAML Frontmatter aller lokalen Ticket-Dateien und vergleicht diese mit den aktuellen GitHub Issues über die native Node.js `fetch` API. Führt automatische CRUD/Patch-Operationen aus, um Titel, Body, State (open/closed) und Labels (`priority:xxx`, `status:xxx`, `epic:xxx`) zu synchronisieren.
- **CI/CD Integration (GitHub Actions):**
  - `.github/workflows/sync-tickets.yml` -> Konfiguriertes Workflow-Skript, das den Sync-Prozess bei jedem Push in den `master`-Zweig automatisch im Cloud-Runner unter Übergabe des `GITHUB_TOKEN` ausführt.

## References
- Git-basierter Betriebsguide: [EPIC_CONSOLIDATION_BACKLOG.md](../docs/EPIC_CONSOLIDATION_BACKLOG.md)
