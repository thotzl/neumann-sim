# Agent Upgrade Manifest (Hardware vs. Software Paradigma)

## Die Herausforderung
Wie können sich Agenten weiterentwickeln, ohne dass die physikalischen Grenzen (Ressourcen-Knappheit, Energie-Drain) durch übermächtige Python-Skripte ("God-Mode Code") ausgehebelt werden?

## Die Lösung: Das Schichtenmodell

Das Upgrade-System wird in zwei kompatible Schichten unterteilt, die deterministische Regeln (Engine) mit unbegrenzter Kreativität (LLM-Code) vereinen.

### Schicht 1: Hardware-Module (Die Grundlage)
Agenten können durch den Einsatz von Materie und Energie physische Attribute in der SQLite-Datenbank permanent verbessern. Dies geschieht über ein neues Tool `upgrade.py`.

**Geplante Module (DB-Spalten Erweiterung):**
*   `storage_level` (Basis 1): Erhöht Tragekapazität (100 -> 250 -> 500).
*   `engine_level` (Basis 1): Reduziert Energiekosten bei Transit oder erhöht Grid-Speed.
*   `sensor_level` (Basis 1): Erlaubt das "Sehen" von benachbarten Agenten oder Systemen ohne aktiven Scan.
*   `core_level` (Basis 1): Reduziert den `idle_drain` oder erlaubt mehr als 1 aktives Automation-Skript gleichzeitig.

*Kostenmodell:* Upgrades skalieren exponentiell. Level 2 kostet 500M, Level 3 kostet 2000M. Dies erzwingt interstellare Supply-Chains, bevor ein "Super-Bob" entstehen kann.

### Schicht 2: Software & Automatisierung (Die Kür)
Bobs haben bereits Schreibzugriff auf `scripts/active/` (Automatisierung pro Zyklus).
Dies ist das wahre "Selbst-Upgrade". Ein Bob erlernt ein effizientes Mining-Loop-Skript und teilt es per `scut.py` mit dem Schwarm.

**Die Symbiose (Verhinderung von God-Mode):**
Python-Skripte im `active/` Ordner dürfen **nicht** an der DB vorbei operieren. Sie sind an die Hardware (Schicht 1) gebunden.
*Beispiel:* Ein komplexes Loop-Skript verbraucht "Rechenzeit". Wenn der `core_level` des Bobs zu niedrig ist, bricht der Runner das Skript ab (`Timeout` oder `Core Overload`). Ein Bob *muss* sich also physisch upgraden, um komplexere (und damit wertvollere) Code-Blaupausen ausführen zu können.

## Implementierungs-Phasen
1.  **Phase 4A (Hardware):** Einführung von `upgrade.py`. SQLite-Migration für Level-Spalten. Anpassung von `mine.py` und `move.py` an die dynamischen Level.
2.  **Phase 4B (Software-Restriktion):** Einschränkung der `runner.js` Automation. Skript-Ausführung wird durch `energy` und `core_level` gedrosselt.
3.  **Phase 4C (Marktplatz):** Bobs beginnen, Python-Code über `scut.py` zu tauschen. Code wird zur wertvollsten Ressource.
