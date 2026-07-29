---
id: TCK-003
title: "Scope-Filtered Injected Dashboard (Token Pruning)"
epic_phase: "Optimization Levers 1 & 3 (Language & Perception)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Verhindert redundante manuelle SDK-Aufrufe (`dashboard()`), um wertvolle API-Tokens einzusparen. Der Runner injiziert das Sektor-Dashboard automatisch in jedem Turn. Das Dashboard ist strikt auf den aktuellen Sektor gefiltert.

## Verification (Code SSoT)
- **Source Code:** 
  - `sim_engine/runner.js` (Zeilen 277-282) führt automatisch `dashboard()` aus und hängt es an den Prompt an.
  - `bob_os/core/lib/sdk/sensors.py` -> `local_system()` liefert ausschließlich lokale Sektor-Ressourcen und -Objekte zurück.

## System Impact
Reduziert den Prompt-Overhead um bis zu 40% und stellt sicher, dass Agenten immer über den aktuellen Zustand informiert sind.

## References
- Hebel 1 (Dashboard Pruning): [OPTIMIZATION_LEVER_1_DASHBOARD_PRUNING.md](../resources/done/OPTIMIZATION_LEVER_1_DASHBOARD_PRUNING.md)
- Hebel 3 (Language Alignment): [OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md](../resources/done/OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md)
- Token- & Limit-Spezifikationen: [FREE_CLOUD_AND_AI_LABS_EVALUATION.md](../resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md)
- Google Cloud Setup-Anleitung: [GOOGLE_CLOUD_MIGRATION.md](../resources/done/GOOGLE_CLOUD_MIGRATION.md)
