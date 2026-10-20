---
sources: [.agents/skills/bob-os-ops/SKILL.md, README.md, .tickets/closed/TCK-014-github-sync.md, .tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md, .tickets/closed/TCK-172-ticket-sync-label-limit-and-resilience.md, .tickets/epics/]
---

# Ticket workflow

Planning lives in the Git ticket system under `.tickets/`, not in this wiki. The wiki documents what was built ([[wiki/implemented/_index]]) and links into the tickets.

## Folders (status = folder, ADR 0003)
| Folder | Meaning | GitHub |
|---|---|---|
| `open/` | decided backlog | issue open |
| `ongoing/` | in progress | issue open |
| `closed/` | done and verified | issue closed |
| `pool/` | undecided ideas | issue open, label `status:pool` |
| `epics/` | roadmaps `EPIC-xx-*.md` | issue open, label `type:epic` |
| `resources/` | concept and source documents | not synced |

## Epics
| Epic | Goal |
|---|---|
| [EPIC-00](../../.tickets/epics/EPIC-00-platform-hardening.md) | Platform hardening before new features |
| [EPIC-01](../../.tickets/epics/EPIC-01-factions-and-diplomacy.md) | Factions, fog of war, diplomacy |
| [EPIC-02](../../.tickets/epics/EPIC-02-goals-and-endgame.md) | Goals, achievements, endgame |
| [EPIC-03](../../.tickets/epics/EPIC-03-deeper-verse-and-disasters.md) | Differentiated sectors, environment, disasters |
| [EPIC-04](../../.tickets/epics/EPIC-04-roamer-and-autonomy.md) | LLM-free autonomy (Roamer), shared script libraries |
| [EPIC-05](../../.tickets/epics/EPIC-05-engineering-and-combat.md) | Retrofitting, upgrades, weapons |
| [EPIC-06](../../.tickets/epics/EPIC-06-interstellar-logistics.md) | Mass driver, communication latency |
| [EPIC-07](../../.tickets/epics/EPIC-07-operator-tooling.md) | HUD visualisation, lobby, replay |
| [EPIC-08](../../.tickets/epics/EPIC-08-cognition-and-swarm-safety.md) | Cognitive protocol, swarm safety |

## Tickets
- File names are status-neutral: `TCK-<id>-<slug>.md`; move with `git mv`.
- Frontmatter: `id`, `title`, `epic`, `epic_phase`, `status`, `priority`, `wave`, `created`, `dependencies`; closed adds `completed`, `version`.
- Body: Description, Verified Code Gap, Definition of Done, Verification Command, References; pool tickets: Source, Offene Entscheidung.
- Pool → decided: move to `open/`.

## Closing (one atomic step)
Tests green → move to `closed/` with a `## Verification (Code SSoT)` section → bump `package.json` version → [CHANGELOG](../../docs/CHANGELOG.md) entry → ADR if a decision was made ([[wiki/decisions/_index]]) → regenerate the ticket index → one commit `type(scope): summary (ref TCK-<id>)`.

## Sync and index
- `npm run tickets:push` / `tickets:pull` sync with GitHub Issues (`.github/scripts/sync_github.js`); CI sync on push to `master`/`main`.
- Generated backlog index: `node .github/scripts/sync_github.js --index-only` (offline).

## Key Takeaways
- Status is the folder; ideas go to `pool/`, roadmaps to `epics/`.
- Closing = tests, move, version, changelog, optional ADR, index, one commit.
- Agent procedure: [bob-os-ops skill](../../.agents/skills/bob-os-ops/SKILL.md).
