# Project Bobiverse - Initialization & Handoff

**[AN DEN NACHFOLGENDEN AGENTEN]:** Dies ist dein Einstiegspunkt. Du wurdest gerufen, um an einer LLM-basierten Multi-Agenten-Simulation zu arbeiten. 

## 0. BOOTSTRAPPING (Dein erster Zug)
Bevor du den User nach neuen Aufgaben fragst oder Vermutungen aufstellst, MUSS dein erster Schritt sein, den Code dieses Projekts zu verstehen. Führe sofort Dateilese-Operationen (`read_file` oder `run_shell_command`) auf folgende Kern-Dateien aus, um dein Context-Window aufzubauen:
1. `docs/IDEAS_AND_TASKS.md` (Die Roadmap)
2. `sim_engine/runner.js` (Die Gott-Maschine / Loop-Logik)
3. `bob_os/build.py` & `sim_engine/deploy.js` (CI/CD Pipeline)
4. `bob_os/_verse/tools/init_db.py` (Das physikalische SQLite-Schema)
5. `sim_engine/core-config.json` (Die Baseline-Regeln und Konstanten)
Erst wenn du diese Dateien im Kontext hast, bist du operativ bereit.

---

## 1. Die Vision & Das Konzept (Das "Bobiverse")
Wir simulieren ein expandierendes Netz aus autonomen von-Neumann-Sonden (benannt "Bobs", in Anlehnung an die Sci-Fi-Reihe).
- **Die Agenten (Kognition):** Jeder Bob wird durch einen LLM-Call (Gemini) gesteuert. Bobs haben einen eigenen Willen, ein eigenes Gedächtnis (Historie) und agieren autonom.
- **Die Engine (Der Runner):** Ein Node.js Skript (`sim_engine/runner.js`) orchestriert die Zeit (Runden-Ticks). Es sammelt die Agenten-Gedächtnisse, holt Antworten vom LLM, parst `[RUN: ...]` Befehle und injiziert die Ergebnisse (Resonanz) zurück in den Prompt der nächsten Runde.
- **Speicher-Kompression:** Da Kontext-Fenster begrenzt sind, führt das System regelmäßig eine "Destillation" (Zusammenfassung) der Agenten-Historien durch.
- **Die Physik (SQLite & Python):** Die Welt ist eine SQLite-Datenbank. Agenten verändern diese Welt *ausschließlich*, indem sie Python-Skripte (`mine.py`, `build.py`, etc.) aufrufen.
- **Automatisierung:** Bobs können selbst Python-Code schreiben und in `scripts/active/` ablegen. Diese Skripte werden vom Runner in jedem Zyklus automatisch ausgeführt und ihr Output wiederum vom LLM-Parser verarbeitet.

## 2. Die Ökonomie der Knappheit
Das Spiel zwingt die KIs zur Intelligenz durch physikalische Flaschenhälse:
- Jede Sonde hat ein fixes Tragelimit (100 Materie, 200 Energie).
- Replikation (das Schaffen eines neuen Bobs) kostet 500 Materie.
- **Zwang zur Infrastruktur:** Da ein Bob keine 500 Materie tragen kann, MUSS er im System Infrastruktur (Silos für Materie, Solar-Kollektoren für Energie) bauen.
- **System-Depots:** Gebäude gehören dem System (Planeten), nicht dem Bob. Logistik (`deposit.py`, `pickup.py`) und Zusammenarbeit sind der einzige Weg zum Erfolg.

## 3. Das Paradigma ("Code is King & CI/CD")
- **Master-Blueprint (`bob_os/`):** Hier leben die physikalischen "Naturgesetze" (Python-Tools, DB-Schema `init_db.py`). **Alle Fixes erfolgen ZWINGEND hier.** Keine manuellen Änderungen in den Laufzeit-Experimenten!
- **CI-Pipeline-Zwang:** Nichts wird gebaut oder deployed ohne `node sim_engine/test_all.js`. Die Pipeline validiert Geometrie, Logistik, Privacy-Sicherungen und führt einen E2E-API-Mock-Loop aus.

## 4. Status Quo: Physik v3.1 (Geometrie & Dynamische Logistik)
Wir haben die Phase der simplen "Teleport-Sandbox" hinter uns gelassen. Das System ist nun eine harte Vektor-Physik-Engine:
- **Raster-Snap:** Das Universum operiert auf einem diskreten 100er-Raster (`SYS-X[x]-Y[y]`). Startpunkt ist `SYS-X0-Y0`.
- **Discovery (Schrödinger):** `scan.py` generiert prozedural neue Koordinaten relativ zum scannenden Bob. Das Tool `rename_system.py` erlaubt die kognitive Taufe von Systemen.
- **Dynamische Reisen:** `move.py` verschiebt Agenten in den Status `traveling`. Die Distanz bestimmt die Reisedauer (Speed: 300/Tick) und die Energiekosten. Der `physics_update.py` Hook interpoliert den Flug pro Tick in der DB. Agenten können im Transit stranden (0 Energie), behalten aber ihre Kognition.

## 5. Workflows (Dein Operations-Handbuch)
- **Umgebung Starten:** `python3 bob_os/build.py <version> --rounds X --mission "..."` (Baut das Experiment, führt CI aus). Gefolgt von `node sim_engine/runner.js <version>`.
- **Live-Fixes Einspielen:** Code in `bob_os/` anpassen $\rightarrow$ `node sim_engine/deploy.js <version>`. Das Skript testet und synchronisiert die Python-Tools in das laufende Experiment.
- **Reset (Hard):** `build.py` mit `--force` Parameter löscht Laufzeitdaten (`state.json`) für einen sauberen Neustart.
- **Voice of God (VoG):** Im React-Frontend (`monitor/`) kannst du Live-Nachrichten eingeben. Die Vite-Middleware schreibt in `creator_msg.txt`, der Runner injiziert es am Zyklus-Ende in das Gedächtnis aller Agenten.
- **Frontend Start:** `cd monitor && bun dev --v=<version>`. Der Symlink (`public/live_verse`) wird automatisch auf das jeweilige Experiment geroutet.

## 6. Aktueller Projekt-Status (Ende der Session)
- Wir haben in der Sandbox (`move-sandbox`) die neuen v3.1 Mechaniken extrem erfolgreich vertestet (Flüge über mehrere Ticks, Interpolations-Rendering im Frontend, Dubletten-Schutz beim Naming).
- **Das Frontend** ist auf 2D-Vektor-Rendering umgestellt: Fliegende Agenten rotieren in Flugrichtung und gleiten über die Map. Private Sensordaten (`current_x`, `target_system`) sind via `dashboard.py` sicher von fremden Bobs abgeschirmt.
- **Nächster Fokus:** Siehe `docs/IDEAS_AND_TASKS.md`. Der Fokus liegt auf der Verfeinerung der interstellaren Infrastruktur (Planeten-Depots) und der Vorbereitung auf Phase 6 (Deterministisches Grid-Seed Universum).

**Initial-Direktive an dich:** Nutze die OODA, AIC und Steel-man Frameworks aus dem `analytical-directives` Skill für zukünftige Architektur-Entscheidungen. Gehe strikt testgetrieben vor. Keine Ausreden.
