# ADR 0001: Linux containers as the only development and test runtime

- Status: Accepted
- Date: 2026-10-19
- Deciders: Project architect
- Ticket: TCK-141 (follow-up: TCK-138 `BOB_PYTHON`, TCK-139 containerized simulation runtime)

## Context and Problem Statement

The engine (Node.js) and the kernel (Python 3) were developed and tested on Linux without the platform being declared anywhere. Windows hosts cannot run the engine or `npm test`:

- The Python interpreter is hardcoded as `python3` in shell strings across the engine and the test hub. Windows usually provides only `python`/`py`.
- `PYTHONPATH` is joined with `:`, while Windows uses `;` as its path separator.
- Commands use POSIX quoting (`'\''`) and sh-style env prefixes (`PYTHONPATH=... python3 ...`), which `cmd.exe` and PowerShell do not parse.
- Tests create directory symlinks, which fail with `EPERM` on Windows unless Developer Mode is enabled.
- The `sqlite3@6` prebuilt native binary requires glibc >= 2.38. It fails with `GLIBC_2.38 not found` on Debian 12 and Ubuntu 22.04, even on Linux.
- Python dependencies (`pyyaml`) were not declared, and the README listed outdated prerequisites (Node v11.11.0, `monitor/`).

SQLite in WAL mode also hangs on Docker Desktop bind mounts from Windows hosts. A container that only mounts the host checkout therefore does not solve the problem.

## Decision Drivers

- Reproducible test runs on any host OS.
- One runtime definition for CI, local development and the later simulation container (TCK-139).
- No porting work for Windows shell semantics in engine code.

## Considered Options

1. Port the engine and tests to run natively on Windows (path separators, quoting, interpreter resolution, symlink fallbacks).
2. Use Linux containers as the only supported runtime, with Windows and macOS acting only as Docker hosts.
3. Use WSL2 as the documented Windows runtime.

## Decision Outcome

Chosen option: **2. Linux containers are the only supported development and test runtime.** Windows and macOS are hosts only.

- A root `Dockerfile` based on `node:20-trixie-slim` (Debian 13, glibc 2.41) provides Node 20, Python 3 in a venv at `/opt/venv` (first on `PATH`), the packages from `requirements.txt`, and the result of `npm ci`. The working directory is `/app`.
- `npm run test:docker` (`scripts/test_docker.js`) builds the image with the repository copied in and runs `node tests/test_all.js` on the container's own filesystem. It does not bind-mount the repository.
- `.devcontainer/devcontainer.json` uses the same Dockerfile. The workspace lives in a named volume instead of a host bind mount.
- CI is pinned to `ubuntu-24.04` (glibc 2.39) and installs `requirements.txt`.
- `package.json` declares `engines.node >= 20`.

The Dockerfile sits at the repository root rather than under `docker/`. It is the single image for tests, devcontainer and the planned simulation runtime, and `docker build .` finds it without extra flags.

## Consequences

- Good: test results do not depend on the host OS, glibc version or local Python setup.
- Good: Linux-specific code (`python3`, `:` path joins, POSIX quoting, symlinks) is consistent with the supported platform and does not need porting.
- Good: TCK-139 can extend the same image (for example with a different `CMD` or an extra stage) to run the simulation itself.
- Bad: contributors need Docker. Native `npm test` on Windows is unsupported.
- Bad: each `npm run test:docker` copies the working tree into a new image layer. Dependency layers are cached, but source changes need a rebuild before tests.
- Neutral: the working tree on Windows may have CRLF line endings (`core.autocrlf`). Node and Python tolerate CRLF, but a `.gitattributes` that enforces LF is recommended.
- Neutral: the interpreter stays overridable via `BOB_PYTHON` (default `python3`), which TCK-138 implements.
