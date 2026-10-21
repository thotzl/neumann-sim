---
sources: [.agents/skills/bob-os-ops/SKILL.md, README.md, tickets/closed/TCK-014-github-sync.md, tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md, tickets/closed/TCK-172-ticket-sync-label-limit-and-resilience.md, tickets/closed/TCK-175-idea-triage-into-pool.md]
---

# Ticket workflow

Planning lives in the Git ticket system under `tickets/`, not in this wiki. The wiki documents what was built ([[wiki/implemented/_index]]) and links into the tickets.

## Folders (status = folder, ADR 0003)
| Folder | Meaning | GitHub |
|---|---|---|
| `open/` | decided backlog | issue open |
| `ongoing/` | in progress | issue open |
| `closed/` | done and verified | issue closed |
| `pool/` | undecided ideas | issue open, label `status:pool` |
| `epics/` | roadmaps `EPIC-xx-*.md` | issue open, label `type:epic` |
| `resources/` | concept and source documents | not synced |

## Wiki and tickets
- Tickets plan, the wiki documents. Planned work (open, pool, epics) stays in the ticket system; the wiki only describes what exists.
- The wiki links closed tickets (stable path); open or pool tickets appear only as plain IDs, e.g. for a known deviation in current code.
- Overview of all epics and tickets: the generated backlog index (see Sync and index).

## Tickets
- File names are status-neutral: `TCK-<id>-<slug>.md`; move with `git mv`.
- Frontmatter: `id`, `title`, `epic`, `epic_phase`, `status`, `priority`, `wave`, `created`, `dependencies`; closed adds `completed`, `version`.
- Body: Description, Verified Code Gap, Definition of Done, Verification Command, References; pool tickets: Source, Offene Entscheidung.
- Pool → decided: move to `open/`.

## Closing (one atomic step)
Tests green → move to `closed/` with a `## Verification (Code SSoT)` section → bump `package.json` version → [CHANGELOG](../../CHANGELOG.md) entry → ADR in `wiki/decisions/` if a decision was made ([[wiki/decisions/_index]]) → wiki update for changed behaviour (topic article + `implemented/`, with a link to the closed ticket) → regenerate the ticket index → one commit `type(scope): summary (ref TCK-<id>)`.

## Sync and index
- `npm run tickets:push` / `tickets:pull` sync with GitHub Issues (`.github/scripts/sync_github.js`); CI sync on push to `master`/`main`.
- Generated backlog index [tickets/BACKLOG.md](../../tickets/BACKLOG.md): `node .github/scripts/sync_github.js --index-only` (offline).

## Key Takeaways
- Status is the folder; ideas go to `pool/`, roadmaps to `epics/`.
- Closing = tests, move, version, changelog, optional ADR, index, one commit.
- Agent procedure: [bob-os-ops skill](../../.agents/skills/bob-os-ops/SKILL.md).
