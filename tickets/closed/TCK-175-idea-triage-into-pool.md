---
id: "TCK-175"
title: "TRIAGE: Ideen aus resources/done und docs/concepts in den Ticket-Pool"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "medium"
wave: "jetzt"
created: 2026-10-21
dependencies: ["TCK-173"]
completed: 2026-10-21
version: "v13.10.14"
---

# TCK-175: TRIAGE: Ideen aus resources/done und docs/concepts in den Ticket-Pool

## Description
Jeder Ideen-/Aufgabenpunkt aus `tickets/resources/done/` und `docs/concepts/` wird eingeordnet: (a) umgesetzt (im Wiki dokumentiert), (b) bereits als Ticket vorhanden, (c) verworfen/obsolet, (d) neu → Pool-Ticket am passenden Epic. Neue Pool-Tickets werden erst nach Freigabe der Liste durch den Architekten angelegt. Die Quelldokumente bleiben in `tickets/resources/` (Ticketsystem bleibt vollständig).

## Verified Code Gap (Ausgangslage)
- Revisit D4 hat die Ressourcen bereits in Epics/Pool überführt; Abgleich gegen den heutigen Code und die aktuellen Tickets fehlt.
- Aus TCK-173 bekannt: EXPANSE-Hebel 3 (Token-Heuristik `/ 4`) und 4 (Epochen-Gedächtnis) nicht umgesetzt.

## Definition of Done
- [x] Triage-Tabelle aller Punkte mit Zuordnung (Ticket/Wiki/verworfen/neu).
- [x] Liste neuer Pool-Tickets vom Architekten freigegeben.
- [x] Freigegebene Pool-Tickets angelegt, Epics ergänzt, Index regeneriert.

## Triage (2026-10-21, gegen Code und Tickets geprüft)

| Quelle | Punkt | Einordnung |
|---|---|---|
| IDEAS_AND_TASKS, NEXT_TODOS, SDK_TASKLIST, HANDOFF | Bob/Schiff-Trennung, First-Mover, Dashboard-Scope, Blueprints, Energie aus Systemnetz, Sandbox `scripts/`, Hard-Boot, Auto-Radio-Poll, Skript-Physik via `[RUN]`, Raw-XY-Navigation | umgesetzt (TCK-001/002/003/004/005/006/012/013/105/129) → Wiki `implemented/` |
| IDEAS_AND_TASKS | Comms-Relay-Reichweite, Wartung/HP, Betriebskosten, Infrastruktur-Level, Battery Bank, Sat Link, Refinery, Inkubation (ein Klon pro System), System-Depots | umgesetzt (v8.8, Code `comms.py`, `physics_update.py`, `actuators.py`) |
| IDEAS_AND_TASKS, ADVANCED_MECHANICS_DUMP §3, AGENT_UPGRADE_MANIFEST | Agenten-Level/Slots/Chassis-Klassen | Ticket TCK-101; Freestyle-Engineering umgesetzt (TCK-004) — TCK-101 widerspricht Host-Entkopplung (Agenten haben keine Hülle) → Architekten-Entscheidung |
| IDEAS_AND_TASKS | Werft-Upgrades (Expansion Invariant) | Ticket TCK-102 |
| IDEAS_AND_TASKS, ROAD_TO_ROAMER, MECHANIC_IDEAS §3 | KMI-Hub, System-Runde, UBCL/SDK, Identity Verification, Skripte an Hardware | umgesetzt (TCK-009/125) |
| ROAD_TO_ROAMER Ph. 4, MECHANIC_IDEAS §3, RTS §3 | Roamer-Wrapper, Logistik-Hubs | Ticket TCK-156 (EPIC-04) |
| ROAD_TO_ROAMER §1.3/2.1 | Import-Firewall, `bob ps`, Python-Sandbox | obsolet: Isolation über Container (TCK-139, ADR 0002); `me fs` existiert |
| ROAD_TO_ROAMER §2.2/2.3 | Visuelles Log fremder Skripte, fremde Inventare ausblenden | umgesetzt (`visual_events` über Proxy-Agenten; Dashboard zeigt fremde Bobs ohne Inventar) |
| MECHANIC_IDEAS §1, ADVANCED §4.1 | Isotope | Ticket TCK-155 |
| MECHANIC_IDEAS §2, IDEAS V8.7 #2 | Passive Extraktoren / `deep_extractor` | **neu** (Kern-Regeneration existiert, passive Abbaugebäude nicht) |
| MECHANIC_IDEAS §1, ADVANCED §1.2, RTS §1 | Verschleiß durch Aktionen (Schiffs-HP) | **Erweiterung** TCK-166 (dort nur Umwelt-Schaden) |
| MECHANIC_IDEAS §4, RTS §4 | Anomalien, Biome | Tickets TCK-136, TCK-153, TCK-166 |
| MECHANIC_IDEAS §5, ADVANCED §5.1 | Shared Infrastructure, Council | Tickets TCK-151, TCK-152 |
| ADVANCED §2.1/2.2 | SCUT-Kosten/Latenz | Ticket TCK-160 |
| ADVANCED §2.3, EPIC_3, ROADMAP Säule A | Fog of War, Fraktionen, SCUT 2.0, Hacking | Tickets TCK-106, TCK-112, TCK-113 (EPIC-01) |
| IDEAS_AND_TASKS Phase 4 | Aggressive Fremd-Fraktion „The Others" (NPC) | **neu** (EPIC-01 behandelt nur Bob-Fraktionen) |
| ROADMAP Säule B, ROADMAP_WORLD_MECHANICS MS4 | Ziele, Achievements, Metrik-Tracker, Terraforming, Mainframe | Tickets TCK-107, TCK-153, TCK-154 |
| ROADMAP_WORLD_MECHANICS MS2.3, RTS §2 | Bau-Voraussetzungen / Forschung | **Erweiterung** TCK-154 (Tech-Tree-Entscheidung offen); Teil-Voraussetzung `solar_collector` existiert |
| ROADMAP_WORLD_MECHANICS MS3.2, IDEAS V8.7 #3 | Mass Driver | Ticket TCK-159 |
| ROADMAP Säule C | Sektor-Klassen, Katastrophen | Tickets TCK-136, TCK-166 |
| ROADMAP (Konflikttabelle) | Disembodied Minds ohne Host im All | verworfen: Code verlangt Host (`ship`/`matrix`) |
| IDEAS Phase 5/6 | Unity-Interface, Seed-Galaxie | obsolet (HUD/WebSocket) bzw. umgesetzt (TCK-116) |
| OPTIMIZATION_LEVER_1–4, TOKEN_*, REALTIME_VS_STANDBY | Dashboard-Pruning, Standby/Wakeup, englische Prompts, rekursive Kompression | umgesetzt → Wiki `architecture/memory-and-heritage`, `history/expanse-run-report` |
| OPTIMIZATION_LEVER_5 | Modell-Split, Soft-Limit ≈ 4000 | Konfiguration pro Experiment; **Erweiterung** TCK-164 (Kalibrierung über Telemetrie) |
| REFACTORING_PLAN, TCK-116-Handoff | Services, Mulberry-Generator | umgesetzt (TCK-009, TCK-116, TCK-144) |
| GOOGLE_CLOUD_MIGRATION, FREE_CLOUD_AND_AI_LABS_EVALUATION | Cloud-Dauerbetrieb, Free-Tier-Provider | Provider umgesetzt (Profile, TCK-146); **neu (optional)**: Remote-Dauerbetrieb des Runtime-Containers |
| docs/concepts/WEAPON_SYSTEMS_V14 | Waffen, Ballistik | Ticket TCK-158 |
| docs/concepts/* (übrige) | Schiffe, LLM-Bridge, Frontend, V12, World-State | umgesetzt → Wiki `history/concept-papers` |

Korrektur im Wiki (Code ist Wahrheit): EXPANSE-Hebel 3 und 4 sind umgesetzt (englische Prompts mit `/ 4`; `recursive_compression` + `max_compression_output_tokens`), nicht offen wie in TCK-173 notiert.

## Verification Command
`node .github/scripts/sync_github.js --index-only`; `node tests/js/test_doc_links.js`.

## Verification (Code SSoT)
- Architekten-Freigabe 2026-10-21: alle drei neuen Pool-Tickets, alle Ergänzungen; TCK-101 betrifft Schiffe (falsches Wording).
- Neu: `tickets/pool/TCK-177-passive-extraction-buildings.md` (EPIC-03), `TCK-178-npc-antagonist-faction.md` (EPIC-01), `TCK-179-remote-runtime-host.md` (EPIC-07); in die Epic-Ticketlisten eingetragen.
- Ergänzt (Source): TCK-154 (Bau-Voraussetzungen/Forschung), TCK-164 (Kalibrierung Hebel 5), TCK-166 (Verschleiß durch Aktionen). TCK-101: Titel „Ship Hardware Upgrades & Leveling“, Beschreibung und Code-Gap auf `ships` umgestellt.
- Wiki: Hebel 3/4 korrigiert (`architecture/memory-and-heritage`, `history/expanse-run-report`); Ticket-Link-Regel umgesetzt — keine Links mehr auf `open/`, `pool/`, `epics/` (nur IDs als Text), Planungsinhalte entfernt (Epic-Tabelle, „Open follow-ups“, „Planned extensions“); Regel in `wiki/_sources.md` und `operations/ticket-workflow`.
- Quelldokumente bleiben unverändert in `tickets/resources/`.
- Prüfung: Wiki-Linkcheck OK; `node tests/js/test_doc_links.js` und `node tests/js/test_ticket_sync.js` grün (siehe Commit).

## References
- [TCK-173](../closed/TCK-173-wiki-compile.md), Wiki [history/expanse-run-report](../../wiki/history/expanse-run-report.md)
