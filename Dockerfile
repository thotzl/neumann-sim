# Linux dev/test runtime for neumann-sim (ADR 0001, TCK-141).
# Designed as the base for the containerized simulation runtime (TCK-139).
#
# Base: Debian 13 "trixie" ships glibc 2.41; the sqlite3@6 prebuilt binary
# requires glibc >= 2.38 (Debian 12 / Ubuntu 22.04 fail with GLIBC_2.38).
FROM node:20-trixie-slim

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

# Source is copied in (no bind mount): SQLite WAL hangs on Docker Desktop
# Windows bind mounts, so tests must run on the container's own filesystem.
COPY . .

CMD ["node", "tests/test_all.js"]
