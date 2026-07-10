# V8.0 Unified Functional Logic

Agents use the exact same syntax for manual execution and script execution.

**CLI**: `[RUN: bob scut(to=Bob-2, msg=Hello)]`
**SDK**: `agent.scut(to="Bob-2", msg="Hello")`

## Parser (`functional_parser.py`)
- Swallows spaces and commas in greedy arguments (like `msg`).
- Ignores surplus quotation marks.
- Allows parenthesis-free calling for arg-less methods (`[RUN: bob mine]`).
