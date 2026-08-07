---
id: TCK-127
title: "Perf: Runner Performance Optimization and Process Caching"
epic_phase: "Industrial Polish and Safety-Grid"
status: "open"
priority: "high"
created: 2026-08-07
dependencies: [TCK-109]
---

## Description
This ticket targets the OS-level process-spawning bottleneck during sleep warp-speed cycles. Currently, when all agents are sleeping, the simulation rumbles forward at 15 rounds/second, but experiences noticeable latency (~500ms to 1000ms per round). 

### The Bottleneck Analysis
In each single round, the Node.js runner (`runner.js`) spawns multiple short-lived Python subprocesses via `execSync('python3 ...')`:
1. `get_agent_location.py` (during `syncPopulation` to fetch sleep states and coordinates).
2. `auto.py` (one subprocess per active agent script in `_verse/scripts/active/` to run automation).
3. `physics_update.py` (at the end of the round to run kinematics and planetary updates).

Spawning a new OS-level Python process has a heavy startup overhead (~100ms per spawn for loading the interpreter, imports, and DB handshakes). For 4 active agents, this results in up to 6 processes per round (~600ms overhead), causing severe lag during automated sleep rounds where no LLM calls even occur.

---

## Technical Optimization Requirements

### Lever 1: Native JS SQLite Integration (Process-Free Queries)
We will eliminate the `get_agent_location.py` Python subprocess entirely:
- **Optimization:** Refactor `bootstrapper.syncPopulation` in Node.js to query the SQLite `universe.db` directly using the native Node.js `sqlite3` library (which is already a project dependency and fully loaded in the engine).
- **Impact:** Querying coordinates and sleep states directly in Node.js takes `< 2ms`, completely eliminating a ~100ms Python subprocess spawn per round.

### Lever 2: Lazy/Conditional Automation Execution
We will eliminate empty automation subprocess spawns:
- **Optimization:** Refactor `automation.runSystemAutomations` in Node.js to scan the active scripts directory (`_verse/scripts/active/`) first.
  - If no custom Python scripts exist for any agent, **skip spawning the Python automation runner altogether**.
- **Impact:** In early-game or bootstrap runs where agents do not have custom background scripts running, this reduces the process spawn count by $N$ (where $N$ is the number of agents), saving up to 400ms per round.

### Lever 3: Python Interpreter Lazy-Import Optimization
We will optimize the startup speed of necessary Python scripts:
- **Optimization:** Refactor `physics_update.py` and other binary scripts to lazy-load expensive Python standard library modules (like `json`, `math`, or complex helper libraries) only when needed, rather than importing them globally at startup.
- **Impact:** Minimizes the compilation and import overhead of the spawned `python3` process, dropping its execution latency from ~150ms to ~40ms.

---

## Verification Plan
1. **Benchmark Test:** Create a benchmark script `tests/js/test_v13_8_perf_benchmark.js` that:
   - Sets up a mock 100-cycle sleep run.
   - Measures the total execution duration before and after optimizations.
   - Asserts that a 100-cycle sleep-warp completes in `< 5 seconds` (which means >20 rounds per second, a massive increase from the current ~1.5 rounds/second).
2. **Integration Test:** Ensure `node tests/test_all.js` remains 100% green.
