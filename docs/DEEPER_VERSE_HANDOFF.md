# 🌌 DEEPER VERSE INTEGRATION & HANDOFF GUIDE

This document serves as the architectural Handoff and Integration Guide for transferring the completed **Procedural Deeper Verse Sandbox (Phase 1, 2, 4, and 5)** into the active Bob-OS simulation engine (CommonJS/Python Backend and React Frontend Monitor).

---

## 1. Core Philosophy: The 0-Byte Database Footprint
To support an infinite, persistent universe without overloading the SQLite database (`universe.db`), we adhere to a **Stateless Generator Model**.
*   **The Law:** No sectors, planets, moons, warp vectors, or anomalies are stored in the database.
*   **The Derivation:** All properties of any coordinate $(X, Y)$ are derived dynamically on-the-fly on both the frontend and backend using **the coordinate snapped coordinates as hashes / seeds**.
*   **The Persistency:** Because we use the identical Mulberry32 PRNG on both the Python backend and TypeScript frontend, the same coordinate $(X, Y)$ under seed `S` will always generate the exact same star mass, planets count, orbital distances, and local resource depots, guaranteeing flawless consistency.

---

## 2. Stateless Backend Integration (Python Kernel)

To integrate the prozedural math into Bob-OS's core system services, we must port the TS math models from `generator.ts` to python under `bob_os/core/lib/generator.py` (or a dedicated physics helper).

### 2.1 The 32-Bit Mulberry32 PRNG (Python Port)
To guarantee identical float sequences across platforms, Python must replicate the exact bitwise overflow math of JavaScript's `Mulberry32`:

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

### 2.2 SSoT Physical Property Exponents
To ensure correct Keplerian relationships, the backend derives all star properties from `mass` ($M_{\text{sun}}$):
*   **Radius ($R$):**
    $$R = M^{0.8} \quad (\text{if } M < 1.0) \quad \text{else} \quad R = M^{0.57}$$
*   **Luminosity ($L$):**
    *   $M < 0.43: L = 0.23 \cdot M^{2.3}$
    *   $M < 2.0: L = M^4$
    *   $M < 20.0: L = 1.5 \cdot M^{3.5}$
    *   $M \ge 20.0: L = 25 \cdot M^{1.8}$
*   **Surface Gravity ($g$):**
    $$g = M / R^2$$

---

## 3. High-Performance 2D Canvas Integration (Frontend)

The 2D Canvas Controller is designed to render thousands of stars, coordinate grid lines, flowing warp arrows, and rotating planet orbits at **60 FPS** without UI lag.

### 3.1 Smooth Camera Zoom & Pan Math
To map the infinite world lightyear coordinates to screen pixels, the canvas controller leverages precise matrix translations:

```typescript
// Camera Ref structure
interface Camera {
  panX: number; // world LY coordinate at center of screen
  panY: number; // world LY coordinate at center of screen
  zoom: number; // current LOD zoom scale
}

// Convert absolute infinite world coordinate (wx, wy) to screen pixels (sx, sy)
function worldToScreen(wx: number, wy: number, camera: Camera, canvasWidth: number, canvasHeight: number) {
  const sx = (wx - camera.panX) * camera.zoom + canvasWidth / 2;
  const sy = (wy - camera.panY) * camera.zoom + canvasHeight / 2;
  return { x: sx, y: sy };
}

// Convert screen pixel coordinate (sx, sy) to absolute world LY coordinate (wx, wy)
function screenToWorld(sx: number, sy: number, camera: Camera, canvasWidth: number, canvasHeight: number) {
  const wx = (sx - canvasWidth / 2) / camera.zoom + camera.panX;
  const wy = (sy - canvasHeight / 2) / camera.zoom + camera.panY;
  return { x: wx, y: wy };
}
```

### 3.2 High-Performance LOD Gating Thresholds
To maintain maximum performance under mouse dragging, we enforce strict Level of Detail (LOD) gating:
1.  **Warp Currents Flow Fields (`drawWarpCurrents`):** Only render arrows when `zoom > 0.005` and `zoom < 0.28`.
2.  **Miniature Orbits & Rotating Planets:** Only render orbit lines and rotating dots when `zoom > 0.55` (when zoom is close enough to resolve them, saving huge CPU/GPU cycles!).
3.  **Labels & Names:** Only render sector name labels when `zoom > 0.45`.

### 3.3 Additive Background Rendering (Nebulae Blending)
To draw the pink stellar nurseries, brown dust lanes, and violet supernova shockwaves, use canvas additive composite operations so overlapping nebulae merge naturally into bright starburst regions:

```typescript
this.ctx.save();
this.ctx.globalCompositeOperation = 'lighter'; // Additive blending!
// Draw radial gradient nebulae arcs here...
this.ctx.restore();
```

---

## 4. UI/HUD Architecture: Bidirectional Inputs next to Sliders

To match the high-signal retro sci-fi HUD theme, all sliders should be paired side-by-side with numeric inputs inside a React layout.

### 4.1 Reusable Sliders Sub-Component
Implement the `renderSliderWithInput` sub-renderer inside the React dashboard to support bidirectionally bound adjustments with boundary guards:

```typescript
const renderSliderWithInput = (
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (val: number) => void,
  formatDisplay: (val: number) => string = (val) => val.toString()
) => {
  return (
    <div className="control-group">
      <label>{label}: <strong>{formatDisplay(value)}</strong></label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="hud-slider"
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={isNaN(value) ? min : value}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            const clamped = Math.max(min, Math.min(max, val));
            onChange(clamped);
          }}
          className="hud-input-number"
        />
      </div>
    </div>
  );
};
```

---

## 5. Quality Assurance & Verification Map
The core algorithm file `generator.ts` has been tested extensively.
*   **Unit Tests:** 21 robust test cases inside `generator.test.ts`.
*   **Abdeckungsquote (Coverage):** **100% Line and Function coverage** under Vitest runner.
*   All tests must remain **GREEN** during backend build integrations. Use `npm run test` or `npm run test:coverage` inside `./universesandbox` to run.

---

## 6. SSoT Physics Default Configurations Reference
Use these exact astrophysical constants as the default settings for the core physics engine:
*   `SUPER_CELL_SIZE`: `120000` LY
*   `GALAXY_CHANCE`: `0.40` (40%)
*   `MIN_GALAXY_RADIUS`: `15000` LY, `MAX_GALAXY_RADIUS`: `50000` LY
*   `MIN_PITCH_ANGLE`: `6` degrees, `MAX_PITCH_ANGLE`: `24` degrees
*   `MIN_STELLAR_MASS`: `0.08` $M_{\odot}$, `MAX_STELLAR_MASS`: `40.0` $M_{\odot}$
*   `STELLAR_MASS_IMF`: `3.0`
*   `REMNANT_CHANCE`: `0.001` (0.1%)
*   `REMNANT_PULSAR_LIMIT`: `15.0` $M_{\odot}$
*   `PLANET_MIN_COUNT`: `2`, `PLANET_MAX_COUNT`: `8`
*   `PLANET_TB_OFFSET`: `0.22` AU
*   `PLANET_TB_SPACING`: `1.45`
*   `SUPERNOVA_BUBBLE_SIZE`: `64000` LY, `SUPERNOVA_BUBBLE_CHANCE`: `0.09` (9%)
*   `GRAVITY_WELL_SIZE`: `75000` LY, `GRAVITY_WELL_CHANCE`: `0.08` (8%), `GRAVITY_WELL_MULT`: `2.0`x
