# Bobiverse Tactical Dashboard (Visualisierung v2.0)

## 1. Technischer Stack (Modern & Performant)
- **Runtime:** Bun (für extrem schnelles Bootstrapping und Paketmanagement).
- **Sprache:** TypeScript (durchgängige Typisierung des World States).
- **Frontend-Framework:** Vite + React (für reaktives State-Management).
- **State-Handling:** 
    - **Backend:** Der Node.js Runner exportiert nach jedem Turn ein typisiertes `WorldState` Interface als JSON.
    - **Frontend:** Deep-Merge Logik (z.B. mit `immer` oder `fast-deep-equal`), um nur geänderte UI-Elemente neu zu rendern.

## 2. World State Schema (Typisierung)
```typescript
interface Agent {
  id: string;
  location: string;
  matter: number;
  energy: number;
  status: 'active' | 'hibernation' | 'moving';
  last_manifestation: string; // Für Sprechblasen / Log
}

interface System {
  name: string;
  resources: number;
  infrastructure: Array<{type: string, progress: number}>;
}

interface WorldState {
  tick: number;
  last_agent: string;
  systems: System[];
  agents: Agent[];
  events: Array<{type: string, description: string}>;
}
```

## 3. UI-Komponenten (Layout)
- **Tactical Map (Center):** 
    - 2D/Canvas Darstellung der Sternensysteme.
    - Agenten als animierte Icons.
    - **Sprechblasen:** Kurze Einblendungen der `ANALYSE` über dem Agenten-Icon bei einem Turn.
- **Agent Monitor (Sidebar):** 
    - Liste aller Bobs mit Fortschrittsbalken für Energie und Materie.
- **Log Window (Bottom):** 
    - Echtzeit-Stream der `log.md`. Zeigt Manifestationen und System-Resonanzen.
    - Filterbar nach Agenten-ID.

## 4. Perspektivische Ziele (Bling-Bling)
- **Path-Lines:** Visuelle Linien zwischen Systemen bei `move.py`.
- **Event-Flashes:** Rote Warnsymbole bei HP-Verlust, grüne bei Replikation.
- **Time-Control:** Slider im Dashboard, um durch vergangene Ticks der aktuellen Simulation zu "scrubben".

## 5. Implementierungs-Strategie
1.  **Phase 1:** Runner-Update für `world_state.json` Export nach jedem Turn.
2.  **Phase 2:** Bun/Vite/TS Grundgerüst mit einfachem JSON-Polling.
3.  **Phase 3:** Integration der Sprechblasen und des Log-Fensters.
