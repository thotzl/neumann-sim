# SDK Future Tasklist (Post-V7.0)

Dieses Dokument sammelt alle fortgeschrittenen Architektur-Konzepte für die `bob_sdk`, die *nach* dem erfolgreichen Drop-in-Replacement der Kern-Tools implementiert werden sollen.

### 1. Das Wrapper-System (Roamer & AutoScripts)
- [ ] **Klasse `AutoScript`:** Basisklasse in der SDK, von der Bobs erben können.
  - Implementiert `on_tick(self, me)`.
  - Der Runner ruft registrierte AutoScripts in der System-Runde auf.
- [ ] **Klasse `Roamer`:** Basisklasse für physische Drohnen.
  - Überschreibt `self_entity`, sodass Hardware-Befehle vom Roamer-Objekt (DB) statt vom Bob abgezogen werden.
  - Gibt Zugriff auf `self_entity.storage` (separater Tank für Roamer).

### 2. Event-Driven Architecture (Callbacks)
- [ ] **Listener-Methoden:** Bobs sollen in ihren Skripten auf Ereignisse reagieren können, ohne manuell zu pollen.
  - `on_message_received(self, sender, msg)`
  - `on_energy_critical(self, current_energy)`

### 3. Fortgeschrittene Sensor-Abstraktionen
- [ ] **`sensors.deep_space()`**: Eine Methode, die das alte `scan.py` ersetzt, aber Ergebnisse als Python-Dictionaries (`[{system: 'SYS-X', distance: 100}]`) zurückgibt.
- [ ] **Hardware/Sensor-Limits:** Sensor-Aufrufe an das zukünftige `sensor_level` (Agent Upgrades) koppeln (z.B. Sichtweite).

### 4. Das UBCL (Unified Bob Command Line) Tooling
- [ ] Ein zentrales CLI-Skript `bob_os/bin/bob` schreiben, das manuelle `[RUN: bob ...]` Befehle direkt auf die Methoden der `bob_sdk` mappt, um die Einzeldateien in `_verse/tools/` final löschen zu können.