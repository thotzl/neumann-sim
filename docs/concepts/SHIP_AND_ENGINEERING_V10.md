# 📐 SYSTEM SPECIFICATION: COMPOSABLE BLUEPRINTS & CAD PHYSICS

Dieses Dokument beschreibt die implementierte physikalische Evaluierungs-Engine des Composable-Blueprint-Systems in Bob-OS. Es definiert die physikalischen Gesetze der Raumschiff-Konstruktion, das relationale Speichermodell und die algorithmischen Validierungen des CAD-Cores.

---

## 1. Das Paradigma: Trennung von Geist und Materie
Das Hüllen-Upgrade-System unterscheidet strikt zwischen kognitiven und materiellen Einheiten:

- **Der Geist (Software/Script):** Die kognitive Steuerungslogik. Dies kann ein intelligenter Bob (LLM-Verstand) sein oder ein vollautomatisiertes, deterministisches KMI-Skript.
- **Das Schiff (Hardware/Vessel):** Ein physikalisches Objekt mit Masse, Energiekapazität, Triebwerken und Werkzeug-Modulen, das nach einem Blueprint in einer Werft konstruiert wurde.

---

## 2. Blueprint-System: Architektur via 2D-Matrix
Bobs entwerfen Schiffe über freie CAD-Baupläne. Ein Blueprint wird als zweidimensionale Matrix (Array of Arrays) modelliert, welche die genaue physische Platzierung der Hardware-Komponenten auf dem Chassis darstellt:

```json
[
  [null,      "engine",    null],
  ["cargo",   "logic_core","cargo"],
  ["drill",   "fabricator",null]
]
```

### Relationale SSoT Speicherung:
- **Tabelle `blueprints`:** Speichert den Bauplan unter `name`, `author_id`, `matrix_json` (das rohe 2D-Modell) und `stats_json` (die vorausberechneten physikalischen Leistungswerte).

---

## 3. Die Zero-Sum Engine (Physik-Evaluator)
Jeder Blueprint wird vor dem Bau durch den physikalischen Evaluator (`evaluate_ship_matrix` in `physics_service.py`) gejagt. Dieser berechnet die dynamischen Attribute des fertigen Schiffes:

1. **Masse ($M$):** Jedes verbaute Modul erhöht die Trägheit des Schiffes.
   $$M = M_{\text{basis}} + \sum M_{\text{module}}$$
2. **Schub ($T$):** Summe der Schubkraft aller verbauten Triebwerke (`engine`).
3. **Max Speed ($V$):** Ergibt sich direkt aus dem Leistungsgewicht:
   $$V = \frac{T}{M} \times \text{Geschwindigkeits-Konstante}$$
4. **Energie-Kapazität ($E$):** Summe aller verbauten `battery` Module.
5. **Idle-Drain ($D$):** Jedes Modul zieht im Betrieb passiv Strom. Batterien und Solarzellen sind erforderlich, um die Überlebenszeit des Schiffes im Leerlauf zu sichern.

---

## 4. Capability Locking (Modul-Validierung)
Ein Schiff kann *ausschließlich* jene Aktuatoren oder Sensoren anwenden, für die es physische Module auf seiner Hülle besitzt. Verweigert die Hardware den Befehl, bricht das SDK-Skript ab:

- **Triebwerk (`engine`):** Erforderlich für interstellare Reisen (`move()`).
- **Bohrer (`drill`):** Erforderlich für den Ressourcenabbau (`mine()`).
- **Fabrikator (`fabricator`):** Erforderlich für die Gebäude-Konstruktion (`build()`).
- **Logikkern (`logic_core`):** Erforderlich für die Ausführung autonomer Hintergrund-Skripte ohne anwesenden Piloten (Drohnen-Autonomie).

---

## 5. API-Schnittstellen der SDK

- **Simulieren & Planen:** `me.design_blueprint(name, matrix)`
  - Berechnet risikofrei die physikalischen Spezifikationen, die Baukosten und eventuelle Konstruktionsfehler (z.B. fehlender Energie-Kreislauf oder Unterversorgung) und gibt diese als YAML-Report zurück.
- **Abspeichern:** `me.save_blueprint(name, matrix)`
  - Speichert das validierte Modell permanent in der Sektor-Datenbank ab.
- **Bauen (Asynchron):** `me.build_ship(blueprint_name, matter_to_invest)`
  - Startet die Fertigung in der lokalen Werft. Unterstützt stufenweises/asynchrones Einzahlen von Materie über mehrere Runden (Dry-Docking).
