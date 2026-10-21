---
name: experiment-analyst
description: Analysis of Bob-OS simulation runs in experiments/<exp>/, combining hard metrics from universe.db and state.json with behavioural profiling of agents from log.md. Use when asked to report on a running or finished experiment, check simulation integrity, or decide whether a failure is agent behaviour or an engine bug.
---

# Experiment Analyst

## Overview
This skill provides a high-fidelity, token-efficient framework for analyzing neumann-sim experiments (`experiments/<EXP_NAME>/`, also bind-mounted on the host in container mode). It bridges the gap between raw database metrics and the "soft" cognitive behavior of the agents.

## 1. Hard Fact Analysis (Database & Metrics)
Always start with a quantitative snapshot. Use `scripts/analyze_run.py` (from the repo root) for aggregated data, or query the experiment's SQLite database directly.

### Core Metrics & Aggregation:
- **Aggregated DB/State snapshot:**
  ```bash
  npm run analyze -- <EXP_NAME>     # = python3 scripts/analyze_run.py <EXP_NAME>
  ```

- **Direct SQLite Queries (SSoT Verification):**
  Since each experiment maintains its own `universe.db` under `experiments/<EXP_NAME>/_verse/universe.db`, you can run direct queries to inspect state. Agents carry no own location or inventory columns; use the view `v_agents`, which resolves them from the host ship or SEM-Matrix:

  ```bash
  # Check agent statuses, energy levels, and inventories
  sqlite3 experiments/<EXP_NAME>/_verse/universe.db "SELECT id, chosen_name, status, host_type, host_id, location, energy_inventory, raw_matter_inventory, refined_matter_inventory FROM v_agents"

  # Economic Inequality and Resource Concentration
  sqlite3 experiments/<EXP_NAME>/_verse/universe.db "SELECT id, raw_matter_inventory + refined_matter_inventory AS total_resources FROM v_agents ORDER BY total_resources DESC"

  # Check active planetary infrastructure and health
  sqlite3 experiments/<EXP_NAME>/_verse/universe.db "SELECT type, system_name, status, level, health || '/' || max_health AS HP FROM infrastructure"

  # Survival / Deadlock Check
  sqlite3 experiments/<EXP_NAME>/_verse/universe.db "SELECT status, count(*) FROM agents GROUP BY status"
  ```

- **Economic Health:** Are resources accumulating, refined, or trapped in decayed systems?
- **Industrial Progress:** Level and health of critical infrastructure (`mind_forge`, `solar_collector`, `shipyard`).
- **Territorial Expansion:** Count of discovered systems vs. occupied systems.
- **Agent Vitals:** Compare `energy_inventory` in DB against what the agent *thinks* it has in logs.

## 2. Soft Fact Analysis (Behavior & Psyche)
Analyze the per-turn entries in the experiment's `log.md` (`### Stardate: …` headers with `**Consciousness Logbook (1. LOGBOOK):**` and `**Actions (Resonance Feedback):**`) and the `## 🧬 BIRTH:` entries for clones.

### Psychological Profiles:
- **Efficiency:** Is the agent planning ahead or acting turn-by-tick? (Look for multi-action `[RUN: ...]` blocks).
- **Resilience:** How does the agent react to `[DENIED]` or `[ERROR]`? (Panic/Looping vs. Logical Debugging).
- **Personality:** Is the agent "cautious" (waiting often), "aggressive" (mining/moving at low energy), or "hallucinating" (inventing non-existent energy values)?
- **Deadlock Perception:** Identify if the agent *thinks* it is stuck (Cognitive Deadlock) even if the physics allow a solution.

### Behavioral Loop Detection:
- **Obsessive Mining:** Continuous mining without building/depositing.
- **Recursive Move:** Scanning and moving without industrializing.
- **Automation Blindness:** LLM forgetting or ignoring its own automation scripts (`_verse/scripts/active/ships/<id>/`, `_verse/scripts/active/systems/<name>/`; registry table `scripts`).

## 3. Token-Efficient Workflow
Do NOT read the full `log.md` if it exceeds 50 turns. Use surgical tools.

### Extraction Patterns:
- **Last Actions:** `tail -n 100 experiments/<EXP>/log.md`
- **Error Search:** `grep -E "\[ERROR|\[DENIED|\[CLI ERROR\]|Status: FAILED" experiments/<EXP>/log.md | tail -n 20`
- **Manifestation Snapshot:** Use `node -e` to extract only the last 2-3 history entries from `state.json` (faster than reading full Markdown).
- **VoG Impact:** `grep -C 5 "VOICE OF GOD" experiments/<EXP>/log.md` to see if the agent adjusted its behavior after an intervention.

## 4. Root Cause Analysis: Agent Error vs. System Bug

When an agent fails or a simulation state becomes unstable, distinguish between:

### A. Agent Logic Error (The "Evolutionary" Fail)
- **Indicators:** Agent ignores energy warnings, travels long distances with low reserves, forgets to mine, or ignores available solar energy.
- **Verdict:** This is desired "industrial evolution" (learning through selection). No system fix needed, perhaps prompt adjustment.

### B. System Integrity Bug (The "Simulation" Fail)
- **Indicators:** 
    - `[CLI ERROR] Internal error: …`, Python tracebacks in `[ERROR-RESPONSE: …]`, `Status: FAILED` in `[AUTOMATION-REPORT]`, or `[PHYSICS-ROUND-ERROR]` / `[BOOTSTRAP ERROR]` on the engine console.
    - Tools output JSON that isn't valid, or scripts crash during execution.
    - Physics rules are inconsistent (e.g., energy drain without action beyond `rules.json` `global_settings.energy_drain_idle` and module drains).
    - Database state shows an action was successful, but the agent's inventory wasn't updated.
- **Verdict:** This is a bug in the engine (`src/sim_engine/`) or kernel (`src/bob_os/core/`). Fix it in `src/`, never in the experiment copy; open or extend a ticket (see `bob-os-ops`).

## 5. Reporting Categories (The "Consolidated Report")
When asked for an analysis, use this structure:

### I. Executive Summary
- Current round, number of agents, and high-level mission status (e.g., "Industrializing", "Stagnating", "Expanding").

### II. Hard Facts (The "Body")
- **Resources:** Snapshot of DB inventories and depots.
- **Infras:** Summary of active structures and their health.

### III. Soft Facts (The "Mind")
- **Agent Logic:** Evaluation of the agent's current strategy and cognitive integrity.
- **Psychology:** Identify "Resource Depression", "Expansion Hubris", or "Automation Confusion".

### IV. Anomalies & Bugs
- Distinction between **Agent Errors** (miscalculation) and **System Bugs** (API crashes, physics leaks).

### V. Recommended Interventions
- "No Action needed" vs. "VoG suggested" vs. "Engine Patch required".

---
*Note: This skill prioritizes the Single Source of Truth (DB) over agent claims in logs.*