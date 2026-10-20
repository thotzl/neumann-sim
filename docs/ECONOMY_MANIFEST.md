# Bobiverse Economy Manifest

Die frühere Werte-Tabelle (v8.8) ist überholt. Einzige Quelle für Kosten, Kapazitäten und Unterhalt ist **`src/bob_os/core/lib/rules.json`** (TCK-144); `me --help` zeigt die aktuellen Baukosten aus dieser Datei.

| Abschnitt in `rules.json` | Inhalt |
| :--- | :--- |
| `agent_limits` | Fallback-Kapazitäten (Matter/Energie) |
| `tool_costs` | Energie-/Materiekosten und Erträge der Aktionen (`mine`, `build`, `scan`, `move`, `replicate`, `refine`, `ping_sos`, `reclaim_sos`, `talk`, `docking`) |
| `infrastructure` | Gebäude: `matter_cost`, `required_material` (`raw_matter`/`refined_matter`), Boni, `maintenance_energy_cost` |
| `global_settings` | Depot-/Kernwerte, Verfall (`decay_per_tick`, `decay_interval`), Kern-Regeneration, Reparatur-/Upgrade-/Rückbau-Faktoren, Reisegeschwindigkeit, Scan-Reichweiten, `ship_constants` |
| `ship_physics` | Modulwerte für den CAD-Blueprint-Evaluator (`physics_service.evaluate_ship_matrix`) |
| `cosmic_settings` | Parameter des prozeduralen Generators (`generator.py`) |

Leser: `config_service.get_economy_rules()`, `sdk/actuators.py`, `core/bin/bob.py`, `core/bin/physics_update.py`, `generator.py`. Experiment-spezifische Overrides: `physics_constants` in der Experiment-`config.json` (`config_service.get_physics_constants()`); Generator-Parameter werden ebenfalls mit der Experiment-`config.json` gemergt (`generator.py`).

Bekannte Abweichung: Routenplanung rechnet mit 0.02 Energie pro Distanz (`tool_costs.move.cost_per_distance`), das Physik-Update mit dem Fallback 0.1 (`tool_costs.move_per_unit.energy` fehlt in `rules.json`) → [TCK-169](../.tickets/pool/TCK-169-move-energy-cost-mismatch.md).

Physik-Regeln (Blackout, Verfall, Transit): [physics/README.md](physics/README.md). Balancing-Tests: `tests/balancing/verify_economy_balancing.py`, `tests/balancing/verify_ship_balancing.py`.
