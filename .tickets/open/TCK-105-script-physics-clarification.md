---
id: TCK-105
title: "SSoT System Instructions Script-Physics Clarification"
epic_phase: "System Design Update"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-DONE-006"]
---

## Description
Ergänzung der `global_system_instruction` in `core-config.json` um den expliziten Hinweis, dass physikalische Aktionen aus autonomen Python-Skripten heraus **ausschließlich** via `print("[RUN: ...]")` abgesetzt werden dürfen (direkte Subprozesse kollidieren mit dem Sandbox-Pfad).

## Verified Code Gap
- **Code Path:** In `sim_engine/core-config.json` fehlt dieser Warnhinweis in den system prompts.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-006` (Sandbox Hardening).

## References
- Source: [IDEAS_AND_TASKS.md](../resources/todo/IDEAS_AND_TASKS.md)
