# Bobiverse Evolution: Die Strategische Roadmap

## 🛠️ NÄCHSTER SPRINT: Geometrie & Recycling

### 1. Interstellare Geometrie (Schrödinger-Modell)
- [ ] **System-Koordinaten:** `x, y` in `systems` Tabelle. 
- [ ] **Scan v3.0:** Entdeckung via Polarkoordinaten relativ zum Bob (Radius 500-1500).
- [ ] **Grid-Snap:** Koordinaten werden auf 100er-Raster gerundet (Vorbereitung für Grid-Seed).
- [ ] **ID-Logik:** Primary Key wird `SYS-X[x]-Y[y]`.
- [ ] **Display Name:** Neues Feld für Bob-Benennung. Initial-Name ist NULL (ID wird angezeigt).
- [ ] **Frontend-Update:** `App.tsx` nutzt echte Koordinaten statt Hash-Werte.
- [ ] **System-Renaming:** Tool `rename_system.py` zur sicheren Umbenennung via SQL-Transaktion.
- [x] **Dynamische Logistik (Physik v3.1):** 
    - **Transit-Aktivität:** Agenten im Flug bleiben aktiv. Sie können funken oder analysieren.
    - **Positions-Interpolation:** `physics_update.py` berechnet `current_x/y` pro Tick basierend auf Flugdaten.
    - **No-Lock Move:** `move.py` mit informativer Warnung statt harter Sperre bei Energiemangel (Guppy-Style).
    - **Energy-Drain:** -5 Energie pro Tick im Transit (keine Solar-Regeneration).

### 2. Kreislaufwirtschaft (Quick Win)
- [x] **Abbau-Bonus:** Ein Tool `deconstruct.py` erlaubt den Rückbau von Infrastruktur und erstattet 50% der Materie-Kosten zurück in das System-Silo.

## 🚀 Phase 1: Industrielle Revolution (Abgeschlossen)
- [x] Dual-Währung (Matter/Energy).
- [x] Speicher-Engpässe (Silos nötig).
- [x] Infrastruktur-Tools (Solar_Collector, Silo, Shipyard).
- [x] System-Depots & Pipeline-Build-Mechanik.
- [x] Zentraler Test-Hub & CI Pipeline.

## 🧬 Phase 2: Software-Evolution & Patches
- [ ] **Modulares Skripting:** Bobs schreiben Wrapper, die sie signieren und anderen Bobs zum "Download" (SQL-Query) anbieten.
- [ ] **Tech-Tree:** Bestimmte Tools (z.B. `terraform_v2.py`) müssen erst durch Materie-Einsatz "erforscht" werden.
- [ ] **Compiler-Constraints:** Agenten können nur Skripte ausführen, die sie selbst geschrieben haben oder die in der `knowledge_base` validiert wurden.

## 🏘️ Phase 3: Siedlungs-Cluster & Logistik
- [ ] **Roamer-Skripte:** Einführung von "Dumb Bots" für Shuttle-Dienste (A nach B), Sentry (Bewachen) oder Surveyor (Passives Scannen).
- [ ] **Planeten-Depots:** Lagerraum ist physisch an einen Planeten gebunden, nicht mehr abstrakt am System.
- [ ] **Wartung:** Infrastruktur verfällt über Zeit (Entropie). Bobs müssen Reparatur-Zyklen einplanen.

## 👽 Phase 4: Emergenz & Konflikt
- [ ] **The Others:** Erscheinen einer aggressiven Fraktion mit simplen, aber massiven Vermehrungsregeln (Bedrohung der Ressourcen).
- [ ] **Divergente Ideologien:** Bobs können sich zu Fraktionen zusammenschließen (z.B. "Gamer" vs. "Starfleet") und den Zugriff auf Systeme verweigern.
- [ ] **Deep-Space Relays:** Aufbau eines Netzwerks, um Nachrichten über weite Distanzen verzögerungsfrei zu senden.

## 📺 Phase 5: Das Unity-Interface & God-Mode
- [ ] **Realtime SQL-Stream:** Ein Node.js Service, der DB-Changes an einen Unity-Websocket pusht.
- [ ] **Visualizer:** 3D Darstellung der Planeten-Entwicklung und der Sonden-Bewegungen.
- [x] **Voice of God (VoG):** Live-Injektionen via Tactical Monitor (Middleware & File-Injection).

## 🌌 Phase 6: Deterministische Galaxie (Grid-Seed)
- [ ] **Vom Beobachter zum Gesetz:** Umstellung auf Noise-Funktion / Seed-Grid für absolute Konsistenz.
- [ ] **Performance-Sektor-Loading:** Vorberechnung von ganzen Sektoren für weite Scans.

## 🕰️ Legacy / On-Hold (Reaktivierung bei Bedarf)
- [ ] **Mortalität:** Alterstod in `physics_update.py` (Alter = tick - birth_cycle).
- [ ] **Tick-Pressure:** Dynamische Injektion des Zeitfortschritts (z.B. "Runde 90/1000") in den System-Prompt.
- [ ] **Finish-Signal:** `[ABBRUCH]` Instruktion für Agenten bei Missionserfüllung.
