---
name: project-baseline
description: Root architecture and entry point for Bob-OS V8.0
---

# SKILL: Bob-OS Project Baseline (V8.0)

This is the central nervous system for the Bob-OS simulation. It defines the core architecture.

## 1. Project Philosophy
- **Bob-OS** is a multi-agent survival simulation powered by LLMs (Gemini 2.5 Flash).
- **Core Loop:** The Node.js engine (`sim_engine/runner.js`) queries the LLM. The LLM responds with `[ANALYZE]` and `[ACTION]`. The engine parses the actions, executes them in a Python sandbox, updates SQLite, and feeds the feedback into the next prompt.
- **V8.0 Unified Functional Logic:** No more raw bash commands. Agents use a functional syntax both in the Prompt CLI and the Python SDK.

## 2. Directory Structure
- `bob_os/core/`: The Python Kernel. Contains the unified CLI (`bin/bob.py`) and the SDK (`lib/bob_sdk.py`, `lib/db_config.py`). Protected from agents.
- `bob_os/templates/`: Blueprints for new experiments (e.g., `mission_template.json`).
- `sim_engine/`: The Node.js Runner. Handles API calls (`api_client.js`), security/parsing (`environment.js`), automation (`automation.js`), and VoG (`vog.js`).
- `experiments/<version>/`: Isolated runtime environments. Built by `bob_os/build.py`. Each gets its own `_verse/universe.db`.

## 3. Development Workflow (TDD)
- **CI Hub:** ALWAYS run `node sim_engine/test_all.js` to validate the entire Python and JS stack before pushing or building.
- **Build:** `python3 bob_os/build.py <version> --rounds <X> --mission "<prompt>"` creates a clean sandbox.
- **Run:** `npm run sim <version>` starts the simulation loop.
