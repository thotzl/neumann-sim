import json
import math

def calculate_ship_stats(matrix):
    with open('bob_os/core/lib/ECONOMY_RULES.json', 'r') as f:
        rules = json.load(f)
    
    modules = rules['ship_modules']
    consts = rules['global_settings']['ship_constants']
    
    total_mass = consts['base_mass']
    total_cost = 0
    total_thrust = 0
    total_energy_cap = consts['base_energy_cap']
    total_matter_cap = 0
    total_regen = 0
    total_idle_drain = 0
    move_drain = 0
    
    rows = len(matrix)
    cols = len(matrix[0]) if rows > 0 else 0
    
    # Grid cost (all fields cost chassis resources)
    total_cost += rows * cols * modules['chassis_tile']['cost']
    
    for row in matrix:
        for cell in row:
            if cell is None:
                total_mass += modules['chassis_tile']['mass']
                continue
            
            m = modules.get(cell)
            if not m: continue
            
            total_mass += m.get('mass', 0)
            total_cost += m.get('cost', 0)
            total_thrust += m.get('thrust', 0)
            total_energy_cap += m.get('energy_capacity', 0)
            total_matter_cap += m.get('matter_capacity', 0)
            total_regen += m.get('energy_regen', 0)
            total_idle_drain += m.get('idle_energy_drain', 0)
            move_drain += m.get('move_energy_drain', 0)

    # Physics Calculations
    top_speed = 0
    if total_thrust > 0:
        top_speed = (total_thrust / total_mass) * consts['base_speed']
    
    # Cost per distance influenced by mass
    # Formula: Base_Cost * (1 + (M / Divisor))
    cost_per_dist = consts['base_travel_cost'] * (1 + (total_mass / consts['mass_efficiency_divisor']))
    
    # Max Range (estimated with full battery, ignoring regen/drain for now)
    max_range = total_energy_cap / cost_per_dist if cost_per_dist > 0 else 0
    
    build_time = math.ceil(total_cost / consts['shipyard_build_rate_per_tick'])

    return {
        "mass": total_mass,
        "cost": total_cost,
        "thrust": total_thrust,
        "speed": round(top_speed, 2),
        "energy_cap": total_energy_cap,
        "matter_cap": total_matter_cap,
        "cost_per_dist": round(cost_per_dist, 4),
        "max_range": round(max_range, 0),
        "build_time": build_time,
        "efficiency": round(total_thrust / total_mass, 2) if total_mass > 0 else 0
    }

scout = [["engine"], ["logic_core"]]
freighter = [
    ["engine", "cargo", "engine"], 
    ["battery", "logic_core", "battery"], 
    ["engine", "cargo", "engine"]
]
miner = [
    ["drill", "logic_core", "solar"],
    ["engine", "battery", "cargo"]
]

ships = [("Scout", scout), ("Freighter", freighter), ("Mining Barge", miner)]

print(f"{'SHIP TYPE':<15} | {'MASS':<6} | {'COST':<6} | {'SPEED':<8} | {'E-CAP':<6} | {'M-CAP':<6} | {'RANGE':<8} | {'BUILD'}")
print("-" * 80)
for name, matrix in ships:
    s = calculate_ship_stats(matrix)
    print(f"{name:<15} | {s['mass']:<6} | {s['cost']:<6} | {s['speed']:<8} | {s['energy_cap']:<6} | {s['matter_cap']:<6} | {s['max_range']:<8} | {s['build_time']} ticks")

