---
sources: [.agents/skills/bob-os-sdk/SKILL.md]
---

# Functional parser

`src/bob_os/core/lib/functional_parser.py` turns `method(key=val, …)` strings into calls.

## Rules (`parse_functional_string`)
- Form `method(key=val, …)` or bare `method` (e.g. `[RUN: me mine]`); method names are lower-cased.
- Keys are located by `\bkey\s*=` for the params listed in `METHOD_META`; a value ends where the next found key starts.
- Non-greedy values: a quoted value runs to the closing quote, otherwise to the first comma.
- Greedy params (e.g. `message` in `scut`, `content` in `memo`/`docs`, `matrix_json`) take everything to the end, outer quotes stripped; commas inside are allowed.
- Without keys: positional split by comma in `METHOD_META` order.
- Unknown methods parse, but `bob.py` answers `[CLI ERROR] Method '…' not implemented.`
- Type conversion in `bob.py` via `utils/parsing.safe_int` / `safe_float`; `ValueError` → `[CLI ERROR]`.

## `METHOD_META`
Per method: parameter order, the greedy parameter, and an `internal` flag (hidden from help, e.g. `dashboard`).

## Key Takeaways
- Keyword parsing is driven by `METHOD_META`; greedy params absorb free text.
- Positional calls follow the `METHOD_META` order.
- Parser tests: `tests/python/sdk_tests/test_v10_strict_parser.py`, `test_ubcl.py`.
