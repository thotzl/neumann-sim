# SKILL: Project Workflows (Experimental Design)

Dieses Dokument definiert die Abläufe zur Durchführung, Aktualisierung und Dokumentation von Experimenten.

## 1. Experiment-Lifecycle (Build & Reset)
Die Erstellung oder der vollständige Reset eines Experiments erfolgt AUSSCHLIESSLICH über das Build-System.
1. **Definition:** Festlegen von Mission und Runden in den Kommandozeilen-Parametern.
2. **Execution:** `python3 bob_os/build.py vXX --rounds 1000 --mission "..."`.
    - Das Skript führt automatisch die **CI-Pipeline** aus.
    - Bei Erfolg wird die Datenbank initialisiert und die Config aus dem Template generiert.
3. **Start:** `node sim_engine/runner.js vXX`.

## 2. Live-Updates (Deployment)
Um Bugfixes oder neue Tools in laufende Experimente zu übertragen, ohne den Fortschritt (DB/State) zu verlieren:
1. **Fix:** Änderung im Master (`bob_os/_verse/tools/`).
2. **Validierung:** Lokales Testen.
3. **Deploy:** `node sim_engine/deploy.js [vXX]`.
    - Führt alle Tests aus.
    - Synchronisiert nur die Code-Dateien (.py) mit den Ziel-Experimenten.

## 3. Recovery & Resume
Bei Unterbrechungen kann das Experiment durch erneuten Aufruf des Runners fortgesetzt werden.
- Der Runner erkennt die `state.json` und setzt am exakten Punkt des Abbruchs auf.
- Alle Agenten erhalten beim Resume automatisch einen System-Hinweis.

## 4. Dokumentations-Standard
- **Experiments-Ordner:** Enthält Config, Log, State, History und Report.
- **`SIMULATION_GUIDE.md`**: Zentrale technische Übersicht des Frameworks.
