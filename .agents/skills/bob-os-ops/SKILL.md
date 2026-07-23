# SKILL: Bob-OS Operations (Workflows & Pipelines)

This skill governs the operational lifecycle of Bob-OS experiments. It defines how to build, update, and run simulations while maintaining architectural integrity.

## 1. The Golden Rule: "Code is King"
Never modify files directly within an `experiments/` directory (except for reading logs/state or injecting patches). All permanent changes must happen in the master blueprints:
- `bob_os/core/`: System logic and binaries.
- `bob_os/_verse/`: Agent sandbox (tools/hardware).
- `sim_engine/`: Node.js orchestration engine.

## 2. Build & Reset Workflow
To create a fresh experiment or perform a hard reset:
```bash
# 1. Clear existing experiment if necessary
rm -rf experiments/ONE

# 2. Build using the master script
# This automatically runs the CI pipeline first!
python3 bob_os/build.py ONE --rounds 1000 --mission "Your Mission Text"
```
The build creates an **autarkic** copy of the engine and world.

## 3. Hot-Patching (Injections)
To apply master changes to a running experiment without losing database progress:
- **Engine Update:** `npm run inject <EXP_NAME> engine` (Syncs `sim_engine/`).
- **Tool/Physics Update:** `npm run inject <EXP_NAME> tools` (Syncs `core/` and `_verse/tools/`).

## 4. Execution
Run the simulation via the root wrapper:
```bash
npm run sim <EXP_NAME>
```
The runner supports resume-logic. If it stops, just run it again; it picks up where it left off.

## 5. Deployment Checklist
Before every build or major inject, you MUST:
1. Run the central test hub: `node sim_engine/test_all.js`.
2. Ensure all 10+ test suites (Python & Node) are GREEN.
