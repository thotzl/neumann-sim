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
