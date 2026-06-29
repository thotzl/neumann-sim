---
name: experiment-analyst
description: Use to analyze Bob OS / _verse simulation experiments. Use this skill when asked to report on ongoing experiments, check simulation integrity, or extract metrics from experiment logs, states, and databases.
---

# Experiment Analyst

## Overview

The Experiment Analyst skill equips you to systematically inspect and evaluate simulation runs in the `ai-testing` project. Experiments are isolated environments (usually under `experiments/`) containing their own `core`, `sim_engine`, and `_verse` components. 

## Core Capabilities

1. **Locate Experiments:** Find running or completed experiments.
2. **Configuration vs. Reality Check:** Compare `config.json` intent against actual logged events.
3. **Database Introspection:** Query the isolated `universe.db` for agent states and economic metrics.
4. **Log parsing:** Analyze `log.md` and `state.json` for anomalies.

## Workflow: Analyzing an Experiment

### 1. Identify the Target
Check the `experiments/` directory. Each experiment has its own folder.
```bash
ls -la experiments/
```

### 2. Review the Configuration
Read the `config.json` inside the experiment folder. This file contains:
- Simulation parameters (`rounds`, `config_override`)
- Physics rules (`physics_constants`)
- Initial agent definitions (`agents`)

### 3. Inspect the Database State
Experiments maintain their own `universe.db` under `_verse/universe.db`. 
You can use the project's existing `query.py` tool by pointing it to the specific experiment's database via the `TEST_DB_PATH` environment variable:

```bash
# Query the agents table for a specific experiment
TEST_DB_PATH=experiments/<EXP_NAME>/_verse/universe.db python3 bob_os/tools/query.py "SELECT id, energy, credits, location FROM agents"

# Query the market or logs
TEST_DB_PATH=experiments/<EXP_NAME>/_verse/universe.db python3 bob_os/tools/query.py "SELECT * FROM market_listings LIMIT 5"
```

### 4. Analyze Logs
Review `log.md`, `state.json` (if present in the experiment root), and `_verse/logs/`.
Look for:
- Errors or crashes.
- Unintended behavior (e.g., agents draining energy too fast despite `physics_constants`).
- Economic imbalances (credits pooling, resources depleting).

## Analytical Methods & Heuristics

When generating your report, proactively apply these analytical methods to the raw data:

### 1. Economic Health Check (Wealth Distribution)
- **Query:** `SELECT id, credits FROM agents ORDER BY credits DESC`
- **Analysis:** Look for wealth concentration (Gini-style inequality where a few agents hoard all credits). Check if total credits in the system are inflating or deflating unexpectedly.

### 2. Behavioral Loop Detection
- **Action:** Inspect `log.md` or agent action histories.
- **Analysis:** Identify agents stuck in repetitive logic loops (e.g., "scan -> move -> scan -> move" without meaningful state changes) or repeatedly failing the same action (e.g., trying to mine an empty node).

### 3. Physics & Resource Audit
- **Action:** Compare agent energy levels before and after ticks, cross-referenced with `config.json` (`physics_constants.energy_cost_per_distance`).
- **Analysis:** Verify that the engine is correctly applying physics rules. If agents travel without energy drain or drain energy while idle contrary to config, flag this as a critical Engine Anomaly.

### 4. Survival & Attrition Rate
- **Query:** `SELECT status, count(*) FROM agents GROUP BY status`
- **Analysis:** Calculate the death/survival rate. If agents are dying too quickly (e.g., from starvation), recommend adjustments to `idle_drain` or resource spawn rates.

## Root Cause Analysis: Agent Error vs. System Bug

When an agent fails or a simulation state becomes unstable, distinguish between:

### A. Agent Logic Error (The "Evolutionary" Fail)
- **Indicators:** Agent ignores energy warnings, travels long distances with low reserves, forgets to mine, or ignores available solar energy.
- **Verdict:** This is desired "industrial evolution" (learning through selection). No system fix needed, perhaps prompt adjustment.

### B. System Integrity Bug (The "Simulation" Fail)
- **Indicators:** 
    - `[DB FEHLER]` or `[FILE NOT FOUND]` in logs.
    - Tools output JSON that isn't valid, or scripts crash during execution.
    - Physics rules are inconsistent (e.g., energy drain higher than `idle_drain` without action).
    - Database state shows an action was successful, but the agent's inventory wasn't updated.
- **Verdict:** This is a bug in the Engine (`core` or `sim_engine`). Immediate fix required to prevent data corruption.

## Reporting Format (The "Analyst Report")
When asked to report on an experiment, structure your response directly as follows (German or English, depending on user prompt), without unnecessary preamble:

1. **Executive Summary:** 1-2 sentences on the current state (Running, Failed, Completed).
2. **Configuration Highlights:** What makes this experiment unique?
3. **State & Metrics:** Key figures from the database (Active agents, Total credits, Resource distribution).
4. **Anomalies / Findings:** Discrepancies between expected behavior and actual data, including results from the Analytical Methods.
5. **Recommendations:** Next steps for tweaking the simulation engine or parameters.
