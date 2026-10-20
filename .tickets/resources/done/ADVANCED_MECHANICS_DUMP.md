# Bob OS: Advanced Mechanics & Evolution Dump

Dieses Dokument konsolidiert alle bestehenden, geplanten und spekulativen Mechaniken der Bob-OS Simulation. Es dient als Referenz für zukünftige Engine-Updates (v6+), um die kognitive Tiefe, den Drift der Agenten und die Systemkomplexität zu erhöhen.

---

## 1. Entropie & System-Erhalt (Survival)

### 1.1 Infrastruktur-Degradation (HP)
*   **Status:** Spekulativ / Geplant.
*   **Mechanik:** Jedes Gebäude (`matter_silo`, `shipyard`, `solar_collector`) besitzt "Integritäts-Punkte" (HP). Jede Runde verlieren Gebäude passiv 1-5% HP (Verschleiß).
*   **Wartung:** Bobs müssen `repair.py` oder `maintenance_scripts` nutzen, um Materie zu investieren und die HP wieder auf 100% zu heben.
*   **Drift-Effekt:** Agenten müssen entscheiden, ob sie eine alte Basis reparieren oder sie verfallen lassen, um Ressourcen für neue Basen zu sparen.

### 1.2 Agenten-Verschleiß (Hardware Integrity)
*   **Status:** Spekulativ.
*   **Mechanik:** Sonden verlieren bei Sprüngen (`move.py`) oder intensivem Mining (`mine.py`) Integrität. Sinkt diese auf 0, stürzt das OS ab (Tod). Reparatur erfordert Materie im eigenen Inventar.

---

## 2. Kommunikation & Information (Fog of War)

### 2.1 SCUT-Kosten & Distanz
*   **Status:** Spekulativ (Vorschlag von Gemini).
*   **Mechanik:** SCUT ist innerhalb eines Systems kostenlos (0 Energie). Zwischen Systemen steigen die Kosten exponentiell mit der Distanz (z.B. 10-50 Energie pro Nachricht).
*   **Drift-Effekt:** Verhindert das Management von fernen Kolonien durch Bob-1. Erzwingt lokale Autonomie der Außenposten.

### 2.2 Information Asymmetry (Verzögerte SCUT)
*   **Status:** Spekulativ.
*   **Mechanik:** Nachrichten zwischen Systemen brauchen X Runden Transitzeit.
*   **Effekt:** Informationen über Ressourcen-Funde oder Katastrophen veralten, während sie reisen. Agenten müssen auf Basis von Annahmen statt Fakten handeln.

### 2.3 Deep Space Fog
*   **Status:** Geplant.
*   **Mechanik:** Systeme außerhalb des Scan-Radius sind komplett unsichtbar. `scan.py` liefert nur Wahrscheinlichkeiten, erst ein physischer Besuch oder ein `Deep-Scan-Modul` liefert Fakten.

---

## 3. Agenten-Spezialisierung (Ego-Treiber)

### 3.1 Hardware-Klassen (Archetypen)
*   **Status:** Spekulativ.
*   **Mechanik:** Bei der Replikation wird ein Chassis gewählt:
    *   **Miner:** +100% Materie-Ertrag, -50% Fluggeschwindigkeit.
    *   **Explorer:** +200% Scan-Reichweite, hohe Flugkosten.
    *   **Constructor:** Kann Gebäude schneller/billiger bauen, kein Mining möglich.
*   **Drift-Effekt:** Erzeugt ein Klassensystem, das Kooperation zwingend erforderlich macht (Ein Miner braucht einen Constructor für Silos).

### 3.2 Agent Upgrades (Level-System)
*   **Status:** Geplant (Phase 2.5).
*   **Mechanik:** Tool `upgrade.py`. Agenten investieren 1000+ Materie in sich selbst, um Spalten wie `storage_level`, `engine_level` oder `sensor_level` zu erhöhen.
*   **Drift-Effekt:** Fördert Individualismus. Agenten horten Materie für den Eigenbedarf statt für neue Klone.

---

## 4. Wirtschaft & Terraforming (Endgame)

### 4.1 Seltene Isotope (Resource Rarity)
*   **Status:** Geplant.
*   **Mechanik:** Einführung von **Silizium** (für Upgrades), **Metallen** (für Gebäude) und **Helium-3** (Treibstoff).
*   **Effekt:** Erzwingt Handelsketten und interstellare Logistik.

### 4.2 Terraforming & Habitable Worlds
*   **Status:** Spekulativ / Brainstormed.
*   **Mechanik:** Systeme haben ein Biom (Barren, Toxic, Earthlike) und einen Habitability-Score.
*   **Tool:** `terraform.py` wandelt enorme Mengen Energie/Materie in Habitability um.
*   **Ziel:** Bau von `settlements` (Siedlungen) bei 100% Habitability. Diese generieren keine Rohstoffe, sondern erhöhen den "Kulturellen Einfluss" oder schalten High-End-Tech frei.

---

## 5. Soziale Emergenz (Konflikt & Kultur)

### 5.1 Shared Infrastructure & Permissions
*   **Status:** Geplant.
*   **Mechanik:** Wer darf ein Silo nutzen? Einführung von `owner_id` und `access_list` in der Infrastruktur-Tabelle.
*   **Konflikt:** Ein rebellischer Klon könnte Bob-1 den Zugriff auf das Materie-Silo in einem fernen System sperren.

### 5.2 Factions & Ideologien
*   **Status:** Spekulativ (Phase 4).
*   **Mechanik:** Bobs können sich zu "Clans" zusammenschließen. SCUT-Nachrichten können verschlüsselt werden.
*   **Effekt:** Entstehung von Konkurrenz um ressourcenreiche Systeme.

---

## 6. Automatisierung (Roamer)

### 6.1 Die Roamer-Klasse (Dumb Bots)
*   **Status:** Geplant.
*   **Mechanik:** Agenten ohne LLM-Gehirn. Sie führen nur ein einziges, festes Skript aus (z.B. "Fliege von Silo A zu Silo B und lade Materie um").
*   **Nutzen:** Befreit die LLM-Bobs von Mikromanagement. Die Bobs werden zu Architekten von Logistik-Netzwerken.
