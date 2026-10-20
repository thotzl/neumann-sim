# Bobiverse: RTS & Survival Mechanics (Concept Draft)

## 1. Survival: Energie & Verschleiß
- **Idle Drain:** Jede Sonde verbraucht pro Zyklus eine Basis-Energie (z.B. 5 E). Sinkt die Energie auf 0, geht die Sonde in den "Hibernation"-Mode (keine Aktionen möglich, außer passives Laden).
- **Aktions-Steuer:** `mine.py` kostet 15 E, `move.py` kostet 50 E.
- **Hardware-Decay (Verschleiß):** Aktionen haben eine X% Chance, den "Zustand" (Health) der Sonde zu senken. Reparaturen kosten Materie.

## 2. RTS: Bau & Produktion
- **Asynchroner Bau (Baustellen):** `build.py` stellt Gebäude nicht sofort fertig. Es erzeugt ein Objekt in der DB mit `current_matter` und `required_matter`. Bobs müssen in mehreren Zügen Materie anliefern (`invest.py`).
- **Die Werft (Shipyard):** Replikation findet nicht mehr im "leeren Raum" statt. Es muss ein physisches Gebäude (Shipyard) existieren. Klone "spawnen" dann in diesem Gebäude.
- **Tech-Tree & Forschung:** Gebäude schalten neue Möglichkeiten frei. Eine `forschungseinrichtung` erlaubt das Umwandeln von Materie in "Forschungspunkte", die effizientere Skripte (z.B. `mine_v2.py` mit höherem Ertrag) freischalten.

## 3. Logistik: Roamer & Skripte
- **Agenten-Skripte (Software-Evolution):** Bobs schreiben in `scripts/active/`. Diese laufen im Kopf des Bobs und steuern seine Handlungen.
- **Droids/Roamers (Hardware-Evolution):** Dumme, physische Einheiten. Ein Bob baut einen Roamer (Kosten: 50 M) und weist ihm ein festes Skript zu (z.B. "Pendle zwischen Asteroidengürtel und Silo"). Der Roamer operiert unabhängig vom Bob-Agenten im Tick-Loop des Universums.
- **Lager & Transfer:** Materie muss physisch transferiert werden (`transfer_matter.py <ziel_id>`). Handel erzwingt Interaktion.

## 4. Environment: Biome & Anomalien
- Verschiedene Planetentypen (Lava, Eis, Toxisch) erfordern spezielles Terraforming, bevor Abbau möglich ist.
- Asteroidengürtel sind sofort abbaubar, aber schnell erschöpft.
