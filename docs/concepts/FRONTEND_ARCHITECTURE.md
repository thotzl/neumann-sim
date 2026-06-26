# Bobiverse: Frontend Architecture & Integration Plan ("Operation Watchtower")

## 1. Architektonisches Prinzip
**Strikte Entkopplung:** Das Frontend ist ein reiner Consumer. Es ist eine Augmentation. Die Simulation (Bob-OS) muss zu 100% ohne das Frontend lauffähig sein. Der Datenfluss ist streng uni-direktional: Bob-OS -> World State -> Frontend.

## 2. Phase 1: Der Resiliente Emitter (Bob-OS)
Das Backend (Node.js Runner) muss einen "World State" produzieren, ohne die Simulation zu blockieren oder File-Locks zu provozieren.

- **Atomares Speichern:** Der Runner generiert das aggregierte JSON. Er schreibt es zuerst in eine `world_state.tmp` Datei und führt danach ein atomares `fs.renameSync('world_state.tmp', 'world_state.json')` durch. Dies verhindert, dass das Frontend korrupte/halbe JSON-Daten einliest.
- **Der Aggregator (`state_exporter.js`):**
  - *Input 1:* SQLite `universe.db` (Harte Fakten: Ressourcen, Agenten-Koordinaten, Infrastruktur).
  - *Input 2:* RAM-State `state.json` (Weiche Fakten: Aktueller Turn, letzte Manifestation/Gedanken des Agenten).
  - *Output:* Das `WorldState` JSON-Objekt.
- **Fehlertoleranz:** Wenn der Export fehlschlägt (z.B. DB gelockt), ignoriert der Runner den Fehler und setzt die Simulation unbeeindruckt fort.

## 3. Phase 2: Das Tactical Frontend (Consumer)
Ein separates Projektverzeichnis (z.B. `./bob_monitor`), das unabhängig gestartet wird.

- **Stack:** Bun, React, TypeScript, Vite.
- **Resilient Polling:** Die UI nutzt einen Polling-Mechanismus (z.B. alle 500ms).
  - *Retry-Logik:* Schlägt der `fetch` fehl (File Lock, JSON Parse Error), wird der Fehler abgefangen und der vorherige Zustand beibehalten. Im nächsten Intervall wird es erneut versucht.
- **Deep Reactivity:** Das UI nutzt Reacts State-Mechanismen. Das gepollte JSON wird mit dem vorherigen verglichen. Nur bei Differenzen (z.B. neue Koordinaten, neue `last_manifestation`) werden Animationen oder Sprechblasen getriggert.

## 4. Phase 3: Testing & Rollout
1. **Unit Tests (Bob-OS):** Die `test_suite` wird erweitert, um die Struktur und das atomare Schreiben des Exporters zu validieren.
2. **Integration:** Wir bauen das Experiment v46 neu. Die Simulation läuft. Das Frontend wird danach als separater Prozess (z.B. in einem anderen Terminal-Tab) gestartet und "klinkt" sich visuell ein.
