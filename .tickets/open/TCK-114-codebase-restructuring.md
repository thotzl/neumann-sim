---
id: TCK-114
title: "Großes Struktur- & Architektur-Refactoring (V13.0 Codebase Polish)"
epic_phase: "V13.0 Clean Architecture"
status: "open"
priority: "high"
created: 2026-07-28
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

## Verified Code Gap
- **Code Path:**
  - `sim_engine/runner.js` (und verwandte Dateien) sind zu monolithisch und beinhalten Geschäftslogik sowie inline Strings für externe Aufrufe.
  - Tests liegen dezentral in `bob_os/test_suite/` (Python/JS gemischt) und in `sim_engine/`.
  - Müll-Dateien wie `legacy_runner.js`, `runner.js.bak`, Python Cache-Ordner (`__pycache__`) liegen unaufgeräumt in der Codebase.
  - Kein zentraler `src/` Architektur-Einstiegspunkt.

## Synergies & Dependencies
- **Dependencies:** Keine.
- **Synergies:** Sichert die Skalierbarkeit für kommende KI-Modelle, reduziert extrem den Token-Verbrauch bei globalen Code-Scans und senkt die Fehleranfälligkeit bei zukünftigen Features drastisch.

## References
- Bisherige System-Architektur: [SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md)
- DRY Services Referenz: [REFACTORING_PLAN.md](../resources/done/REFACTORING_PLAN.md)
