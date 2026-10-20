# 01 — Security & Isolation

Zurück zum [Index](README.md).

Das Projekt beschreibt `_verse/` als „Sandbox“. Technisch existiert diese Isolation nicht: Die Grenze besteht aus `cwd` und Regex-Prüfungen. Da die Agenten LLMs mit freiem Text-Output sind, ist jede Lücke durch Zufall oder durch emergentes Verhalten erreichbar.

## S1 — Beliebige Shell-Ausführung aus `[RUN: …]` (kritisch) → TCK-138

- `src/sim_engine/modules/environment.js:388` übergibt jeden `[RUN: …]`-Block per `execSync(cmd, …)` an die Shell. Nur Blöcke mit `me …`/`me.`/`me(` werden auf `bob.py` umgeschrieben; alles andere (z. B. `[RUN: cat ../../.env]`, `[RUN: curl … | sh]`) wird unverändert ausgeführt.
- Die Umgebung enthält `process.env` des Runners inklusive aller API-Keys (`runner.js:39-57` lädt `.env` in `process.env`).
- `cwd` ist `_verse/`; Pfade wie `../../.env` sind erreichbar.

## S2 — Shell-/Code-Injection in `[WRITE: …]` → TCK-138, TCK-145

- `environment.js:202-257`: Dateiname (`rawFileName`, beliebige Nicht-Whitespace-Zeichen), `filePath`, `agentId` und Keys werden per String-Interpolation in Python-Quelltext eingesetzt, der seinerseits in `python3 -c "…"` mit doppelten Anführungszeichen läuft. `$(…)` und Backticks im Dateinamen werden von der Shell ausgewertet; `'` bricht den Python-String.
- Gleiches Muster in `environment.js:122-185` (Proximity-Check) und `automation.js:67,187`.

## S3 — Agenten-Python läuft mit Host-Rechten → TCK-139

- `automation.js:196` führt agentengeschriebene Skripte aus `_verse/scripts/active/**` mit `runPython` aus — vollwertiges CPython ohne Einschränkung (`import os, subprocess`, Netzwerk, Dateisystem).
- `[RUN: me …]` ist ebenfalls Python mit vollen Rechten; die „Bypass Prohibition Law“ (`print("[RUN: …]")` statt `subprocess`) ist nur eine Prompt-Konvention.
- Entscheidung (2026-10-19, Architekt): Simulation läuft vollständig im Container; nur das Experiment-Verzeichnis wird gemountet, keine `.env`/Host-Pfade. Siehe TCK-139.

## S4 — VoG-Server ohne Schutz → TCK-140

- `hud/vog_server.cjs:272`: `server.listen(3001)` bindet an alle Interfaces.
- `hud/vog_server.cjs:46`: `Access-Control-Allow-Origin: *`.
- `POST /vog` (`:146-166`) schreibt beliebigen Text in `creator_msg.txt`, der als „Voice of God“ in Agenten-Prompts injiziert wird. `JSON.parse` erfolgt unabhängig vom Content-Type — eine beliebige Webseite im Browser des Nutzers oder ein Gerät im LAN kann Prompts injizieren.
- `POST /api/broadcast` überschreibt den In-Memory-Weltzustand aller Clients.
- `GET /api/universe/sectors` (`:168`) startet pro Request einen Python-Prozess ohne Grenzen für die Bounding-Box.
- `hud/dev.cjs:21`: Vite mit `--host 0.0.0.0`.

## S5 — Teile des API-Keys im Log → TCK-146

- `runner.js:71-74` loggt die ersten 6 und letzten 4 Zeichen des Gemini-Keys. Logs werden in `experiments/*/log.md` persistiert.
