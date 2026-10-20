# Sources

Wiki root: `wiki/`; vault root: repository root. Language: English. Wiki-internal links as `[[wiki/<topic>/<article>]]`; links to files outside the wiki (tickets, skills, ADRs, changelog) as relative Markdown links (checked by `tests/js/test_doc_links.js`); code paths in backticks.

| Source | Instructions |
|---|---|
| docs/**/*.md (except docs/adr/, docs/CHANGELOG.md, docs/EPIC_CONSOLIDATION_BACKLOG.md) | All content. Do not link `docs/` inline (it will be removed); cite only in `sources:`. After `docs/` is deleted, drop these entries from `sources:` — the wiki becomes the source for this content. |
| README.md | Setup, runtime, architecture overview. |
| .tickets/closed/*.md | Bundle by feature area into `implemented/`; link each ticket; current behaviour goes into the matching topic article. Tickets stay the source of record. |
| .tickets/epics/*.md | Link only (epic list in `operations/ticket-workflow`); do not copy planning content. |
| .agents/skills/*/SKILL.md | Verified reference for architecture, SDK, physics, ops, testing, analysis, research philosophy. Summarise for humans; link the skill for agent procedures. |
| src/, hud/, scripts/, tests/, .github/, Dockerfile, package.json | Code, confirmed 2026-10-20: module purpose, entry points, key files, runtime data flow, configuration files. No function-level detail. Verify doc statements against code; record deviations in the article. |

Not compiled (kept outside the wiki, linked only): `docs/CHANGELOG.md`, `docs/adr/` (linked from `decisions/_index`), `docs/EPIC_CONSOLIDATION_BACKLOG.md` (ticket system), `.tickets/open/`, `.tickets/pool/`, `.tickets/resources/`.
