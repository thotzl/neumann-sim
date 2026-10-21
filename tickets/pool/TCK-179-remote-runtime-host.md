---
id: "TCK-179"
title: "Dauerbetrieb des Runtime-Containers auf einer Cloud-VM"
epic: "EPIC-07"
status: "pool"
priority: "undecided"
created: 2026-10-21
---

# TCK-179: Dauerbetrieb des Runtime-Containers auf einer Cloud-VM

## Description
Lange Experimente (1000+ Runden) laufen unabhängig vom Entwickler-Rechner auf einer dauerhaft laufenden VM im Runtime-Container (ADR 0002). Umfasst Setup-Anleitung, Übergabe der Keys über die Env-Allowlist, Zugriff auf den Monitor und Abholen der Experiment-Daten.

## Source
`tickets/resources/done/GOOGLE_CLOUD_MIGRATION.md`, `tickets/resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md` (Säule 3); Triage TCK-175.

## Offene Entscheidung
Anbieter/Plattform; Monitor-Zugriff ohne öffentliche Exposition des VoG-Servers; Umgang mit Keys auf fremder Infrastruktur.
