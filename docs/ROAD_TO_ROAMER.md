# Road to Roamer: Architecture Evolution Whitepaper

Dieses Dokument skizziert die schrittweise Transformation des Bob-OS von einer "Shell-Skripting-Sandbox" zu einem sicheren, objektorientierten Multi-Agenten-Betriebssystem. Ziel ist es, den "O(N²)-Energie-Vampir"-Bug zu beheben, die Tool-Sicherheit (Identity Verification) zu gewährleisten und die Grundlage für autonome, physische Sub-Agenten ("Roamer") zu schaffen.

---

## Ausgangslage (Der Ist-Zustand in V6.x)

Aktuell basiert die Simulation auf einer fehleranfälligen und unsicheren Architektur:
*   **Tool-Aufrufe (CLI):** Bobs nutzen rohe Python-Skripte (`python3 tools/mine.py Bob-1`). Die Identität (`Bob-1`) wird als reiner String übergeben und vom Tool nicht auf Berechtigung geprüft ("Spoofing" ist möglich).
*   **Automatisierung (Scripts):** Skripte in `_verse/scripts/active/` sind global. Der Runner führt *alle* Skripte in *jedem* Zug *jedes* Agenten aus. Dies führt zu O(N²) Redundanz und massivem, unbeabsichtigtem Energieabzug (Der "Vampir-Bug").
*   **Sicherheit:** Bobs schreiben echtes Python (`[WRITE: ...]`). Es gibt keine Sandbox. Theoretisch könnten sie das Host-System mit `import os` kompromittieren.
*   **Kognitive Last:** Bobs scheitern regelmäßig an Bash-Syntax (verschachtelte Anführungszeichen) und Parameter-Reihenfolgen in den `[RUN]`-Tags.

---

## Phase 1: Konsolidierung & Die System-Runde (Bugfix)
*Fokus: Behebung der akuten Bugs, Sicherheit und Entkoppelung der Automatisierung.*

### 1.1 Die Unified Bob Command Line (UBCL) & SDK
*   **Abbau der Einzel-Tools:** Der Ordner `tools/*.py` wird aufgelöst.
*   **Zentraler Entrypoint:** Es gibt nur noch ein zentrales CLI-Kommando (`bob`). Aus `[RUN: python3 tools/mine.py Bob-1]` wird `[RUN: bob mine]`.
*   **Die Bob-SDK:** Einführung einer Library (`core/lib/bob_sdk.py`), die von manuellen Aufrufen und Skripten gleichermaßen genutzt wird. Syntax ist identisch (Befehl vs. Methode).
*   **Identity Verification:** Der Runner ermittelt die ID des aktiven Akteurs (Bob oder Roamer) und injiziert sie sicher. Das Spoofing fremder Identitäten wird physikalisch unmöglich.

### 1.2 Die System-Runde (Lösung des N²-Bugs)
*   **Ablauf-Änderung:** Automatisierungsskripte laufen nicht mehr während des Zugs eines Agenten. Der Runner führt stattdessen am Ende jedes Zyklus eine **einmalige System-Runde** aus.
*   **Rundentakt:** Jedes Skript wird exakt **1x pro Runde** ausgeführt, unabhängig von der Anzahl der Agenten.

### 1.3 Ownership & Ressourcen-Quelle
*   **ACL-Bindung:** Jedes Skript wird über die Access Control List einem `creator_id` (Besitzer) zugeordnet. 
*   **Energie-Abrechnung:** Skripte in dieser Phase ziehen die Energie standardmäßig von der Batterie ihres Besitzers ab. Ist der Besitzer nicht im System oder die Batterie leer, bricht das Skript ab.
*   **Firewalling:** Der Runner blockiert Skripte mit verbotenen Imports (`os`, `sqlite3`).

---

## Phase 2: Sensorik & Beobachtbarkeit (Visuelle Abstraktion)
*Fokus: Ersetzen von "Gott-Sicht" und technischem Log-Abhören durch immersive Wahrnehmung.*

### 2.1 Hardware-Sensoren & FS-Tools
*   Da natives Python (`os.listdir`) blockiert ist, erhalten Bobs Tools wie `bob fs` (File System Scan) und `bob ps` (Prozess-Monitor), um ihre Umgebung sicher zu untersuchen.

### 2.2 Abstrahierte Beobachtung (Visual Log)
*   Bobs im gleichen System erhalten keine Detail-Logs fremder Skripte mehr. Stattdessen generiert die Engine **visuelle Ereignisse**:
    *   *"Du beobachtest 'Harvester_A' (Besitzer: Bob-1) beim Transfer von Materie."*
    *   *"Ein Skript von Bob-2 dockt an das Silo an."*
*   Dies emuliert visuelle Beobachtung und ersetzt das Mitlesen von Standard-Output.

### 2.3 Privacy Patch (Dashboard)
*   Fremde Inventar-Daten (Energie/Materie) werden im Dashboard ausgeblendet. Dies erzwingt SCUT-Kommunikation für Status-Updates.

---

## Phase 3: Virtuelle Roamer (Autarkie-Stufe 1)
*Fokus: Die Entkopplung von Besitzer-Batterie.*

### 3.1 System-gebundenes Deployment
*   Skripte können als "System-Skripte" markiert werden. Sie laufen auch weiter, wenn der Besitzer das System verlässt.
*   **Ressourcen-Wechsel:** Ein System-Skript (Proto-Roamer) kann so konfiguriert werden, dass es Energie direkt aus dem **System-Depot (`energy_stored`)** statt vom Besitzer bezieht.

---

## Phase 4: Physische Roamer (Die autonomen Maschinen)
*Fokus: Einführung der Roamer als echte, mobile Objekte.*

### 4.1 Roamer als Datenbank-Entität
*   **Physischer Körper:** Roamer erhalten DB-Einträge mit eigener `location`, `energy` und einem **eigenen Inventar (Storage)**.
*   **Logistik-Fähigkeit:** Roamer können eigenständig `move` Befehle ausführen, um Ressourcen zwischen Systemen zu transportieren.
*   **Programming (Flashen):** Ein Bob "flasht" ein SDK-basiertes Skript auf den Roamer. Die Engine verifiziert über die ACL, ob der Bob dazu berechtigt ist.

---

# Das Wrapper-Konzept (Die Programmier-Schnittstelle)

Die `bob_sdk` liefert die Architektur-Klassen, die den Scope und die Ressourcen-Quelle definieren.

### 1. AutoScript Wrapper (Phase 1-3)
*   **Logik:** Läuft 1x pro System-Runde.
*   **Energie:** Zieht vom Bob (Owner).
*   **Scope:** Hat Zugriff auf die Sensoren des Bobs.

### 2. Roamer Wrapper (Phase 4)
*   **Logik:** Läuft 1x pro System-Runde.
*   **Energie:** Zieht aus der Batterie des Roamer-Objekts.
*   **Inventar:** Nutzt `self_entity.storage` (den physischen Tank der Drohne).
*   **Beispiel:**
    ```python
    from bob_sdk import Roamer, hardware
    
    class AutomatedTransporter(Roamer):
        def on_tick(self, drone):
            if drone.storage.matter >= 50:
                hardware.move("Alpha_Centauri")
                hardware.deposit("silo", "matter", 50)
    ```
