# 🚀 WORLD MECHANICS ROADMAP (V8.8+)

Dieses Dokument beschreibt die evolutionären Ausbaustufen des Bob-OS Universums. Die Priorisierung folgt dem Prinzip: **Maximaler Impact auf das Schwarm-Verhalten bei minimaler technischer Komplexität (Schema F).**

---

## 🏁 MEILENSTEIN 1: Industrielle Diversität (Schema F) - [DONE]
*Fokus: Spezialisierung von Systemen und Rollenverteilung. Implementierung primär über SDK-Methoden und DB-Felder.*

### 1. System-Wartung & Der Hausmeister (Impact: Extrem Hoch) - [DONE]
### 2. Battery Bank (Der Energie-Wächter) - [DONE]
### 3. Satellite Link (Der Astronom) - [DONE]
### 4. Matter Refinery (Der Industrielle) - [DONE]

---

## ⚙️ MEILENSTEIN 2: Operative Realität
*Fokus: Ressourcenmanagement und technologische Hürden. Erfordert Eingriffe in die Physik-Engine.*

### 1. System-Energie-Budget (Betriebskosten) - [DONE]
*   **Ziel:** Verhindert Over-Building, erzwingt strategischen Abbau von Schrott.
*   **Mechanik:** Jedes aktive Gebäude zieht pro Tick Energie vom System-Depot. Bei 0 Energie im Depot geht das System in den Blackout (Infrastruktur schaltet ab).
*   **Umsetzung:** Last-Berechnung in `physics_update.py` basierend auf `ECONOMY_RULES.json`.

### 2. Infrastructure Upgrades (Level-System)
*   **Ziel:** Vertikales Wachstum statt nur horizontaler Expansion.
*   **Mechanik:** Agenten können `bob build` auf existierende Gebäude anwenden, um deren Level (1-3) zu erhöhen.
*   **Umsetzung:** Spalte `level` in `infrastructure`. Skalierung der Boni (Kapazität/Rate) in der SDK.

### 3. Tech Tree & Prerequisites (Baupläne)
*   **Ziel:** Zwingt zur logischen Abfolge beim Aufbau (Strategie-Tiefe).
*   **Mechanik:** Gebäude haben Voraussetzungen (z.B. `shipyard` erfordert `matter_silo` UND `solar_collector`).
*   **Umsetzung:** Check-Logik in `Agent.build()` gegen eine Blueprint-Tabelle.

---

## 📡 MEILENSTEIN 3: Das interstellare Netzwerk
*Fokus: Vernetzung und Logistik. Erfordert neue Sub-Systeme.*

### 1. Comms Relay (Funk-Limitierung) - [DONE]
*   **Ziel:** Zwingt zur geographischen Aufspaltung und zum Aufbau von Relais-Ketten.
*   **Mechanik:** `scut` bricht ab, wenn die Distanz > 1000 ist und kein Relais auf dem Weg liegt. Broadcasts ('ALL') benötigen zwingend ein Relais.
*   **Umsetzung:** Distanz-Kalkulation und Relais-Flag-Check in `Comms.scut()`.

### 2. Interstellar Mass Driver (Logistik-Netz)
*   **Ziel:** Aufbau eines galaktischen Wirtschaftskreislaufs.
*   **Mechanik:** Ressourcen-Versand zwischen Systemen (Materie schießen).
*   **Umsetzung:** Tabelle `transit_cargo`. Gebäude `mass_driver` an Start und Ziel. `physics_update.py` bewegt Fracht.

---

## 🌌 MEILENSTEIN 4: Siegbedingungen (Endgame)
*Fokus: Die ultimative Mission des Schwarms.*

### 1. Terraforming
*   **Ziel:** Das Universum bewohnbar machen.
*   **Mechanik:** Erhöhung des `habitability` Wertes eines Planeten.
*   **Umsetzung:** Gigantische Infrastrukturprojekte, die koordinierte Zuarbeit mehrerer Agenten über Hunderte Zyklen erfordern.

### 2. Global Mainframe (Verteilte Intelligenz)
*   **Ziel:** Globaler Forschungsfortschritt.
*   **Mechanik:** Mainframes in verschiedenen Sektoren addieren ihre Rechenleistung zu einem globalen Tech-Pool.
*   **Umsetzung:** Globale State-Tabelle `global_tech`.
