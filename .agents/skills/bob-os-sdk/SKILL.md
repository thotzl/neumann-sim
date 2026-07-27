---
name: bob-os-sdk
description: Rules for the Unified Functional CLI and Python SDK (V8.0)
---

# SKILL: V8.0 Unified Functional Logic

This skill defines how agents interact with the world.

## 1. The Functional Paradigm
Agents use identical syntax structures in manual Prompts and Automated Scripts.
- **CLI (Manual):** `[RUN: bob method(key=val, key2=val2)]`
- **SDK (Scripts):** `import bob_sdk; me = bob_sdk.Agent(); me.method(key=val, key2=val2)`

## 2. The Custom Parser (`functional_parser.py`)
- The CLI does NOT use `argparse`. It uses a custom Regex/Meta-based parser.
- **Quote Tolerance:** It ignores missing or surplus quotes (`"` or `'`).
- **Greedy Endings:** Free-text arguments (like `msg` in `scut`) swallow all commas and spaces until the closing parenthesis.
- **Optional Parens:** Methods without arguments (e.g., `mine`) can be called via `bob mine` or `bob mine()`.

## 3. The Flat SDK (`bob_sdk.py`)
- The `Agent` class provides direct proxy methods (`me.mine()`, `me.deposit()`).
- Internal classes (`Actuators`, `Sensors`, `Logistics`) are abstracted away from the LLM.

## 4. Automation Rules
- Automation scripts run **once per cycle** during the `System Cycle` (handled by `automation.js`), AFTER all agents had their turn. This prevents O(N^2) energy vampire bugs.
- Scripts reside in `_verse/scripts/active/<agent_id>/` and are invoked with the owner's `BOB_ID` injected.
