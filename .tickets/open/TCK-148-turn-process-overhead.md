---
id: "TCK-148"
title: "PERF: Prozess-Overhead pro Turn messen und reduzieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: ["TCK-145"]
---

# TCK-148: PERF: Prozess-Overhead pro Turn messen und reduzieren

## Description
Erst messen (Prozessstarts, Dauer pro Turn), dann gezielt reduzieren.

## Verified Code Gap
- `environment.js:11` `bob.py --help` bei jedem Turn.
- Synchrones `execSync` blockiert Event-Loop/Broadcasts.

## Definition of Done
- [ ] Messwerte vor/nach im Ticket.
- [ ] `--help`-Ausgabe pro Lauf gecacht (Invalidierung bei `inject`).
- [ ] Keine Verhaltensänderung (Suites grün).

## Verification Command
`node tests/test_all.js + Messprotokoll`

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a6--prozess-starts-pro-turn--tck-148)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
