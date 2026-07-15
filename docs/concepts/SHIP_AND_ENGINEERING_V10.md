# SHIP & ENGINEERING MANIFESTO (V10.0)

## 1. Das Paradigma: Trennung von Geist und Materie
In V10.0 verlässt Bob-OS das Modell der "Agenten als fliegende Punkte". 
*   **Der Geist (Mind / Script):** Die Steuerungslogik. Dies kann ein Bob (LLM-Verstand) in einer `sem_matrix` sein oder ein automatisiertes Python-Skript (AutoScript).
*   **Das Schiff (Vessel / Hardware):** Ein physikalisches Objekt mit Masse, Volumen, Batterien und Hardware-Modulen, das nach einem Blueprint in einer Werft gebaut wurde.

### Steuerungs-Zustände (Wer fliegt das Schiff?)
1.  **Embodied Bob (Bemanntes Schiff):** Bob betritt das Schiff (`board()`). Er nutzt nun die physischen Sensoren und Aktuatoren des Schiffes.
2.  **Autonomous Roamer (Drohne):** Das Schiff wird mit einem Skript "geflasht" (siehe `ROAD_TO_ROAMER.md`). Es agiert autark nach den Regeln des Skripts, verbraucht aber die physische Energie seiner eigenen Batterien.
3.  **Disembodied Bob:** Bob existiert körperlos in der `sem_matrix` eines Systems. Er kann nur scannen und über `scut` kommunizieren.

---

## 2. Blueprint-System: Architektur via 2D-Matrix
Schiffe (und Roamer) werden nach freien Bauplänen (Blueprints) konstruiert. Ein Blueprint besteht aus einem 2D-Grid (Array of Arrays).

### Datenstruktur (Beispiel Matrix)
```json
[
  [null,      "engine",    null],
  ["cargo",   "logic_core","cargo"],
  ["drill",   "fabricator","repair_arm"]
]
```

### Warum ein 2D-Grid?
*   **Visuelle Repräsentation:** Erlaubt später eine einfache Kachel-Darstellung im Monitor-Frontend (Pixel-Art Schiffe).
*   **Schadensmodell:** Erlaubt in späteren Phasen (Combat), gezielt einzelne Kacheln auszuschalten.
*   **Räumliche Logik:** Bobs müssen Hardware designen, statt nur Statuswerte zu erhöhen.

---

## 3. Die Zero-Sum Engine (Evaluator)
Jeder eingereichte Blueprint wird durch einen harten physikalischen Evaluator gejagt.
1.  **Masse ($M$):** $\sum (\text{Kachel-Gewichte}) + \text{Chassis-Basis}$.
2.  **Schub ($T$):** $\sum (\text{Engine-Power})$.
3.  **Max Speed ($V$):** $V = T / M \times \text{Konstante}$. (Schwere Frachter sind extrem langsam).
4.  **Energie-Haushalt:** Jede Kachel hat einen `idle_drain`. Das Schiff benötigt Batterien für die Speicherung.

---

## 4. Capability Locking (Modul-Zwang)
Ein Vessel (ob bemannt oder als Roamer) kann *nur* die Aktionen ausführen, für die es Hardware besitzt. Skripte crashen, wenn sie Tools aufrufen, für die das Chassis kein Modul hat.

| Aktion | Erforderliches Modul | Anmerkung |
| :--- | :--- | :--- |
| `move()` | **engine** | Benötigt Energie aus der Schiffs-Batterie. |
| `mine()` | **drill** | |
| `build()` | **fabricator** | |
| `repair()` | **repair_arm** | |
| `scut()` | **comm_dish** | Bonus auf Reichweite. |
| **Autonomie** | **logic_core** | Zwingend für Roamer (Ausführung von Python-Skripten ohne Pilot). |
| `storage` | **cargo** & **battery** | |

---

## 5. Shared Blueprint Library
*   **Design-Phase:** `me design_blueprint(name, matrix)` -> Liefert Stats und Baukosten-Angebot.
*   **Realisierung:** `me build_ship(blueprint_name)` -> Die Werft baut das Modell 1:1 nach.
*   **Flashen (Roamer):** `me flash(ship_id, script_name)` -> Verwandelt ein geparktes Schiff (mit `logic_core`) in einen autonomen Roamer.
