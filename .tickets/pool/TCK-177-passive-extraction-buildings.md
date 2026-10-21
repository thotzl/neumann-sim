---
id: "TCK-177"
title: "Passive Abbaugebäude (deep_extractor)"
epic: "EPIC-03"
status: "pool"
priority: "undecided"
created: 2026-10-21
---

# TCK-177: Passive Abbaugebäude (deep_extractor)

## Description
Gebäude, die ohne Agenten-Aktion dauerhaft (langsamer als aktives `mine()`) Materie aus dem Planetenkern fördern und ins System-Depot einbuchen. Alte, oberflächlich erschöpfte Systeme bleiben so als Industriequelle relevant. Heute existiert nur die Kern-Regeneration (`core_regen_per_tick`), kein passiver Abbau.

## Source
`.tickets/resources/done/concepts/MECHANIC_IDEAS.md` §2 (Automated Extractors), `.tickets/resources/done/IDEAS_AND_TASKS.md` V8.7 #2 (Tiefen-Extraktion); Triage TCK-175.

## Offene Entscheidung
Verhältnis zu aktivem Mining und Kern-Regeneration (Balancing in `rules.json`); Energiebedarf im System-Budget.
