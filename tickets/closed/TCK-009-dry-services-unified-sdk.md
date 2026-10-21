---
id: TCK-009
title: "DRY Core Services & Unified SDK"
epic_phase: "Refactoring Plan V10.5"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Zerschlagung der alten massiven, hartcodierten Python-Scripte und Zusammenführung aller Aktionen in ein modulares SDK, das über einen zentralen `agent_service`, `config_service` und `physics_service` gesteuert wird.

## Verification (Code SSoT)
- **Source Code:**
  - `bob_os/core/lib/config_service.py` -> Lädt Konstanten direkt aus der SSoT JSON (`rules.json`).
  - `bob_os/core/lib/physics_service.py` -> Zustandlose Berechnungslogik (Upgrade-Kosten, Distanzen, CAD-Evaluator).
  - `bob_os/core/lib/agent_service.py` -> Zentraler DB-Zugriff und Kapselung der Ressourcen-Aktualisierung.
  - `bob_os/core/lib/bob_sdk.py` -> Schlanke Delegations-Facade, die auf modulare Submodule unter `bob_os/core/lib/sdk/` verweist.

## System Impact
Erreicht absolute DRY-Präzision und sorgt dafür, dass Änderungen in `rules.json` sofort im gesamten Universum greifen.

## References
- Refactoring-Plan: [REFACTORING_PLAN.md](../resources/done/REFACTORING_PLAN.md)
