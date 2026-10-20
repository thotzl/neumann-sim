# ADR 0002: Containerized simulation runtime with secret-free child environment

- Status: Accepted
- Date: 2026-10-20
- Deciders: Project architect (decision 2026-10-19)
- Ticket: TCK-139 (finding S3 in [docs/revisit/01-security.md](../revisit/01-security.md)); builds on [ADR 0001](0001-linux-container-runtime.md)

## Context and Problem Statement

LLM agents write Python scripts that the engine runs with full CPython (`[RUN: python3 scripts/...]`, `[RUN: me ...]`, active automations via `automation.js`). With the native start path (`npm run sim`) these scripts run with the operator's rights:

- `runner.js` loads the root `.env` into `process.env`, and every Python child inherited the full environment (`...process.env`), including all LLM API keys and `VOG_TOKEN`.
- Agent scripts can read and write the whole host filesystem, including the repository, the `.env` file and other experiments.
- The "Bypass Prohibition Law" in the prompt is only a convention, not a control.

## Decision Drivers

- Agent-authored Python must not see API keys, the repository or the host filesystem.
- One image definition for tests, devcontainer and simulation (ADR 0001).
- A start path that works the same from Git Bash, PowerShell, cmd and Linux shells.
- Monitor (HUD / VoG server on the host) must keep receiving broadcasts.

## Considered Options

1. Keep the native runtime and harden only the child environment.
2. Run the whole simulation in a container: only `experiments/<exp>/` is mounted, keys are passed as environment variables to the engine, and Python children get an allowlisted environment.
3. Run each Python child in its own short-lived container.

## Decision Outcome

Chosen option: **2**, combined with the child-environment allowlist from option 1 (it also applies to the native path).

### Runtime image

- `Dockerfile` has three stages: `deps` (OS, Python venv, `requirements.txt`, `npm ci`), `runtime` and `test`. `test` stays the last (default) stage, so `npm run test:docker` and the devcontainer are unchanged.
- `runtime` contains only `src/`, `scripts/build.py`, `node_modules` and the package files. Tests, docs, tickets, `hud/`, `.git` and `.env` are not in the image (`.dockerignore` already excludes `.env` and `experiments/`).
- The image runs as the non-root user `node` (UID 1000). The engine and blueprint files are root-owned and cannot be changed by the simulation.

### Start path

- `npm run build:docker -- <exp> --mission "..." [build.py options]` runs `scripts/build.py` in the runtime container. The experiment is built from the image's blueprint copy. `--skip-tests` is always added; tests run with `npm run test:docker`.
- `npm run sim:docker -- <exp>` runs the image's engine (`/app/src/sim_engine/core/runner.js`). It does not run the agent-writable copy in `experiments/<exp>/sim_engine/`.
- Both commands are implemented by `scripts/sim_docker.js`. It rebuilds the image (cached) before each start and runs the container with:
  - `--read-only` and `--tmpfs /tmp:rw,noexec,nosuid,nodev,size=256m`,
  - `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--pids-limit=512` and `--init`,
  - a single writable mount `experiments/<exp>` -> `/app/experiments/<exp>`,
  - on Linux and macOS hosts, `--user <uid>:<gid>`, so files in the bind mount stay owned by the operator.

### Mount: bind mount, not a named volume

ADR 0001 recorded that SQLite WAL hangs on Docker Desktop bind mounts from Windows hosts. For the experiment mount we tested this on Docker Desktop 27.3.1 (Windows 11):

- Experiment build (`init_db.py` and migrations) and a 2-round mock run on a bind mount inside the repository worked.
- A 30-round mock run on a bind mount finished in 58 s with no hang and no `SQLITE_BUSY` errors.
- A bind mount from a path under `%LOCALAPPDATA%\Temp` hung even for a plain `ls`. This is a Docker Desktop file-sharing issue with that path, not a WAL issue. The wrapper always mounts `<repo>/experiments/<exp>`.

We chose a **bind mount of `experiments/<exp>`**. It is the simplest option: no export step is needed, the host-side monitor (`hud/vog_server.cjs`) still finds the latest experiment through `_verse/world_state.json`, and analysis scripts can read the files directly. If WAL hangs show up on a host, the fallback is a named volume per experiment mounted at the same path, plus `docker cp` to export. This fallback is not implemented.

### Secrets and environment

- `scripts/sim_docker.js` passes only an explicit allowlist into the container with `-e NAME`, so values do not appear on the command line. The values come from the host environment and the root `.env`, and `.env` takes precedence, as in the native engine. The allowlist covers the driver keys (`API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `SAMBANOVA_API_KEY`, `OPENROUTER_API_KEY`, `DEEP_INFRA_KEY`, `DEEPINFRA_API_KEY`, `GITHUB_TOKEN`, `GITHUB_API_KEY`), `VOG_TOKEN`, `VOG_HOST`, `C2_PORT`, `E2E_MOCK` and the mock-driver script variables `E2E_MOCK_*`. The `.env` file itself never enters the container.
- `src/sim_engine/helpers/child_env.js` (`childEnv`) builds the environment for every Python child: `runPython` (bob.py, automations), the `[RUN: ...]` path in `environment.js`, `getEnvState`, the bootstrapper, mailbox, physics and seeding calls, and the inline `-c` helpers.
  - Allowed: basic runtime variables (`PATH`, `HOME`, `LANG`, `LC_*`, `TZ`, `TMPDIR`, `VIRTUAL_ENV`, `PYTHONPATH`, `PYTHONUNBUFFERED`, ..., plus Windows interpreter basics), the kernel prefixes `BOB_*` and `TEST_*`, and `VERSE_DIR`.
  - Always stripped, even when allowlisted or passed explicitly: names matching `/(_API_KEY|_TOKEN|_KEY|SECRET|PASSWORD)$/i`, and `API_KEY`, `DEEP_INFRA_KEY`, `GITHUB_TOKEN`, `VOG_TOKEN`.
  - This also applies to the native path.

### Network

- The container uses the default bridge network with open egress, which the LLM endpoints need. Egress is not restricted to the LLM hosts; this is documented as open.
- Monitor: `sim_docker.js` maps a host-local `VOG_HOST` (unset, `127.0.0.1`, `localhost`, `0.0.0.0`, `::`, `::1`) to `host.docker.internal` and always adds `--add-host=host.docker.internal:host-gateway`.
  - Docker Desktop forwards `host.docker.internal` to host loopback, so the default VoG bind on `127.0.0.1` works.
  - On a Linux host, connections arrive on the bridge gateway, not on loopback. The VoG server must listen there, e.g. `VOG_HOST=172.17.0.1 npm run dev` in `hud/` (avoid `0.0.0.0` on LAN-exposed hosts). The engine then uses that address unchanged.
- The Ollama driver reads its endpoint only from config (`ollama_endpoint`, default `http://localhost:11434`). In the container, set it to `http://host.docker.internal:11434/api/chat` in the experiment's `config.json`.

## Consequences

- Good: agent Python sees only the experiment and the image's engine blueprint. It sees no repository, no `.env`, no host paths and no key variables in its environment. A smoke run (TCK-139) showed this: `os.environ` contained only `BOB_*`, `TEST_*`, `PATH`, `HOME`, `LC_CTYPE`, `PYTHON*` and `VIRTUAL_ENV`; `/app` contained only `experiments`, `node_modules`, `package*.json`, `requirements.txt`, `scripts` and `src`; writes outside `/app/experiments/<exp>` and `/tmp` failed.
- Good: the engine code that runs cannot be changed by agents. The writable copy in `experiments/<exp>/sim_engine/` is ignored in container mode.
- Good: the native path also benefits from the child-environment allowlist.
- Bad: **residual key exposure via `/proc`.** Engine and Python children run as the same UID. Agent Python can read `/proc/<engine pid>/environ` and `/proc/1/environ`, which contain the keys passed with `-e`. Closing this needs privilege separation, either a separate UID for Python children (the engine would need `CAP_SETUID`, and file ownership in the experiment would need rework) or a key-holding LLM proxy outside the simulation container. This is follow-up work. Until then, use dedicated, rate-limited keys for simulations.
- Bad: `experiments/<exp>/config.json` is agent-writable, and `driver_path` is resolved relative to `/app`, so an agent can only point it at files inside the image or the experiment. This is the same class of risk as the `/proc` leak and has the same mitigation path.
- Bad: `npm run inject` and `npm run reset` stay native-only. In container mode, rebuild with `npm run build:docker -- <exp> ... --force`, or rebuild the image; the image's engine is always used.
- Neutral: `hud/vog_server.cjs` takes `experiment_dir` from broadcasts (`/app/experiments/<exp>`), which does not exist on the host. After the first broadcast, creator messages (`/vog` -> `creator_msg.txt`) are therefore dropped in container mode, while the live state still reaches the HUD. This needs a follow-up in `hud/`, for example mapping the path to the host's `experiments/<basename>`.
- Neutral: the native path (`npm run build`, `npm run sim`) remains for development only and is unsafe for untrusted agent code.
