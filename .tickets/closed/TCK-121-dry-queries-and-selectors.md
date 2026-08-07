---
id: TCK-121
title: "DRY-Up: Unified Database Queries and State Selectors"
epic_phase: "Refactoring & Code Quality"
status: "closed"
priority: "medium"
created: 2026-08-07
completed: 2026-08-07
version: "v10.5"
dependencies: []
---

## Description
This ticket aims to clean up redundancy and logic drift across the Bob-OS codebase by unifying database queries and state selectors.
Currently, complex `CASE WHEN host_type = 'ship' ...` subqueries are duplicated between Python (`agent_service.py`) and JavaScript (`state_exporter.js`), creating logic drift and unnecessary maintenance overhead.
Additionally, the frontend React components perform ad-hoc entity lookups and run coordinate self-healing loops that should be resolved by relying on a clean backend Single Source of Truth (SSoT) and centralized client selectors.

---

## Verification (Code SSoT)

### 1. Database-Layer Unification (SQLite View)
- **Migration Script:** `src/bob_os/core/migrations/0003_unified_views.sql` deklariert die performanten SQLite Views `v_agents` und `v_ships`.
- **v_agents View:** Übernimmt die präzise, dynamische Standort-, Inventar- und Kapazitätsauflösung von `agents` mitsamt ihren physischen Trägerkörpern (`ships`, `infrastructure` / `systems`).
- **v_ships View:** Erledigt den dynamischen Join von Schiffen zu ihren Blueprint-Spezifikationen für performantere SDK-Abfragen.

### 2. Backend & SDK Simplification (DRY Queries)
- **Python Agent Service:** `src/bob_os/core/lib/agent_service.py` refaktoriert. `get_agent_or_fail` nutzt nun standardmäßig `v_agents` mitsamt einem robusten, dreistufigen Fallback für Mock-Datenbanken (Tier 1 `v_agents` -> Tier 2 CASE Subqueries -> Tier 3 Raw table), was volle Abwärtskompatibilität gewährt.
- **Node.js State Exporter:** `src/sim_engine/services/state_exporter.js` nutzt `v_agents` zur Datenaggregation, wodurch über 30 Zeilen SQL-Duplikation eingespart wurden.

### 3. Client-Side Store Cleanup
- **Zustand State Store:** `hud/src/monitor/store/stateStore.ts` bereinigt. Der komplexe imperative "Coordinate & Location Self-Healing Loop" wurde vollständig entfernt. Der Client vertraut nun vollständig den vorauflösten Standorten und Inventaren aus der Backend-View.

### 4. Typsafe Client-Side State Selectors (TypeScript)
- **Selector-Bibliothek:** `hud/src/monitor/store/stateSelectors.ts` erfolgreich angelegt. Beinhaltet typsichere, wiederverwendbare Selektoren (`selectAgentById`, `selectSystemByName`, `selectShipById`, `selectHostShipForAgent`, `selectLocalAgents`, `selectLocalShips`).
- **Layout- & Panel-Refactoring:**
  - `hud/src/monitor/components/InspectorPanel.tsx` nutzt die neuen Selektoren für saubere Entity-Lookups.
  - `hud/src/monitor/utils/dashboardHelpers.ts` (`buildBobDashboard`) nutzt die Selektoren zur Abfrage lokaler Schiffe, Systeme und Klone.

### 5. Automated Unit & Integration Tests
- **Database Views Test Suite:** `tests/js/test_v12_1_views.js` deklariert native Assertions zur Überprüfung der Views unter SQLite (vollständig integriert in `tests/test_all.js`).
- **TypeScript Selectors Test Suite:** `hud/src/monitor/store/stateSelectors.test.ts` deklariert umfassende Testfälle zur Verifikation der Selektoren unter Vitest.
- **Test-Ergebnisse:**
  - `tests/test_all.js` meldet **ALL TESTS PASSED SUCCESSFULLY!** (Alle 30+ Backend/Python/Node-Tests grün).
  - `npm run test` (Vitest) meldet **27 passed (27)** (Alle 27 Frontend-Tests grün).
  - `npm run build` kompiliert fehlerfrei in **3.40s**.

---

## References
- Epic Plan: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
