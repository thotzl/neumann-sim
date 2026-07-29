# 🚢 EPIC 2 POST-IMPLEMENTATION SPECIFICATION: SHIPS, MINDS & CAD ENGINEERING

Dieses Dokument dokumentiert die abgeschlossene, fundamentale Umstellung des Simulations-Core auf das "Geist & Hülle" Paradigma (v10.5+). Es verknüpft die relationale Entkopplung der Replicanten mit dem unbestechlichen physikalischen CAD-Evaluations-Regelwerk.

---

## 1. Zielsetzung & Historie
In frühen Versionen der Simulation waren Replicanten untrennbar mit "fliegenden Sonden-Punkten" verknüpft. Epic 2 vollzog die fundamentale Umstellung der Engine:
1. **Der Geist (Software):** Wird vollständig von physischen Hüllen entkoppelt und existiert als Software-CPU in Datenbanken oder Systemnetzwerken.
2. **Die Hülle (Hardware):** Ein physikalisches Schiff-Objekt im Raum mit Masse, Schubkraft, Batterien und Spezialwerkzeugen, das frei konstruiert werden kann.

---

## 2. Die Software-Vessel Entkopplung
Replicanten können Schiffe betreten, fliegen, verlassen oder als reine Disembodied Minds in lokalen Sektor-Netzwerken (`sem_matrix`) verbleiben.
- **Dynamic Context Verification (`agent_service.py`):** Das System berechnet Koordinaten, Reichweiten und Inventare dynamisch basierend auf dem aktuellen Trägersystem. Ein disembodied Bob kann keine physischen Aktionen (`mine()`, `move()`) auslösen – diese werden über harten Decorator-Schutz (`allow_disembodied=False`) abgefangen.

---

## 3. Freestyle CAD-Engineering & Physik-Core
Schiffe werden nicht mehr als statische Typen gekauft, sondern von den Agenten selbst entworfen:
- **CAD-Simulation (`me.design_blueprint`):** Agenten übergeben eine 2D-Modulmatrix. Der Physik-Evaluator berechnet Masse, Schubkraft, Energiehaushalt und Höchstgeschwindigkeit der Konstruktion und gibt Baukosten-Angebote sowie Konstruktionsfehler zurück.
- **Asynchroner Bau (`me.build_ship`):** Ermöglicht schrittweise Zahlungen in Sektor-Werften, wodurch große Schiffsklassen über mehrere Zyklen hinweg kooperativ finanziert werden können.

---

## 4. Beteiligte Core-Tickets (Schnittstellen-Verknüpfung)
Sämtliche Meilensteine dieses Epics sind vollständig implementiert und über folgende Tickets versioniert:
- **`[TCK-DONE-001]` Separation of Bob & Vessel (Host-Decoupled Software)** ([Link](../../.tickets/closed/TCK-DONE-001-bob-vessel-separation.md))
- **`[TCK-DONE-004]` Persistent CAD Blueprints & Shipyard Construction** ([Link](../../.tickets/closed/TCK-DONE-004-cad-blueprints-shipyard.md))
- **`[TCK-DONE-010]` Modular LLM-Connector-Layer & AI-Bridge** ([Link](../../.tickets/closed/TCK-DONE-010-modular-llm-connector.md))
