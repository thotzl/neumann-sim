---
id: "TCK-144"
title: "SSOT: Configs und Generator konsolidieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-142"]
---

# TCK-144: SSOT: Configs und Generator konsolidieren

## Description
Eine Quelle für Balancing-Werte (`rules.json`) und eine für prozedurale Generierung (`generator.py`).

## Verified Code Gap
- `src/sim_engine/config/balancing_rules.json` nur von Tests gelesen; produktiv `src/bob_os/core/lib/rules.json`.
- `src/sim_engine/services/generator.js` (774 Zeilen) noch von `state_exporter.js:5` genutzt, obwohl `generator.py` laut `7a93cf6` SSoT ist.
- `hud/src/shared/generator.ts` — Client-Duplikat.
- `tests/python/test_generator_parity.py` nicht im Hub.

## Definition of Done
- [ ] `balancing_rules.json` entfernt; Tests lesen `rules.json`.
- [ ] `state_exporter.js` nutzt keinen JS-Generator mehr (Daten aus DB/`generator.py`); `generator.js` entfernt.
- [ ] HUD: entweder `generator.ts` entfernt (Sektoren via `/api/universe/sectors`) oder als bewusstes Client-Rendering-Duplikat mit Parity-Test dokumentiert (Entscheidung im Ticket).
- [ ] Parity-Test im Hub, falls ein Duplikat bleibt.
- [ ] Alle Suites + HUD grün.

## Verification Command
`node tests/test_all.js && (cd hud && npx tsc --noEmit && npx vitest run)`

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a1--doppelte-konfiguration--tck-144)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
