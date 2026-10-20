---
id: "TCK-139"
title: "SEC: Simulation vollständig im Container isolieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-138", "TCK-141"]
completed: 2026-10-19
version: "v13.10.4"
---

# TCK-139: SEC: Simulation vollständig im Container isolieren

## Description
Engine und Python-Kernel laufen in einem Container. Gemountet wird nur `experiments/<name>/` (rw) — kein Repo-Root, keine `.env`. API-Keys werden ausschließlich als Environment-Variablen übergeben. Agenten-Python hat damit keinen Zugriff auf Host-Dateisystem oder Secrets außerhalb des Experiments.

## Verified Code Gap (Ausgangslage)
- `src/sim_engine/modules/automation.js:196` — Agenten-Skripte laufen als vollwertiges CPython mit Host-Rechten.
- `src/sim_engine/core/runner.js:39-57` — `.env` aus dem Repo-Root wird in `process.env` geladen und an alle Kindprozesse vererbt.
- Kein Dockerfile / kein Container-Startpfad für `npm run sim`.

## Definition of Done
- [x] `Dockerfile` (Node 20 + Python 3 + `requirements.txt`, glibc ≥ 2.38) und npm-Skript bzw. Wrapper `npm run sim:docker <exp>`.
- [x] Container läuft als Non-Root, Root-FS read-only, nur `experiments/<exp>` beschreibbar gemountet; Netzwerk nur für LLM-Endpoints (oder dokumentiert offen).
- [x] Kindprozesse erhalten eine Env-Allowlist (keine `*_API_KEY` an Agenten-Python).
- [x] ADR zur Isolationsentscheidung (`docs/adr/`).
- [x] README-Abschnitt „Simulation starten“ auf Container umgestellt.
- [x] Nachweis: Agenten-Skript, das `os.environ` und `/` listet, sieht keine Keys und kein Repo.

## Verification Command
`docker build + Smoke-Run mit Mock-Driver (`E2E_MOCK=true`), 2 Runden`

## Verification (Code SSoT)
- `Dockerfile`: Stages `deps` / `runtime` / `test`; `runtime` enthält nur `src/` + `scripts/build.py` (keine Tests, Doku, Tickets, `hud`, `.git`, `.env`), läuft als `node` (UID 1000).
- `scripts/sim_docker.js`: `npm run build:docker -- <exp> …` (build.py im Container) und `npm run sim:docker -- <exp>`; `--read-only`, tmpfs `/tmp` (noexec), `--cap-drop=ALL`, `no-new-privileges`, `--pids-limit`, `--init`; nur `experiments/<exp>` als Bind-Mount; Env-Allowlist (LLM-Keys, `VOG_*`, `C2_PORT`, `E2E_MOCK*`) per `-e NAME`; `host.docker.internal` für den Monitor.
- `src/sim_engine/helpers/child_env.js`: Allowlist + Secret-Filter (`*_API_KEY|*_TOKEN|*_KEY|SECRET|PASSWORD`) für alle Python-Kindprozesse (`python_executor`, `environment`, `automation`, `bootstrapper`, `mailbox_service`, `physics_round_service`, `runner`) — auch im nativen Pfad.
- ADR: [docs/adr/0002-containerized-simulation-runtime.md](../../docs/adr/0002-containerized-simulation-runtime.md); README: Start im Container, nativer Pfad als „development only, unsafe“.
- Test: `tests/js/test_child_env_isolation.js` (childEnv, runPython, RUN-Skript, `me`-Aufruf), im Hub registriert.
- Smoke-Run (Docker Desktop, `E2E_MOCK=true`, Fake-Keys im Host-Env): Agenten-Skript sieht nur `BOB_*`, `PYTHONPATH`, `TEST_*`, Basisvariablen; `/app/.env`, `/app/tests`, `/app/.git`, `/mnt/c` nicht vorhanden; Schreiben nur in `/tmp`; 0 Secret-Werte in der Ausgabe.
- Verifikation: Container-Runner Hub grün, HUD `tsc` 0, Vitest 9/9; `npm run test:docker` Exit 0.
- Restrisiken → [TCK-167](../pool/TCK-167-llm-key-isolation.md) (Keys über `/proc` lesbar, `driver_path`), [TCK-168](../pool/TCK-168-vog-experiment-dir-container-mode.md) (VoG `experiment_dir`); Netzwerk-Egress offen (für LLM-Endpoints nötig).

## References
- [Revisit-Befund](../../docs/revisit/01-security.md#s3--agenten-python-läuft-mit-host-rechten--tck-139)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
