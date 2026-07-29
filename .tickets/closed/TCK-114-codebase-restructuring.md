---
id: TCK-114
title: "Großes Struktur- & Architektur-Refactoring (V13.0 Codebase Polish)"
epic_phase: "V13.0 Clean Architecture"
status: "closed"
priority: "high"
created: 2026-07-28
completed: 2026-07-29
version: "v13.0"
dependencies: []
---

## Description
Umfassende Bereinigung der Projektstruktur und Modularisierung der Codebase. Das Ziel ist eine saubere Trennung von Zuständigkeiten (Clean Architecture), eine dedizierte `src/` Verzeichnisstruktur und striktes DRY (Don't Repeat Yourself). Inline-Fremdcode wird komplett verboten. Dieses Epic ist extrem umfangreich und muss zwingend in kleinen, iterativ abschließbaren Einzelschritten (Commits) abgearbeitet werden. Detail-Entscheidungen werden auf dem Weg geklärt.

### Hauptziele:
1. **Verzeichnis- & Datei-Struktur:**
   - Alle zu bauenden Quellcodes wandern in einen neuen `src/` Ordner (kein Code-Müll mehr im Root-Verzeichnis).
   - Sämtliche Tests aus `bob_os/test_suite/`, `sim_engine/` und dem Root-Verzeichnis werden in einen globalen, zentralen `tests/` Ordner migriert. Die bestehenden Tests dürfen dabei in ihrer Logik nicht verändert werden, lediglich Import-Pfade sind anzupassen. Neue Komponenten erhalten eigene neue Tests.
   - Alle isolierten "Run-Scripte" (z.B. Deploy, Build) wandern in einen dedizierten Skript-Ordner.
   - Konsequente Löschung aller veralteten Müll-Dateien, Backups (`*.bak`, `legacy_runner.js`) und temporärer Helper-Skripte, die von Agenten generiert wurden.

2. **Runner-Degradierung & Modularisierung:**
   - Der `runner.js` wird radikal verschlankt. Er darf nahezu keine eigene Geschäftslogik mehr enthalten, sondern fungiert als reiner Orchestrator, der externe Module triggert.
   - Auslagerung von Code in wiederverwendbare `utils`, `helpers`, `modules` und `services` (z.B. ein dedizierter `DbService`). Dies gilt für JS/TS ebenso wie für Python.

3. **Verbot von Inline-Fremdcode:**
   - Es darf keinen Inline-Python-Code in JS/TS geben und umgekehrt. Ebenfalls keine harten Inline-Shell-Skripte.
   - Solcher Code muss sauber in eigenständige Dateien (`.py`, `.sh`) ausgelagert und über typsichere externe Aufrufe getriggert werden.

## Verification (Code SSoT)
- **Directory Structure:** All engine modules are centralized under `/src/sim_engine/` and core Python code under `/src/bob_os/core/`.
- **Decoupled Services:** Monolithic runner logic is modularized into `mailbox_service.js`, `physics_round_service.js`, and `agent_turn_service.js` under `/src/sim_engine/services/`.
- **Seeder Separation:** Separated normal randomized geology (`seed_db.py`) from test-deterministic geology (`seed_test_db.py`).
- **Test Coverage:** All new services are verified by newly created standalone unit test suites in `tests/test_all.js` (including `test_mailbox_service.js`, `test_physics_round_service.js`, `test_agent_turn_service.js`, and `test_seeder.py`). All 22+ suites are completely green.

## Synergies & Dependencies
- **Dependencies:** Keine.
- **Synergies:** Sichert die Skalierbarkeit für kommende KI-Modelle, reduziert extrem den Token-Verbrauch bei globalen Code-Scans und senkt die Fehleranfälligkeit bei zukünftigen Features drastisch.

## References
- Bisherige System-Architektur: [SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md)
- DRY Services Referenz: [REFACTORING_PLAN.md](../resources/done/REFACTORING_PLAN.md)
