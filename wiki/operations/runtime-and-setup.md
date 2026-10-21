---
sources: [README.md, .agents/skills/project-baseline/SKILL.md, tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md, tickets/closed/TCK-139-containerized-simulation-runtime.md]
---

# Runtime and setup

Development and tests run only in Linux containers; Windows and macOS are Docker hosts only (ADR 0001). Simulations with real LLM agents run only in the runtime container (ADR 0002). Decisions: [[wiki/decisions/_index]].

## Prerequisites
- **Docker** (Docker Desktop on Windows/macOS) — the only host requirement.
- The image (`Dockerfile`, base `node:20-trixie-slim`) provides Node.js 20 (`engines.node >= 20`, native `sqlite3`), Python 3 with `requirements.txt` (`PyYAML`), glibc ≥ 2.38 (needed by the `sqlite3@6` prebuilt; Debian 12 / Ubuntu 22.04 are too old).
- Dev Containers: `.devcontainer/devcontainer.json` on the same image.
- Native Linux with Node 20, Python 3, glibc ≥ 2.38: `pip install -r requirements.txt && npm ci`.

## Docker stages
`deps`, `runtime` (simulation image: only `src/` + `scripts/build.py`, user `node`), `test` (default; test hub image). Image overrides: `NEUMANN_SIM_IMAGE`, `NEUMANN_TEST_IMAGE`.

## Secrets and env
- `scripts/sim_docker.js` passes only allowlisted variables from the shell or the root `.env` (`.env` wins): LLM keys (`API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `SAMBANOVA_API_KEY`, `OPENROUTER_API_KEY`, `DEEP_INFRA_KEY`/`DEEPINFRA_API_KEY`, `GITHUB_TOKEN`/`GITHUB_API_KEY`), `VOG_TOKEN`, `VOG_HOST`, `C2_PORT`, `E2E_MOCK`, `E2E_MOCK_*`.
- Use dedicated, rate-limited keys (see [[wiki/architecture/security-and-isolation]]).
- `BOB_PYTHON` overrides the Python interpreter; `BOB_EXPERIMENTS_DIR` relocates experiments (tests).

## Ollama
- In the experiment `config.json`: `"ollama_endpoint": "http://host.docker.internal:11434/api/chat"`.
- Optional Ollama service (AMD ROCm iGPU profile) in the root `docker-compose.yml`: `docker compose up -d ollama`.

## Key Takeaways
- Docker is the only host requirement; everything runs in `node:20-trixie-slim`.
- Real keys only in the runtime container, passed via env allowlist.
- Native path only in disposable Linux environments.
