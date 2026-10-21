# ADR 0003: Ticket-Pool und Epics im Git-Ticketsystem

- Status: Accepted
- Datum: 2026-10-19
- Entscheider: Projekt-Architekt
- Ticket: [TCK-137](../../tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md), [EPIC-00](../../tickets/epics/EPIC-00-platform-hardening.md)

## Kontext

Das Ticketsystem unter `tickets/` kannte nur `open/`, `ongoing/` und `closed/`. Unentschiedene Ideen lagen als offene Tickets im Backlog und verzerrten ihn; Roadmaps und Konzeptpapiere lagen als lose Dokumente unter `tickets/resources/todo/`. Der Revisit 2026-10 ([05-docs-ticketing.md](../history/revisit-2026-10.md), D3/D4) hat beides in `tickets/pool/` und `tickets/epics/` überführt. `.github/scripts/sync_github.js` synchronisierte diese Ordner nicht und erzeugte den Index `docs/EPIC_CONSOLIDATION_BACKLOG.md` nur im Pull-Modus mit GitHub-Token.

## Entscheidung

- Der Status eines Tickets ergibt sich aus seinem Ordner, nicht aus dem Frontmatter-Feld `status`.
- `tickets/pool/` enthält unentschiedene Ideen. Sie werden als GitHub-Issues im Zustand `open` mit Label `status:pool` synchronisiert.
- `tickets/epics/` enthält Roadmaps/Whitepaper (`EPIC-xx`). Sie werden als GitHub-Issues im Zustand `open` mit Label `type:epic` und Titel `[EPIC-xx] …` synchronisiert.
- Das Frontmatter-Feld `epic` (z. B. `EPIC-00`) wird zusätzlich zum bisherigen `epic_phase`-Slug als Label `epic:EPIC-xx` gesetzt.
- Die Pull-Richtung belässt Pool- und Epic-Einträge in ihrem Ordner. Ein geschlossenes Pool-Issue wandert nach `closed/`; ein explizites `status:open` befördert ein Pool-Ticket nach `open/`.
- Der Index wird von einer eigenen Funktion erzeugt, die ohne Token und Netzwerk läuft: `node .github/scripts/sync_github.js --index-only`. Push und Pull regenerieren ihn ebenfalls.

## Konsequenzen

- Positiv: Backlog (`open/`, `ongoing/`) enthält nur entschiedene Arbeit; Ideen und Epics bleiben auf GitHub sichtbar und filterbar.
- Positiv: Der Index ist lokal und in Tests reproduzierbar (`tests/js/test_ticket_sync.js`).
- Negativ: Zusätzliche Labels (`status:pool`, `type:epic`, `epic:EPIC-xx`) müssen auf GitHub gepflegt werden; bestehende Issues erhalten beim ersten Push neue Labels.
- Negativ: Der generierte Index-Abschnitt (zwischen den `GENERATED TICKET INDEX`-Markern) darf nicht mehr manuell bearbeitet werden; Titel und Epic-Spalten kommen ausschließlich aus dem Frontmatter.
- Ein Ticket aus dem Pool wird durch Verschieben nach `open/` (vorzugsweise `git mv`) beschlossen.
