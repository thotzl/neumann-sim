# ADR 0004: Wiki ersetzt docs/

- Status: Accepted
- Datum: 2026-10-21
- Entscheider: Projekt-Architekt
- Ticket: [TCK-173](../../tickets/closed/TCK-173-wiki-compile.md), [TCK-175](../../tickets/closed/TCK-175-idea-triage-into-pool.md), [TCK-176](../../tickets/closed/TCK-176-retire-docs-folder.md)

## Kontext

Projektwissen lag verteilt in `docs/` (Referenz- und historische Dokumente), im README, in 48 geschlossenen Tickets, in den Projekt-Skills und in `REPO_MAP.md`. Teile von `docs/` waren gegenüber dem Code veraltet; Ideen und Konzepte lagen außerhalb des Ticketsystems.

## Optionen

1. `docs/` weiter pflegen und um eine Übersicht ergänzen.
2. GitHub-Wiki (separates Repository).
3. Verlinktes Markdown-Wiki im Repository (`wiki/`), kompiliert mit dem `wiki-builder`-Skill, Obsidian-Vault ab Repo-Root.

## Entscheidung

Option 3.
- `wiki/` (englisch) ist die Dokumentation: Architektur, Weltregeln, SDK, Betrieb, Code-Karte (`project-map/`, ersetzt `REPO_MAP.md`), umgesetzte Features nach Bereich (`implemented/`), Historie.
- Wiki und Ticketsystem verweisen aufeinander, hängen aber nicht voneinander ab: Tickets planen, das Wiki dokumentiert Bestehendes. Das Wiki verlinkt nur geschlossene Tickets; offene, Pool- und Epic-Tickets erscheinen höchstens als ID.
- Ideen und nicht umgesetzte Konzepte gehören ins Ticketsystem (`tickets/pool/`, `tickets/resources/`), nicht ins Wiki.
- ADRs liegen 1:1 (deutsch, Inhalt unverändert) in `wiki/decisions/`. Der Changelog bleibt eine eigene Datei im Repo-Root (`CHANGELOG.md`). Der generierte Ticket-Index liegt im Ticketsystem (`tickets/BACKLOG.md`).
- Bei Abweichungen zwischen Code und Config, Hilfe oder Doku ist der Code die Wahrheit.
- `docs/` entfällt.

## Konsequenzen

- Positiv: eine Dokumentationsquelle, gegen den Code verifiziert, mit Quellenregister (`wiki/_sources.md`) und Manifest (`wiki/_processed.md`) für inkrementelle Aktualisierung.
- Positiv: Ticket-Ordnerwechsel brechen keine Wiki-Links mehr.
- Negativ: Aus `docs/` abgeleitete Artikel haben keine Quelldatei mehr; sie werden direkt im Wiki gepflegt. Die Originale bleiben in der Git-Historie.
- Negativ: Das Abschlussprotokoll (`bob-os-ops`) umfasst zusätzlich die Wiki-Aktualisierung umgesetzten Verhaltens.
