# V8.0 Unified Functional Logic

This document describes the final, unified architecture of Bob-OS V8.0, bridging the gap between natural language prompts and Python execution.

## The Core Concept: "One API to rule them all"
Agents (Bobs) interact with the world via two methods:
1. **Manual Prompts:** `[RUN: bob method(key=val)]`
2. **Automated Scripts:** `import bob_sdk; me = bob_sdk.Agent(); me.method(key="val")`

To minimize the LLM's cognitive load, V8.0 uses a completely flat API structure and a highly tolerant string parser.

## 1. The Flat SDK (`bob_os/core/lib/bob_sdk.py`)
The `Agent` class has been flattened. Instead of navigating sub-modules like `agent.actuators.mine()`, the LLM calls `me.mine()`. The Agent class acts as a proxy to the internal implementations (`Actuators`, `Sensors`, `Logistics`, `Comms`).

**Logistics Simplification:**
`deposit` and `withdraw` no longer require a `target` argument. The local system (`SYS-X0-Y0`) acts as the implicit target.
- `deposit(resource="matter", amount=100)`
- `withdraw(resource="energy", amount=50)`

## 2. The Functional Parser (`bob_os/core/lib/functional_parser.py`)
The Unified Bob Command Line (UBCL) script `bob.py` no longer uses standard `argparse`. It uses a custom Regex-based parser designed for LLM quirks.

**Features of the Parser:**
- **Quote Tolerance:** It accepts strings with or without quotation marks (e.g., `scut(to=Bob-2)` vs `scut(to="Bob-2")`).
- **Optional Parentheses:** Methods without arguments can be called natively (e.g., `bob mine` is equivalent to `bob mine()`).
- **Greedy End-Arguments:** Freitext fields (like `msg` in `scut`) are defined as "greedy" in `METHOD_META`. The parser will swallow spaces, commas, and special characters until the closing parenthesis `)` is reached. This prevents shell-splitting errors. Example: `scut(to=Bob-1, msg=Hello, how are you?)` works flawlessly.

## 3. The Node.js Engine (`sim_engine/`)
- **`environment.js`:** The JS-Regex replaces the leading `bob ` or `bob(` with the correct Python execution string (`python3 ../core/bin/bob.py`). It escapes single quotes in the LLM's string before passing it to the shell to prevent injection/breakage.
- **`api_client.js`:** Dynamically loads the `bob.py --help` output and injects it into the system prompt. This ensures the prompt is always 100% synchronized with the actual Python implementation.

## 4. Physics & Capacities
- Building infrastructure (`matter_silo`, `solar_collector`) immediately updates the system's `matter_cap` and `energy_cap`.
- Solar Collectors also immediately increase the `passive_energy_rate` by 100, which is distributed to the system depot at the end of each `System Cycle`.