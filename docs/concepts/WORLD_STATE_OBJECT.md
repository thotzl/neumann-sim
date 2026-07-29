# 📊 SYSTEM SCHEMA: WORLD STATE DATA CONTRACT (V12.0)

Dieses Dokument definiert das standardisierte, durchgängig typisierte Datenmodell (Data Contract) für die Übertragung und Visualisierung des Sektor-Zustands im Bob-OS Universum.

---

## 1. Das TypeScript-Interface (Schnittstellen-Definition)

```typescript
export interface Infrastructure {
  id: number;
  type: 'matter_silo' | 'solar_collector' | 'shipyard' | 'advanced_shipyard' | 'matter_refinery' | 'sat_link' | 'comms_relay' | 'sem_matrix' | 'mind_forge' | 'deep_space_scanner';
  status: 'active' | 'under_construction' | 'blackout';
  health: number;
  max_health: number;
  level: number;
  progress_matter: number;
  required_matter: number;
}

export interface System {
  name: string;
  x: number;
  y: number;
  raw_matter_depot: number;
  refined_matter_stored: number;
  energy_depot: number;
  extractable_matter_in_core: number;
  max_extractable_matter: number;
  infra: Infrastructure[];
}

export interface Agent {
  id: string;
  chosen_name: string;
  status: 'active' | 'hibernation' | 'traveling' | 'dead';
  location: string; // Dynamisch aufgelöst ('Interstellar' oder Sektor-Name)
  host_type: 'ship' | 'matrix' | null;
  host_id: string | null;
  energy: number;
  last_manifestation: string; // Die Gedanken (ANALYSE) des letzten Turns
}

export interface Ship {
  id: number;
  name: string;
  blueprint_name: string;
  chassis: string;
  pilot_id: string | null;
  system_name: string;
  mass: number;
  thrust: number;
  max_speed: number;
  energy_capacity: number;
  energy_inventory: number;
  raw_matter_inventory: number;
  refined_matter_inventory: number;
  matter_storage_capacity: number;
}

export interface VisualEvent {
  rowid: number;
  cycle: number;
  location: string;
  actor_id: string;
  event_type: string;
  description: string;
}

export interface WorldState {
  tick: number;
  stardate: number;
  total_turns: number;
  timestamp: number;
  systems: System[];
  agents: Agent[];
  ships: Ship[];
  memos: Array<{ id: number; agent_id: string; content: string; status: 'open' | 'closed' }>;
  docs: Array<{ id: number; system_name: string; title: string; content: string; author_id: string }>;
  blueprints: Array<{ id: number; name: string; author_id: string; stats: any }>;
  visual_events: VisualEvent[];
}
```

---

## 2. Dynamic Location Resolving & Mapping (Core-to-Frontend)
Um den Speicherplatz in SQLite zu minimieren, speichert die Datenbank keine redundanten Positionswerte für Agenten. Der State Exporter (`state_exporter.js`) reichert das JSON-Schema zur Laufzeit dynamisch an:

1. **Replikant ist Passagier/Pilot (`host_type = 'ship'`):**
   - Holt die `system_name` aus der verknüpften Werft-Tabelle `ships` auf Basis der `host_id` und injiziert sie als `location`.
2. **Replicant ist de-embodied im Sektor (`host_type = 'matrix'`):**
   - Ermittelt über die `host_id` das entsprechende Sektor-Gebäude (`sem_matrix` / `mind_forge`) aus der `infrastructure` Tabelle und injiziert dessen `system_name` als `location`.
3. **Replicant fliegt interstellar (`status = 'traveling'`):**
   - Setzt `location` fest auf `'Interstellar'` und injiziert die flüchtigen Sprung-Koordinaten in das `transit` Objekt.
