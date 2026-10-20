---
id: "TCK-168"
title: "VoG-Server: experiment_dir im Container-Modus"
epic: "EPIC-07"
status: "pool"
priority: "undecided"
created: 2026-10-20
dependencies: ["TCK-139"]
---

# TCK-168: VoG-Server: experiment_dir im Container-Modus

## Description
`hud/vog_server.cjs` übernimmt `experiment_dir` aus Engine-Broadcasts. Im Container-Modus ist das `/app/experiments/<exp>` — ein Pfad, den es auf dem Host nicht gibt. Folge: VoG-Nachrichten (`POST /vog` → `creator_msg.txt`) werden nach dem ersten Broadcast stillschweigend verworfen; der Live-State ist nicht betroffen.

## Source
TCK-139 Abschlussbericht (Residual Risk 4).

## Offene Entscheidung
Server ignoriert `experiment_dir` aus Broadcasts und nutzt nur `--v=<exp>`/Auto-Detect, oder Engine sendet nur den Experiment-Namen.
