import { parseManifestation, jsonToYaml, resolveShipCADTelemetry } from './src/utils/dashboardHelpers';
import { expect, test, describe } from "bun:test";

describe("Frontend Dashboard Helpers", () => {
  test("parseManifestation extracts thoughts and actions cleanly under V10.5 English protocol", () => {
    const raw = `
1. LOGBOOK:
I need to gather some energy.

2. ACTION:
me.scut(type="gather_energy")
`;
    const { thought, action } = parseManifestation(raw);
    expect(thought).toBe("I need to gather some energy.");
    expect(action).toBe('me.scut(type="gather_energy")');
  });

  test("parseManifestation handles [SELF-IMPULSE]: tags correctly", () => {
    const raw = `
[SELF-IMPULSE]:
1. LOGBOOK:
Recording world state.
`;
    const { thought, action } = parseManifestation(raw);
    expect(thought).toBe("Recording world state.");
    expect(action).toBe("");
  });

  test("jsonToYaml converts object to clean YAML string", () => {
    const obj = {
      name: "Core",
      coordinates: "X0-Y0",
      stats: {
        mass: 100,
        speed: 50
      }
    };
    const yaml = jsonToYaml(obj).trim();
    expect(yaml).toContain('name: "Core"');
    expect(yaml).toContain('coordinates: "X0-Y0"');
    expect(yaml).toContain("mass: 100");
  });

  test("resolveShipCADTelemetry calculates stenciled diagnostics correctly", () => {
    const ship = {
      id: 1,
      name: "Prospector",
      chassis: "Scout",
      pilot_id: "Robert",
      system_name: "SYS_A",
      mass: 300,
      thrust: 600,
      has_drill: 1
    };
    const resolved = resolveShipCADTelemetry(ship);
    expect(resolved).not.toBeNull();
    if (resolved) {
      expect(resolved.blueprint).toBe("Scout");
      expect(resolved.diagnostics.can_mine).toBe(true);
      expect(resolved.diagnostics.can_move).toBe(true);
    }
  });
});
