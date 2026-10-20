---
sources: [README.md, docs/revisit/01-security.md, .agents/skills/bob-os-core/SKILL.md, .tickets/closed/TCK-138-run-allowlist-and-safe-exec.md, .tickets/closed/TCK-139-containerized-simulation-runtime.md, .tickets/closed/TCK-140-vog-server-hardening.md, .tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md, .tickets/closed/TCK-146-generic-openai-driver.md]
---

# Security and isolation

Agents are LLMs with free-form output; any gap is reachable by chance or emergent behaviour. Isolation is therefore enforced in layers.

## Layers
1. **RUN allowlist, no shell** — only SDK calls and ACL-checked scripts; see [[wiki/architecture/action-processing]] (TCK-138).
2. **Secret-free child environment** — `src/sim_engine/helpers/child_env.js` passes an allowlist (`PATH`, `HOME`, `LANG`, `PYTHONPATH`, `VIRTUAL_ENV`, …; prefixes `BOB_`, `TEST_`, `LC_`) plus explicit extras. Names matching `/(_API_KEY|_TOKEN|_KEY|SECRET|PASSWORD)$/i` and `API_KEY`, `DEEP_INFRA_KEY`, `GITHUB_TOKEN`, `VOG_TOKEN` are always stripped. Never spawn Python with `...process.env` (TCK-139).
3. **Runtime container** — simulations with real LLMs run only in the runtime container (`npm run sim:docker`): non-root user, read-only root filesystem, tmpfs `/tmp` (noexec), `--cap-drop=ALL`, `no-new-privileges`, PID limit; only `experiments/<exp>/` is bind-mounted; the root `.env` is not mounted; keys are passed as allowlisted env vars by `scripts/sim_docker.js` (TCK-139, ADR 0002).
4. **Monitor server** — `hud/vog_server.cjs` binds `127.0.0.1`, CORS limited to `VOG_ALLOWED_ORIGINS`, write endpoints need `application/json` and `X-VoG-Token`, body limits, validated sector queries (TCK-140). See [[wiki/operations/hud-and-monitor]].
5. **Logs** — the startup log shows only `API key: set / not set / not required` per role (TCK-146).

## Kernel variables for Python children
`BOB_ID` (caller identity), `BOB_ACL` (JSON ACL), `BOB_CYCLE`, `BOB_STARDATE`, `TEST_DB_PATH`, `PYTHONPATH`. Interpreter: `helpers/python_bin.js` (`BOB_PYTHON`, default `python3`).

## Native path
`npm run build` / `npm run sim` run agent Python with the user's rights on the host (repo, `.env`, filesystem). Use only in a disposable Linux environment (devcontainer/CI), never with real keys.

## Residual risks (open)
- Agent code running as the same user can read the engine's environment via `/proc` → use dedicated, rate-limited keys ([TCK-167](../../.tickets/pool/TCK-167-llm-key-isolation.md)).
- With a valid token, `/api/broadcast` can still set `experiment_dir` ([TCK-168](../../.tickets/pool/TCK-168-vog-experiment-dir-container-mode.md)).
- Network egress is open (needed for LLM endpoints).
- Agent Python is full CPython; the prompt rule "no subprocess" is a convention, the control is the container.

## Key Takeaways
- Defence in depth: allowlist → secret-free child env → container → token-protected monitor.
- Real-key runs belong in the container only; the native path is for disposable dev environments.
- Known gaps are tracked as pool tickets TCK-167 and TCK-168.
- Implementation history: [[wiki/implemented/security-and-runtime]].
