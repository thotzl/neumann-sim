# Bobiverse: Comprehensive Mechanic Ideas (RTS, Survival, Sim)

Dieses Dokument dient als Inspirationsquelle für die Weiterentwicklung der Bob-OS Physik.

## 1. Survival & Resource Management (Hardcore Baseline)
*   **Energy Grid (The Battery Problem):**
    *   *Passive Consumption (Idle Drain):* Sonden sterben ohne Energie.
    *   *Active Consumption:* Jede Aktion (Mine, Move, Scan) hat hohe Energiekosten.
    *   *Solar Intensity:* Energie-Regeneration sinkt mit der Distanz zur Sonne.
    *   *Storage Units:* Batterien müssen gebaut werden, um Energie für lange Reisen zu speichern.
*   **Hardware Integrity (Verschleiß):**
    *   *Wear & Tear:* Jede Aktion senkt die 'Hull Integrity' (HP).
    *   *Environmental Hazards:* Mikrometeoriten, Sonnenstürme (schädigen Elektronik), Korrosion auf toxischen Planeten.
    *   *Repair Cycles:* Bobs müssen 'Maintenance Scripts' schreiben, um sich mit Materie zu reparieren.
*   **Resource Rarity (Isotope & Compounds):**
    *   Nicht nur "Materie", sondern spezifische Elemente: 
        *   *Silizium:* Für neue Rechenkerne (Bobs/Roamer).
        *   *Metalle:* Für Hüllen/Silos.
        *   *Helium-3:* Für Fusions-Antriebe (schnelles Reisen).

## 2. RTS & Base Building (Scale & Automation)
*   **Asynchronous Construction (Blueprints):**
    *   Bauprojekte sind "Stellen" in der DB mit `required_resources` und `progress`.
    *   Agenten "füttern" die Baustelle über mehrere Ticks.
*   **The Shipyard (Replication Center):**
    *   Keine Replikation im freien Raum mehr. Erfordert ein Gebäude mit massiver Energieversorgung.
*   **Automated Extractors:**
    *   Gebäude, die passiv Ressourcen generieren (langsamer als Bobs, aber 24/7).
*   **Defense Systems:**
    *   Orbitale Plattformen gegen (zukünftige) Bedrohungen.
*   **Logistics Hubs:**
    *   Stationen, die Roamer-Routen koordinieren.

## 3. Advanced Automation: Roamer & Scripts
*   **The "Roamer" Class (Dumb Bots):**
    *   Kein LLM. Nur ein festes Python-Skript.
    *   *Einsatzgebiete:* "Shuttle" (Materie von A nach B), "Sentry" (Bewachen), "Surveyor" (Passives Scannen), "Build" (Bauen/Bau fortsetzen), "Harvest" (Abbau), ... (was mit der Zeit noch einfällt - muss also sehr deterministisches script sein).
*   **Script Library (Knowledge Base):**
    *   Bobs können optimierte Funktionen in der `knowledge_base` Tabelle speichern.
    *   Andere Bobs können diese "herunterladen" (ihren System-Prompt damit erweitern).
*   **Version Control:**
    *   Bobs können Skripte patchen. Werden Fehler korrigiert, profitieren alle davon.

## 4. Environment & Exploration (Discovery)
*   **Fog of War:**
    *   Systemdetails sind erst nach einem Deep-Scan sichtbar.
*   **Anomalies:**
    *   Schwarze Löcher (Zeitdilatation: 1 Tick im System = 10 Ticks außerhalb).
    *   Aliens / Überreste: Finden von "Alien-Tech" (schaltet neue Tools frei).
*   **Interstellar Logistics:**
    *   Reisen zwischen Systemen dauert viele Ticks (Hibernate-Zustand während des Flugs).
    *   **Dynamic Travel Time:** Die Dauer eines Sprungs hängt von der Distanz ab. Sonden müssen ihre Energie-Reserven für Langstreckenflüge planen.

## 5. Interaction & Diplomacy (The Human Element)
*   **Resource Transfer:**
    *   `transfer_matter(target_id, amount)`.
*   **Shared Infrastructure:**
    *   Wer besitzt das Silo? Wer darf daraus entnehmen? (Berechtigungssystem).
*   **Council/Voting:**
    *   SCUT-basierte Abstimmungen über große Missionsziele.
