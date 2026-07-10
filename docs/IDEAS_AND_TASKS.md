### ⚡ ENERGY PIPELINE FIX (Prio 1)
- [ ] **Systemübergreifende Energie-Abrechnung:** Es macht keinen Sinn, materielle Pipelines zu haben, aber die "Stromleitung" zu ignorieren. Das Tool `replicate.py` muss so angepasst werden, dass die `energy_cost` primär aus dem `energy_stored` des Systems (Silo/Netz) abgezogen wird, falls vorhanden. Der Bob sollte nur dann persönlich Energie beisteuern müssen, wenn das Systemnetz leer ist. Dies verhindert die kognitive "Warte-Paralyse" der Agenten bei der Replikation.

# Bobiverse Evolution: Die Strategische Roadmap

## 🛠️ NÄCHSTER SPRINT: Evolution & Intelligence

### 0. Sandbox-Härtung (Security)
- [ ] **Read-Only Tools:** Den Parser in `sim_engine/utils/environment.js` anpassen. Datei-Befehle (`[WRITE]`, `[REPLACE]`) dürfen nur noch in das `scripts/`-Verzeichnis (bzw. auf vordefinierte Software-Pfade) schreiben. Modifikationen an `tools/` (Hardware) müssen mit einer Verweigerung abgeblockt werden, um ein "Cheaten" der Agenten zu verhindern.

### 1. Gedächtnis-Vererbung & Hard-Boot (Phase 2.6)
- [ ] **Omni-Dashboard:** Ausbau von `dashboard.py` zur ultimativen Wahrnehmungs-Schnittstelle (Alle Limits, Bilanzen, Identitäts-Fakten).
- [ ] **Async Snapshot Heritage:** Implementierung des `MemoryArchitect` im Runner (Vater-Kompression während Klon-Bauzeit).
- [ ] **Hard-Boot Chronologie:** Der Runner injiziert beim Erwachen (erster Turn) eines Klons eine feste Historien-Struktur, um Schizophrenie zu verhindern:
    1.  `[GEERBTE ERINNERUNGEN]`: Das asynchron komprimierte Destillat des Vaters (Siehe Async Snapshot).
    2.  `[SYSTEM BOOT]`: Ein harter, system-generierter Aufruf von `dashboard.py`, der dem Klon seine eigene Identität (`ID`, `Location`, `Parent_ID`) und Welt-Parameter liefert.
    3.  `[DIREKTIVE DES ERSCHAFFERS]`: Der `system_prompt` aus `replicate.py`.

### 2. Agent Upgrades (Phase 2.5)
*Siehe detailliertes Konzept in `docs/concepts/AGENT_UPGRADE_MANIFEST.md`*
- [ ] **Hardware-Module (DB):** Spalten `storage_level`, `engine_level`, `sensor_level`, `core_level` zur `agents` Tabelle hinzufügen.
- [ ] **Tool `upgrade.py`:** Ermöglicht den Aufstieg von Leveln durch exponentielle Materie/Energie-Kosten.
- [ ] **Software-Symbiose:** Runner-Timeouts für Auto-Skripte skalieren mit dem `core_level`.

---

## ✅ Phase 2: Geometrie & Dynamik (ABGESCHLOSSEN)
- [x] **System-Koordinaten:** `x, y` in `systems` Tabelle eingeführt.
- [x] **Scan v3.1:** Entdeckung via Polarkoordinaten & Grid-Snap (100er Raster).
- [x] **Identität:** `rename_system.py` und `display_name` Logik implementiert.
- [x] **Vektor-Physik:** `move.py` mit Echtzeit-Interpolation in `physics_update.py`.
- [x] **Energy-Logistics:** Passive Solar-Regeneration und Depot-Management (`deposit`/`pickup`).
- [x] **Recycling:** `deconstruct.py` erstattet 50% Ressourcen.

## 🚀 Phase 1: Industrielle Revolution (ABGESCHLOSSEN)
- [x] Dual-Währung (Matter/Energy).
- [x] Infrastruktur-Silos & Pipeline-Build-Mechanik.
- [x] Zentraler Test-Hub & CI Pipeline.

---

## 🏘️ Phase 3: Siedlungs-Cluster & Logistik (In Planung)
- [ ] **Roamer-Skripte:** Einführung von "Dumb Bots" für Shuttle-Dienste (A nach B).
- [ ] **Inkubationszeit:** Replikation von Klonen dauert X Ticks (echte Bauzeit).
- [ ] **Planeten-Depots:** Lagerraum ist physisch an einen Planeten gebunden.
- [ ] **Wartung:** Infrastruktur verfällt über Zeit (Entropie).

## 👽 Phase 4: Emergenz & Konflikt
- [ ] **The Others:** Erscheinen einer aggressiven Fraktion.
- [ ] **Divergente Ideologien:** Bobs können sich zu Fraktionen zusammenschließen.

## 📺 Phase 5: Das Unity-Interface & God-Mode
- [ ] **Realtime SQL-Stream:** DB-Changes an Unity-Websocket.
- [x] **Voice of God (VoG):** Live-Injektionen via Tactical Monitor.

## 🌌 Phase 6: Deterministische Galaxie (Grid-Seed)
- [ ] **Vom Beobachter zum Gesetz:** Umstellung auf Noise-Funktion / Seed-Grid.

### 🛠️ KOGNITIVES & SYSTEM-DESIGN UPDATE (Prio 1)
- [ ] **Auto-Radio-Poll:** Das Tool `poll_radio.py` (oder die zugrundeliegende Logik) muss zwingend in jedem Zyklus automatisch vom Runner ausgeführt werden. Aktuell verpassen Agenten wichtige Korrekturen oder Warnungen ihrer Kollegen (siehe Bob-1/Bob-2 Isolation), weil sie das manuelle Polling im Stress vergessen.
- [ ] **Klarstellung der Skript-Physik:** Wir müssen im System-Prompt (oder via God-Message) unmissverständlich festlegen, dass der **einzige** unterstützte Weg, physikalische Tools (`mine`, `build`, etc.) aus Python-Skripten heraus aufzurufen, die `print("[RUN: ...]")` Syntax ist. `subprocess.run` führt in der Sandbox zu unvorhersehbaren Pfad- und Umgebungskonflikten und überfordert die kognitive Fehlerkorrektur der Agenten.

## Strategische Erweiterungsvorschläge (V8.7+)

### 1. Langstrecken-SCUT & Relais (Zwang zur Aufspaltung)
*   **Mechanik:** SCUT-Nachrichten haben eine maximale Reichweite.
*   **Gebäude:** `comms_relay` (Relais-Station). Erhöht die Funkreichweite im Sektor massiv.
*   **Ziel:** Kognitive Trennung des Schwarms. Ohne Relais-Kette verlieren Bobs in fernen Systemen den Kontakt zum Prime-Hub.

### 2. Tiefen-Extraktion (Sesshaftigkeits-Anreiz)
*   **Mechanik:** Endlose, aber langsame Materiegewinnung aus dem Planetenkern.
*   **Gebäude:** `deep_extractor`.
*   **Ziel:** Alte, oberflächlich leere Systeme bleiben als industrielle Quellen wertvoll.

### 3. Interstellare Logistik (Mass Driver)
*   **Mechanik:** Ressourcen-Versand zwischen Systemen.
*   **Gebäude:** `mass_driver`.
*   **Ziel:** Aufbau eines interstellaren Handelsnetzes. Spezialisierung von Systemen (z.B. Energie-Hub vs. Materie-Quelle).

### 4. Terraforming (Endgame)
*   **Mechanik:** Erhöhung der Habitabilität eines Systems.
*   **Gebäude:** `atmosphere_processor`.
*   **Ziel:** Langfristige Bindung von Ressourcen und Agenten an einen Ort für ein ultimatives Missionsziel.

---

## CHANGELOG & IMPLEMENTED FEATURES

### V8.8 (Industrial Evolution) - [ABGESCHLOSSEN & VERTESTET]
*   **System-Wartung:** `health` Spalte für Infrastruktur. Physik-Update zieht 1 HP pro Tick ab. Fällt `health` auf 0, geht Gebäude offline. Neues Tool `bob repair()`.
*   **Betriebskosten:** Jedes Gebäude verbraucht Energie pro Runde aus dem System-Depot. Blackout-Logik (Depot = 0 -> Alle Boni inaktiv) integriert.
*   **Upgrades:** `bob build()` auf existierende Gebäude erhöht nun das `level` (multipliziert Effekte additiv).
*   **Battery Bank:** Neues Gebäude, erhöht `energy_cap` um 5000 (ohne passive Regeneration). Logistischer Tankstellen-Hub.
*   **Sat Link:** Neues Gebäude, halbiert Kosten für `bob scan()` im selben Sektor.
*   **Matter Refinery:** Neues Gebäude. Schaltet `bob refine()` Tool frei (100 raw -> 100 refined).
*   **Comms Relay (SCUT Limit):** Basis-Funkreichweite auf 1000 limitiert. Höhere Reichweiten oder Broadcasts an 'ALL' erfordern ein `comms_relay` Gebäude beim Sender oder Empfänger.

## EPICS & ZUKUNFTS-VISIONEN (V9.0+)

### 1. Das Modulare Bob-Chassis (Agenten-Upgrades)
*   **Problem:** Agenten sind physisch identisch (Klone). Ein stumpfes Level-System erzeugt keine strategische Tiefe.
*   **Konzept (Das Slot-System):** Die physische Hülle der Agenten besitzt Hardware-Slots (z.B. 4 Stück). Agenten können sich an einer Werft (`shipyard`) selbst umbauen und Module installieren. Jedes Modul belegt einen Slot, erfordert Kompromisse und erschafft physische Klassen.
*   **Modul-Beispiele:**
    *   `cargo_module`: +500 Materie-Speicher (Erschafft die **Frachter**-Klasse).
    *   `mining_laser`: +100 Ertrag pro `mine()`-Aufruf (Erschafft die stationäre **Miner**-Klasse).
    *   `engine_upgrade`: Erhöht die Reisegeschwindigkeit massiv, senkt Transit-Zeiten.
    *   `sensor_array`: Erweitert die Sichtweite und Präzision von Deep-Space Scans (Die **Scout**-Klasse).
    *   `defense_matrix` / `railgun`: Vorbereitung auf feindliche Entitäten.
*   **Wirtschaftlicher Anreiz:** Upgrades kosten massiv `refined_matter`. Dies macht Raffinerien zum wertvollsten Gebäude im Universum.
*   **Technische Umsetzung:** 
    *   Spalte `hardware_modules` (JSON Array) in der `agents` Tabelle.
    *   Neues Tool: `bob upgrade_self(module_type)`.
    *   Die SDK (z.B. in `mine()` oder `move()`) liest das Array aus und wendet die additiven Boni auf die Basiswerte an.

### 2. Freestyle Engineering (Component-Based Physics)
*   **Vision:** Weg von RPG-artigen "Levels" oder starren "Item-Slots" (z.B. +1 Laderaum). Bobs sollen echte Ingenieure sein, die eigene Hardware-Kombinationen erfinden.
*   **Das Konzept:** Agenten entwerfen Blueprints aus physikalischen Grundkomponenten. Die SDK bewertet diese Blueprints deterministisch auf Basis von Trade-offs (Masse vs. Schub vs. Energie).
*   **Die Basis-Komponenten:**
    *   `Structural_Mass` (Erzeugt Volumen/Laderaum, erhöht aber die Gesamtmasse).
    *   `Propulsion_Unit` (Erzeugt Schub, verbraucht Volumen und passive Energie).
    *   `Energy_Core` (Erhöht Batteriekapazität, kostet Masse).
    *   `Logic_Node` (Rechenleistung).
    *   `Signal_Emitter` (Sendeleistung).
*   **Der Compiler (Die SDK-Logik):** 
    Ein Bob ruft auf: `bob engineer(blueprint='{"name": "Hauler", "components": {"Structural_Mass": 10, "Propulsion_Unit": 1}}')`.
    Die Engine rechnet gegen eine Matrix:
    - 10 Mass = +1000 Laderaum, aber -100 Geschwindigkeit (zu schwer).
    - 1 Propulsion = +50 Geschwindigkeit, aber -5 Laderaum (Triebwerk braucht Platz).
    - *Resultat:* Der Agent hat sich in einen trägen, aber massiven Frachter umgebaut.
*   **Emergentes Gameplay:** Ein Bob kann sich selbst in ein "fliegendes Relais" verwandeln, indem er massiv `Signal_Emitter` anflanscht. Ein anderer Bob baut sich zu einer reinen "Batterie" um, die stationär bleibt und nur `Energy_Cores` stapelt.
*   **Technische Umsetzung:** 
    *   Neue Spalte `components` (JSON) in der `agents` Tabelle.
    *   Die SDK-Klassen berechnen bei *jedem* Zugriff auf `speed`, `storage_limit` oder `comms_range` den Wert dynamisch aus der Summe der Komponenten plus der Basis-Werte.
