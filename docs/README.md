# AI Experimentation Sandbox: Sim-Agent-Loop

Projekt zur Erforschung autonomer KI-Interaktion in isolierten Umgebungen.

## Schnelleinstieg

### Neue Version erstellen
```bash
node .agents/skills/sim-agent-loop/scripts/runner.js v28
```
Dies erstellt den Ordner `experiments/v28/` mit einer Standard-`config.json`.

### Simulation starten / fortsetzen
```bash
node .agents/skills/sim-agent-loop/scripts/runner.js v28
```
Derselbe Befehl setzt eine unterbrochene Simulation dank der `state.json` fort.

### Architektur-Übersicht
- **Runner:** `.agents/skills/sim-agent-loop/scripts/runner.js`
- **Globale Regeln:** `.agents/skills/sim-agent-loop/core-config.json`
- **Dokumentation:** Siehe `SIMULATION_GUIDE.md` für Details zu Gedächtnis-Destillation, Anonymität und technischem Protokoll.

## Kern-Features
- **Epochal Memory:** Skalierbares Gedächtnis durch zyklische Zusammenfassung.
- **Death Logic:** Simulierte Endlichkeit mit zufälligen Sterbezeitpunkten.
- **Multi-Agent-Sync:** Klares Rollenverständnis durch `[EIGENIMPULS]` und `[FREMDRESONANZ]`.
- **State-Persistence:** Vollständige Checkpoints nach jedem Zug.
