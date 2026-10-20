---
id: "TCK-167"
title: "SEC: LLM-Key-Isolation gegenüber Agenten-Code (/proc, driver_path)"
epic: "EPIC-00"
status: "pool"
priority: "undecided"
created: 2026-10-20
dependencies: ["TCK-139"]
---

# TCK-167: SEC: LLM-Key-Isolation gegenüber Agenten-Code

## Description
Restrisiko aus TCK-139. Im Container sehen Python-Kindprozesse keine Keys mehr in ihrer Umgebung, können sie aber über `/proc/<ppid>/environ` bzw. `/proc/1/environ` der Engine lesen (gleiche UID; nachgewiesen trotz `--cap-drop=ALL`, `no-new-privileges`). Zusätzlich ist `experiments/<exp>/config.json` für Agenten beschreibbar, und `driver_path` kann auf JS-Code im Experiment zeigen, der im Engine-Prozess mit Keys läuft.

## Source
TCK-139 Abschlussbericht, `docs/adr/0002-containerized-simulation-runtime.md` (Residual Risks).

## Offene Entscheidung
- (a) LLM-Proxy außerhalb des Simulations-Containers hält die Keys (Engine spricht nur den Proxy an), oder
- (b) separate UID für Python-Kinder (erfordert CAP_SETUID im Engine-Prozess und Umbau der Dateirechte im Experiment).
- `driver_path`: nur Driver-Namen aus einer festen Liste zulassen statt Pfaden.
Interim: dedizierte, rate-limitierte API-Keys verwenden.
