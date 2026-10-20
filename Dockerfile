# Linux dev/test runtime (ADR 0001, TCK-141) and simulation runtime (ADR 0002, TCK-139).
# Stages: deps (OS + Python + npm deps), runtime (`--target runtime`, non-root
# simulation with only the engine blueprint), test (default/last stage: full
# repo for the test hub and the devcontainer).
#
# Base: Debian 13 "trixie" ships glibc 2.41; the sqlite3@6 prebuilt binary
# requires glibc >= 2.38 (Debian 12 / Ubuntu 22.04 fail with GLIBC_2.38).
FROM node:20-trixie-slim AS deps

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH

# Python lives in a venv because Debian marks the system interpreter as
# externally managed (PEP 668). The venv is first on PATH, so `python3`
# resolves to it for the engine and the tests.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/venv

WORKDIR /app

# Dependency layers first so source edits do not invalidate them.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Simulation runtime (TCK-139), started by `npm run sim:docker` / `build:docker`
# with --read-only, tmpfs /tmp and only /app/experiments/<exp> mounted writable.
# Contains just the engine and blueprints (no tests, docs, tickets, .env); the
# files stay root-owned, so the non-root user cannot alter the engine.
FROM deps AS runtime
COPY src ./src
COPY scripts/build.py ./scripts/build.py
ENV HOME=/tmp
USER node
CMD ["node", "src/sim_engine/core/runner.js"]

# Test hub and devcontainer. Source is copied in (no bind mount): SQLite WAL
# hangs on Docker Desktop Windows bind mounts in the test hub (ADR 0001).
FROM deps AS test
COPY . .
CMD ["node", "tests/test_all.js"]
