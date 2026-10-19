---
id: "TCK-139"
title: "SEC: Simulation vollständig im Container isolieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-138", "TCK-141"]
---

# TCK-139: SEC: Simulation vollständig im Container isolieren

## Description
Engine und Python-Kernel laufen in einem Container. Gemountet wird nur `experiments/<name>/` (rw) — kein Repo-Root, keine `.env`. API-Keys werden ausschließlich als Environment-Variablen übergeben. Agenten-Python hat damit keinen Zugriff auf Host-Dateisystem oder Secrets außerhalb des Experiments.

## Verified Code Gap
- `src/sim_engine/modules/automation.js:196` — Agenten-Skripte laufen als vollwertiges CPython mit Host-Rechten.
- `src/sim_engine/core/runner.js:39-57` — `.env` aus dem Repo-Root wird in `process.env` geladen und an alle Kindprozesse vererbt.
- Kein Dockerfile / kein Container-Startpfad für `npm run sim`.

## Definition of Done
- [ ] `Dockerfile` (Node 20 + Python 3 + `requirements.txt`, glibc ≥ 2.38) und npm-Skript bzw. Wrapper `npm run sim:docker <exp>`.
- [ ] Container läuft als Non-Root, Root-FS read-only, nur `experiments/<exp>` beschreibbar gemountet; Netzwerk nur für LLM-Endpoints (oder dokumentiert offen).
- [ ] Kindprozesse erhalten eine Env-Allowlist (keine `*_API_KEY` an Agenten-Python).
- [ ] ADR zur Isolationsentscheidung (`docs/adr/`).
- [ ] README-Abschnitt „Simulation starten“ auf Container umgestellt.
- [ ] Nachweis: Agenten-Skript, das `os.environ` und `/` listet, sieht keine Keys und kein Repo.

## Verification Command
`docker build + Smoke-Run mit Mock-Driver (`E2E_MOCK=true`), 2 Runden`

## References
- [Revisit-Befund](../../docs/revisit/01-security.md#s3--agenten-python-läuft-mit-host-rechten--tck-139)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
