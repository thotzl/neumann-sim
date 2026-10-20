---
sources: [.tickets/closed/TCK-006-sandbox-hardening.md, .tickets/closed/TCK-118-timeline-purity-and-masked-logging.md, .tickets/closed/TCK-138-run-allowlist-and-safe-exec.md, .tickets/closed/TCK-139-containerized-simulation-runtime.md, .tickets/closed/TCK-140-vog-server-hardening.md, .tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md, .tickets/closed/TCK-146-generic-openai-driver.md, docs/revisit/01-security.md, docs/revisit/02-tests-platform.md]
---

# Implemented: security and runtime

| Ticket | What was built |
|---|---|
| [TCK-006](../../.tickets/closed/TCK-006-sandbox-hardening.md) | File tags limited to `scripts/` |
| [TCK-118](../../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md) | Global `.env` loading in Node and Python; masked keys in the startup log |
| [TCK-138](../../.tickets/closed/TCK-138-run-allowlist-and-safe-exec.md) | RUN allowlist; all process starts without a shell; filename/containment checks (closed arbitrary shell execution from `[RUN]`) |
| [TCK-141](../../.tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md) | Linux containers as the only dev/test runtime; `requirements.txt`; `npm run test:docker`; dev container (ADR 0001) |
| [TCK-139](../../.tickets/closed/TCK-139-containerized-simulation-runtime.md) | Simulation in a hardened runtime container; secret-free child environment (ADR 0002) |
| [TCK-140](../../.tickets/closed/TCK-140-vog-server-hardening.md) | VoG server: localhost bind, token, CORS, limits |
| [TCK-146](../../.tickets/closed/TCK-146-generic-openai-driver.md) | No key fragments in logs; driver paths restricted |

## Current behaviour
[[wiki/architecture/security-and-isolation]], [[wiki/operations/runtime-and-setup]].

## Key Takeaways
- The 2026-10 revisit closed shell execution, host-rights agent code and the open monitor server.
- Open residual risks: [TCK-167](../../.tickets/pool/TCK-167-llm-key-isolation.md), [TCK-168](../../.tickets/pool/TCK-168-vog-experiment-dir-container-mode.md).
