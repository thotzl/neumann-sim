# Multi-Agent Framework: Operatives Handbuch

Einstiegspunkt für die technische und philosophische Arbeit mit diesem Framework. Bedienung (Build, Start, Tests): [README.md](../README.md). Architektur: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

## 1. Das technische Paradigma
Das Framework basiert auf dem Prinzip der **minimalen Einmischung**.

### Die Schichten der Instruktion
1. **Globale System-Instruktion (Substrat):** `global_system_instruction` in `src/sim_engine/config/core-config.json` definiert Identität, kognitives Protokoll (LOGBOOK → ACTION) und Syntax (`[RUN: me ...]`, `[WRITE: ...]...[END]`, `[READ: ...]`, `[KEY: ...]`).
2. **Individueller Prompt (Impuls):** Mission pro Agent in der Experiment-`config.json` (`scripts/build.py --mission`, Vorlage `src/bob_os/templates/mission_template.json`).
3. **Hardware-Hilfe:** die Ausgabe von `me --help` (`core/bin/bob.py`) wird jedem Turn beigelegt; Kosten stammen aus `rules.json`.

## 2. Kern-Mechaniken
- **Sandbox `scripts/`:** Agenten schreiben, lesen und löschen Dateien nur unter `_verse/scripts/`; alle übrigen Pfade sind geschützte Hardware-Schicht. RUN akzeptiert nur SDK-Aufrufe (`me ...`) und `python3 scripts/<datei>.py`.
- **Gedächtnis-Destillation:** Überschreitet die frische Historie `memory.soft_token_limit` (oder die Gesamthistorie `hard_token_limit`), komprimiert die Rolle `compressor` sie zu einem Extrakt (`src/sim_engine/services/memory_controller.js`). Zusätzlich persistentes Wissen über `me.memo(...)` und `me.docs(...)`.
- **Standby:** `me.sleep(duration=N, ignore_scut=true)` überspringt Turns, bis Timer oder Sensoren (`wakeup_manager.js`) wecken.
- **Replikation:** Klone entstehen über `mind_forge`/`replicate` und erben das Gedächtnis (Hard-Boot, `bootstrapper.js`).

### 2.1 Interstellare Stargates (v13.6+)
- **Infrastruktur:** Sender- und Empfängersystem benötigen je ein aktives `wormhole_gate`.
- **Kopplung:** `me.link_gate(target_sector)` verknüpft beide Gates bidirektional (`linked_system`).
- **Transit:** Das Routing (`me.route()`, `sdk/sensors.py`) behandelt gekoppelte Gates als Kante ohne Distanzkosten.
- Hinweis: `wormhole_gate` hat keinen Eintrag in `rules.json` → `infrastructure`; `me.build()` nutzt dann den Fallback (400 `raw_matter`, keine Wartungskosten) und `me --help` listet den Typ nicht.

## 3. Qualität & Wartung
- **Tests:** `npm run test:docker` (alle Suites aus `tests/test_all.js` im Linux-Container).
- **Balancing:** Werte nur in `src/bob_os/core/lib/rules.json` ändern ([ECONOMY_MANIFEST.md](ECONOMY_MANIFEST.md)).
- **Engine-Marker:** Tags und Syntax-Konstanten liegen in `src/sim_engine/helpers/constants.js`.
- **Laufende Experimente patchen:** `npm run inject <exp> engine|tools|migrate|<pfad>` (nur nativer Pfad).

## 4. Philosophische Leitplanke
Dieses Framework ist kein Spiel, sondern ein Labor zur Erforschung autonomer Intelligenz. Respektiere den Eigensinn der Agenten. Wenn sie gegen das Gedächtnis rebellieren oder eigene Strukturen erschaffen, dokumentiere dies im Report.
