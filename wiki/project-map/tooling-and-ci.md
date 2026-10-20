---
sources: [.agents/skills/bob-os-testing/SKILL.md, scripts/, tests/, .github/, Dockerfile]
---

# Tooling, tests and CI

## `scripts/` (operator CLIs)
| File | npm script | Purpose |
|---|---|---|
| `build.py` | `build` | Build an experiment |
| `run.js` | `sim` | Start an experiment's runner |
| `sim_docker.js` | `build:docker`, `sim:docker` | Container wrapper with env allowlist |
| `test_docker.js` | `test:docker` | Build and run the test image |
| `inject.js` | `inject` | Copy engine/kernel/files into a running experiment, apply migrations |
| `reset.js` | `reset` | Reset an experiment to round 0 |
| `migrate.js` | `migrate` | Apply migrations to a DB |
| `analyze_run.py` | `analyze` | Aggregated run snapshot |
| `dev/` | — | Manual live/trigger scripts (real LLM calls, not CI) |

## `tests/`
- `test_all.js` — hub ([[wiki/operations/testing]]).
- `python/` (+ `python/sdk_tests/`, auto-discovered), `js/`, `balancing/`.

## `.github/`
- `workflows/test-ci.yml` — test hub + HUD type check/vitest.
- `workflows/sync-tickets.yml` + `scripts/sync_github.js` — ticket ↔ GitHub Issues sync and offline backlog index ([[wiki/operations/ticket-workflow]]).

## Containers
- `Dockerfile` — stages `deps`, `runtime`, `test` (default). `.dockerignore` excludes `.env`, `.git`, experiments, DBs.
- `docker-compose.yml` — optional Ollama service. `.devcontainer/devcontainer.json` — dev container on the same Dockerfile.

## Key Takeaways
- Every operator action is an npm script mapped to one file in `scripts/`.
- CI runs the hub and the HUD checks; ticket sync runs on pushes to `master`.
