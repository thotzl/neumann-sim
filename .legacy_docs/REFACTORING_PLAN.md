# Architektur-Refactoring Plan (DRY & Services)

## 1. Zielsetzung
Beseitigung von Code-Duplikation, Kapselung von Geschäftslogik in zentrale Services und Sicherstellung der Datenkonsistenz (Config-Driven Physics) in der Python-Umgebung (`bob_os`).

## 2. Problem-Analyse (Status Quo)
*   **Hardcodes:** Physik-Tools (`move.py`, `dashboard.py`) ignorieren die `core-config.json` und nutzen hartcodierte Konstanten (`speed=300`, `cost=0.1`).
*   **Redundante DB-Calls:** Jedes Skript führt manuelles Agent-Loading durch (`SELECT ... WHERE id=? OR chosen_name=?`).
*   **Dezentrale Guards:** Überprüfungen wie `if status == 'traveling'` sind über 5 Dateien verstreut.
*   **Berechnungs-Duplikate:** Euklidische Distanzen und ETA-Kalkulationen finden an drei separaten Stellen statt.

## 3. Die Service-Architektur (MECE)

### A. Core Configuration Service (`bob_os/_verse/tools/core/config_service.py`)
Zuständig für das Laden und Bereitstellen von globalen Konstanten.
*   `get_physics_constants()`: Lädt die Werte dynamisch aus der Json-Config der Simulation (oder Fallback-Defaults).

### B. Physics & Math Service (`bob_os/_verse/tools/core/physics_service.py`)
Reine, zustandslose Berechnungslogik.
*   `calc_distance(x1, y1, x2, y2) -> float`
*   `calc_travel_cost(dist, cost_factor) -> int`
*   `calc_eta(dist, speed) -> int`

### C. Agent Domain Service (`bob_os/_verse/tools/core/agent_service.py`)
Kapselt den Zugriff und die Validierung von Agenten-Entitäten.
*   `get_agent_or_fail(cursor, agent_id)`: Lädt den Agenten, bricht mit `[FEHLER]` ab, falls nicht gefunden.
*   `require_active_status(agent)`: Bricht mit `[VERWEIGERT]` ab, falls der Agent den Status `traveling` (oder andere blockierende Zustände) hat.

## 4. Implementierungs-Phasen

**Phase 1: Fundament (Services)**
- Erstellung des Ordners `core/`.
- Implementierung von `config_service.py`, `physics_service.py` und `agent_service.py`.

**Phase 2: Logistik-Migration**
- Refactoring von `move.py`, `dashboard.py` und `physics_update.py`.
- Einbindung der dynamischen Werte und der Mathe-Utilities.
- *Zweck:* Behebung des kritischen Bugs, dass Config-Änderungen derzeit ignoriert werden.

**Phase 3: Tool-Bereinigung**
- Refactoring von `mine.py`, `build.py`, `scan.py`, `replicate.py`, `deposit.py`, `pickup.py`, `deconstruct.py`.
- Ersetzen der Boilerplate-Queries durch `agent_service.get_agent_or_fail()`.

**Phase 4: Test-Validation**
- Ausführen von `node sim_engine/test_all.js`.
- Sicherstellen, dass das Refactoring keine funktionalen Änderungen erzeugt hat (Regression-Test).
