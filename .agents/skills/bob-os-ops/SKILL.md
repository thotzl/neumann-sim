---
name: bob-os-ops
description: Operations and project workflow for Bob-OS - building, running, injecting, resetting and migrating experiments (container vs. native path), the Git ticket system under tickets/, GitHub sync, and the closing protocol with changelog, version bump, ADRs and commits. Use when creating, moving or closing tickets, preparing a release or commit, or operating experiments.
---

# Bob-OS Operations and Workflow

## Inquiry-first
- Questions, reviews and "what do you think" requests are read-only. No file writes, ticket moves or git operations.
- Propose tickets, ticket moves, changelog text and commits in the chat first; execute only after an explicit directive.
- On a failed command or test: stop, report the error, ask. No speculative workarounds.
- No destructive git commands (`reset --hard`, `checkout -- <file>`, force push) unless explicitly requested.

## Code is king
Never edit code inside `experiments/<exp>/` (except reading logs/state). Change `src/`, then rebuild or inject. Experiments are untracked autarkic copies.

## Experiment lifecycle
| Task | Container path (supported, ADR 0002) | Native path (dev/CI only, unsafe for agent code) |
|---|---|---|
| Build | `npm run build:docker -- <exp> --mission "..." [--rounds N --agent ID --location SYS --force]` (always `--skip-tests`) | `npm run build -- <exp> --mission "..." [...] [--skip-tests]` (runs the test hub first unless skipped) |
| Run | `npm run sim:docker -- <exp>` (image engine, read-only root FS, only `experiments/<exp>` mounted) | `npm run sim <exp>` (runs `experiments/<exp>/sim_engine/core/runner.js`) |
| Mock run | `E2E_MOCK=true npm run sim:docker -- <exp>` | `E2E_MOCK=true npm run sim <exp>` |
| Patch running exp | not available; rebuild with `--force` or rebuild the image | `npm run inject <exp> engine\|tools\|migrate\|<src path>` |
| Reset to round 0, keep `config.json` | rebuild with `--force` | `npm run reset <exp>` |
| Apply migrations | via rebuild | `npm run migrate -- experiments/<exp>/_verse/universe.db` or `npm run inject <exp> migrate` |
| Analyse | — | `npm run analyze -- <exp>` |

- `scripts/build.py` copies `src/bob_os/_verse`, `src/bob_os/core`, `src/sim_engine` into the experiment, writes `config.json` from `src/bob_os/templates/mission_template.json` (random 8-digit `seed`), runs `core/bin/init_db.py` (migrations), checks the result. Seeding happens on first engine start (`init_db.py --seed`).
- `scripts/sim_docker.js` passes only allowlisted env vars (LLM keys, `VOG_TOKEN`, `VOG_HOST`, `C2_PORT`, `E2E_MOCK`, `E2E_MOCK_*`) from shell and root `.env` (`.env` wins). Image override: `NEUMANN_SIM_IMAGE`.
- `inject tools` copies all of `src/bob_os/core` (including migrations); follow with `inject migrate` when migrations changed.
- Monitor: `cd hud && npm run dev`; VoG writes need `VOG_TOKEN` in the root `.env`.

## Ticket system (`tickets/`)
| Folder | Meaning | GitHub mapping |
|---|---|---|
| `open/` | decided backlog | issue open, column Todo |
| `ongoing/` | in progress | issue open, column In Progress |
| `closed/` | done and verified | issue closed, column Done |
| `pool/` | undecided ideas | issue open, label `status:pool` |
| `epics/` | roadmaps `EPIC-xx-*.md` | issue open, label `type:epic`, title `[EPIC-xx] …` |
| `resources/todo/`, `resources/done/` | concept and source documents | not synced |

- Status = folder (ADR 0003). File names are status-neutral: `TCK-<id>-<slug>.md`. Move with `git mv` to keep history and links.
- Frontmatter: `id`, `title`, `epic`, `epic_phase`, `status`, `priority`, `wave`, `created`, `dependencies`; closed adds `completed: YYYY-MM-DD` and `version: "vX.Y.Z"`. Keep `status` consistent with the folder.
- Body: `## Description`, `## Verified Code Gap`, `## Definition of Done` (checkboxes), `## Verification Command`, `## References`. Pool tickets: `## Source`, `## Offene Entscheidung`.
- New ticket: search `open/ ongoing/ pool/ closed/` for duplicates first; extend an existing ticket if it covers the topic. Next free ID = highest existing `TCK-` number + 1.
- Pool → decided: move to `open/`.
- Index `tickets/BACKLOG.md`: the block between the `GENERATED TICKET INDEX` markers is generated; never edit it by hand. Regenerate offline with `node .github/scripts/sync_github.js --index-only`.
- Sync: `npm run tickets:pull` (GitHub → local, moves files, rebuilds index) and `npm run tickets:push` (local → GitHub issues and labels). Credentials from `.env`. CI sync (`.github/workflows/sync-tickets.yml`) runs only on push to `master`/`main`; PRs run tests only.

## Closing a ticket (one atomic step, on directive)
1. Tests green: `npm run test:docker` (plus HUD `npx tsc --noEmit && npx vitest run` in `hud/` if touched).
2. `git mv tickets/<open|ongoing>/TCK-<id>-<slug>.md tickets/closed/`; set `status: "closed"`, `completed`, `version`; tick the DoD boxes.
3. Keep the gap section (as `## Verified Code Gap (Ausgangslage)`) and add `## Verification (Code SSoT)`: files, functions, tests and the command output that prove the result.
4. Version: bump `package.json` `version` (patch for hardening/fixes, minor for features).
5. `CHANGELOG.md` (repo root): add a row to the release-plan table and a section `### [vX.Y.Z] - YYYY-MM-DD` with a category heading (`#### Added|Changed|Fixed|Refactored|Removed|Security`), one bullet and `*Ticket:* [TCK-<id>](tickets/closed/TCK-<id>-<slug>.md)` (plus ADR link if any).
6. Decision made (architecture, runtime, process)? Write `wiki/decisions/NNNN-slug.md` (Status, Date, Ticket, Context, Options, Decision, Consequences), add it to `wiki/decisions/_index.md` and link it from ticket and changelog.
6a. Implemented behaviour changed? Update the wiki (`wiki-builder` skill): describe current behaviour in the topic article and link the closed ticket in `wiki/implemented/`. Do not put planning (open/pool/epics) into the wiki.
7. Regenerate the ticket index (`--index-only`).
8. Commit: one commit per ticket, staged by explicit paths (no `git add .`), message `type(scope): summary (ref TCK-<id>)`; types `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`. Push only on directive.

## Session continuity
- Long-running brainstorming or design state: `.agents/state/<topic>.md` (resume point for a later session).
- Implementation plans: `.agents/plans/`; move finished plans to `.agents/plans/done/`.
- Findings that change how the repo works go into the matching skill in `.agents/skills/`, verified against code.
