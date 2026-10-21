---
sources: [.agents/skills/bob-os-core/SKILL.md, tickets/closed/TCK-138-run-allowlist-and-safe-exec.md, tickets/closed/TCK-006-sandbox-hardening.md]
---

# Action processing

Entry point: `processActions(text, universeDir, agentId, state)` in `src/sim_engine/modules/environment.js`. Only text after `ACTION:` is parsed.

## Tags
| Tag | Effect |
|---|---|
| `[KEY: ADD label secret]` / `[KEY: REMOVE label]` | Keyring in `state.security.wallets[agent]` |
| `[WRITE: file (READ_KEY: k) (WRITE_KEY: k) target=ship::<id>\|system::<name>] … [END]` (`REPLACE` alias) | Write under `scripts/`; with `target=` the script goes to `scripts/active/ships/<id>/` or `scripts/active/systems/<name>/` after `core/bin/script_target_check.py` and is registered by `core/bin/script_register.py` |
| `[READ: scripts/…]` | Returns content with `[`/`]` escaped |
| `[DELETE: scripts/…]` | Deletes file and ACL entry |
| `[RUN: …]` | SDK call or script run, see allowlist; blocks are extracted by `modules/action_parser.js` (bracket counting) |

## RUN allowlist (TCK-138)
- Allowed: `me <method>(…)`, `me.<method>(…)` → `core/bin/bob.py "<method>(…)"` as one argv element; `python3 scripts/<file>.py` (regex `SCRIPT_RUN`, containment under `_verse/scripts/`, ACL `RUN`).
- `bob …` → deprecation error; everything else → `[DENIED: … Use the SDK …]`, not executed.
- Execution: `execFileSync(PYTHON_BIN, argv)` — no shell, 15 s timeout, `cwd` = `_verse/`.
- A failed logistics/mining/build call short-circuits later `move`/`route`/`jump`/`sleep` in the same reply.

## File sandbox
- File operations are limited to `_verse/scripts/` (since TCK-006; hardened in TCK-138: filename regex `^[A-Za-z0-9._/-]+$`, containment check including separators, normalised ACL keys).

## ACL and keyring
- `state.security.acl[path] = { owner, read_key, write_key }`, `state.security.wallets[agent] = { label: secret }` — stored in `state.json`, not SQLite (the `scripts` table mirrors the keys for the registry).
- `services/acl_service.js` `checkAccess(filePath, action, agentId, state)`: a matching `write_key` grants everything; `write_key` gates WRITE/REPLACE/DELETE; `read_key` gates READ/RUN (and writes when no `write_key` exists). No ACL entry = open.

## Prompt help
The hardware help injected into the prompt comes from `bob.py --help` via `getEnvState`.

## Key Takeaways
- LLM output can only trigger `me …` SDK calls and ACL-checked scripts in `_verse/scripts/`; no shell.
- File tags work only inside `_verse/scripts/`; ACL and keyring live in `state.json`.
- Related: [[wiki/architecture/security-and-isolation]], [[wiki/sdk/me-cli]].
