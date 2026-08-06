# 🌌 HANDOFF RESOURCE: TCK-116 DEEPER VERSE SIMULATOR-INTEGRATION

This handoff resource summarizes the completed Frontend-Consolidation (TCK-117) and details the concrete implementation blueprint for integrating the prozedural `UniverseGenerator` into the active Bob-OS python simulator engine.

---

## 1. What We Have Built (Current State)

### 1.1 The Completed & Consolidated Shared Core
We saniert the frontend `./hud` into a single, high-performance Vite-React app running on Port 5173 with clean state-based SPA routing (`main.tsx`) supporting two independent routings:
*   **Route A: `/` (Monitor):** Clean, real-time command dashboard fed by the active WebSocket on Port 3005 using a Pure SSoT consumption model.
*   **Route B: `/sandbox` (Sandbox):** Autarkic offline astrophysics simulator utilizing the exact same shared Canvas and generator loops.
*   **Shared Canvas (`TacticalCanvas.tsx`):** A 100% DRY React component that draws onto a raw HTML5 `<canvas>` via `CanvasController.ts`. 
    *   We completely **uninstalled `konva` and `react-konva`**, shrinking the minified JS bundle size by nearly **300 kB** (from `677 kB` to `352 kB`!).
    *   The panning and zooming coordinates are bypass-cached inside private React refs, reaching a butter-smooth **120+ FPS** without triggering React parent stutters.
    *   Strict React 19 `StrictMode` double-canvas rendering bugs were cleanly cured by enforcing explicit DOM container purges on mount.

### 1.2 The Two Speculative WebGL Viewports
We built two fully interactive, prozedurally-endless WebGL prototypes under separate comparative routes to test alternative rendering layers:
*   **PixiJS Radar (`/gpu-test-pixijs`):** Draws stars as volumetric, warm-glowing radial sprites. Employs **Adaptive Grid Resampling (LOD)**: as you zoom out, the grid thins out automatically, drawing flow arrows at a constant screen size of `15px` to guarantee 144 FPS galactic views.
*   **ThreeJS Spacetime (`/gpu-test-threejs`):** Draws stars as glowing **GPU Point-Shaders** clamped at a minimum size of `6.0px` (completely avoiding perspective disappearing and physical beach-ball blooming). Planets orbit physically illuminated in a horizontal 3D plane.

---

## 2. Next Steps: Backend Sim-Kernel Integration Action Plan

To fulfill the remainder of `TCK-116`, the incoming agent must execute the following structural integration steps on the python simulator kernel:

### Step 2.1: Replicate the Deterministic Mulberry32 Math in Python
The TS seeder engine `hud/src/shared/generator.ts` relies on the exact 32-bit integer overflow math of `Mulberry32`. Create a python seeder file `src/bob_os/core/lib/generator.py` and implement:

```python
class Mulberry32:
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF

    def next_float(self) -> float:
        # Replicates JS bitwise 32-bit integer arithmetic and unsigned right shift
        self.state = (self.state + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.state
        t = Math_imul(t ^ (t >> 15), t | 1)
        t ^= (t + Math_imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        return float(((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0)

def Math_imul(a: int, b: int) -> int:
    # Replicates JavaScript Math.imul 32-bit multiplication
    return int((a * b) & 0xFFFFFFFF)
```

Ensure that seeding coordinate strings `SYS_X{x}_Y{y}` generates the identical sequence of floats on both Python and TypeScript.

### Step 2.2: Implement Stateless 0-Byte-Storage Sektor Resolving
*   Modify `universe_service.py` and `physics_service.py` to intercept sector database reads.
*   Instead of reading sectors from SQLite `universe.db`, pass the sector's coordinates $X$ and $Y$ directly to the Python `UniverseGenerator`.
*   Let the Python generator derive the star mass, spectral class, planetary counts, orbit indices, albedos, temperatures, and estimated resources (energy/matter depots) dynamically on-the-fly.
*   This ensures the active simulation engine remains **stateless and 100% consistent with what the frontend Canvas renders**.

### Step 2.3: Stream SSoT Data to the Monitor App
*   When a player connects via the WebSocket server, send the prozedurally generated sector states (along with active simulated ships and agents) in the central SSoT JSON package.
*   The Monitor App will consume this raw JSON, feeding it directly to our consolidated `<TacticalCanvas>` for high-resolution rendering.

---

## 3. Reference Files & Artifacts
*   **TS Generator Source:** `hud/src/shared/generator.ts`
*   **TS Test Coverage:** `hud/src/shared/generator.test.ts` (Run `npm run test` inside `./hud`)
*   **Unified Shared Canvas:** `hud/src/shared/components/TacticalCanvas.tsx`
*   **Handoff SSoT Guide:** `docs/DEEPER_VERSE_HANDOFF.md`
