# EPIC 2: SHIPS & BLUEPRINTS - IMPLEMENTATION ROADMAP

## 1. Architektur: Trennung von Geist und Materie
Das Kern-Paradigma von V10.0 ist die Loslösung des Agenten von physischen Ressourcen. Bob ist eine CPU, das Schiff (Vessel) ist die Hardware.

### DB Schema Migration
- [ ] **agents:** Entferne `energy_inventory`, `raw_matter_inventory`, `refined_matter_inventory`, `matter_storage_capacity`.
- [ ] **ships:** Füge `energy_inventory`, `raw_matter_inventory`, `refined_matter_inventory`, `hp`, `max_hp`, `blueprint_id`, `status`, `progress_ticks` hinzu.
- [ ] **blueprints (NEU):** Tabelle für `id`, `name`, `author_id`, `matrix_json`, `stats_json`.

---

## 2. Phase 1: Design & Evaluierung
Implementierung der physikalischen Engine, die aus einem 2D-Grid ein Spec-Sheet berechnet.

### Evaluator Logic (physics_service.py)
- [ ] **Masse-Berechnung:** Summe aller Kacheln + Chassis-Basis.
- [ ] **Speed-Berechnung:** $TopSpeed = (Thrust / Mass) * BaseSpeed$.
- [ ] **Verbrauchs-Logik:** Reisekosten steigen proportional zur Masse.
- [ ] **Capability-Locking:** Extraktion der Schalter `can_move`, `can_mine`, `can_build`, `can_scut`.
- [ ] **Regeneration:** Berechnung der `energy_regen_solar`.

### SDK Endpoints
- [ ] `me design_blueprint(name, matrix)` -> Validierung & Kostenangebot.
- [ ] `me build_vessel(blueprint_name)` -> Startet Bauprozess in einer Werft.
- [ ] `me deconstruct_vessel(ship_id)` -> Rückerstattung basierend auf HP & Originalkosten.

---

## 3. Phase 2: Fertigung & Nutzung
- [ ] **Construction-Status:** `physics_update.py` reduziert `progress_ticks` pro Runde.
- [ ] **Embodiment:** `me board(ship_id)` verknüpft die Bob-CPU mit dem Schiffs-Interface.
- [ ] **Dynamic ETA:** Reisen dauern je nach Schiffs-Speed unterschiedlich lang.

---

## 4. Phase 3: Dokumentation & Guidance
- [ ] Großes Update für `me --help` mit Fokus auf Modul-Wechselwirkungen.
- [ ] Dashboard-Anpassung zur Trennung von Vessel- und System-Werten.
