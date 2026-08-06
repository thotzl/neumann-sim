import json
import math

def simulate_ship(name, matrix, rules):
    p = rules['physics']
    g = rules['global']
    
    total_mass = g['base_mass']
    total_cost = 0
    total_thrust = 0
    total_energy_cap = 0
    total_matter_cap = 0
    total_regen = 0
    total_idle_drain = 0
    
    rows = len(matrix)
    cols = len(matrix[0]) if rows > 0 else 0
    
    # 1. Geometry & Component Analysis
    module_tiles = {}
    modules = {}
    
    for r in range(rows):
        for c in range(cols):
            cell = matrix[r][c]
            total_mass += p['chassis_tile']['mass']
            total_cost += p['chassis_tile']['cost']
            
            if cell is None: continue
            
            m_id = cell.get('id', f"m_{r}_{c}")
            if m_id not in module_tiles:
                module_tiles[m_id] = 0
                modules[m_id] = cell
            module_tiles[m_id] += 1

    # 2. Physics Evaluation
    has_drill = False
    has_fab = False
    has_comms = False

    for m_id, data in modules.items():
        m_type = data['type']
        tiles = module_tiles[m_id]
        m_rule = p.get(m_type)
        
        if not m_rule: return {"error": f"Unknown module: {m_type}"}
        
        if m_type == 'engine':
            val = data.get('thrust', 0)
            if tiles < math.ceil(val / m_rule['max_thrust_per_tile']): return {"error": f"{name}: Engine {m_id} too small for {val} thrust."}
            total_thrust += val
            total_mass += val * m_rule['mass_per_thrust']
            total_cost += val * m_rule['cost_per_thrust']
            total_idle_drain += val * m_rule['drain_per_thrust']
            
        elif m_type == 'cargo':
            val = data.get('volume', 0)
            if tiles < math.ceil(val / m_rule['max_volume_per_tile']): return {"error": f"{name}: Cargo {m_id} too small for {val} volume."}
            total_matter_cap += val
            total_mass += val * m_rule['mass_per_volume']
            total_cost += val * m_rule['cost_per_volume']
            
        elif m_type == 'battery':
            val = data.get('energy', 0)
            if tiles < math.ceil(val / m_rule['max_energy_per_tile']): return {"error": f"{name}: Battery {m_id} too small for {val} energy."}
            total_energy_cap += val
            total_mass += val * m_rule['mass_per_energy']
            total_cost += val * m_rule['cost_per_energy']
            
        elif m_type == 'solar':
            val = data.get('regen', 0)
            if tiles < math.ceil(val / m_rule['max_regen_per_tile']): return {"error": f"{name}: Solar {m_id} too small for {val} regen."}
            total_regen += val
            total_mass += val * m_rule['mass_per_regen']
            total_cost += val * m_rule['cost_per_regen']
            
        elif m_type == 'fusion_reactor':
            val = data.get('regen', 0)
            if tiles < math.ceil(val / m_rule['max_regen_per_tile']): return {"error": f"{name}: Fusion Reactor {m_id} too small for {val} regen."}
            total_regen += val
            total_mass += val * m_rule['mass_per_regen']
            total_cost += val * m_rule['cost_per_regen']
            
        elif m_type == 'warp_drive':
            val = data.get('thrust', 0)
            if tiles < math.ceil(val / m_rule['max_thrust_per_tile']): return {"error": f"{name}: Warp Drive {m_id} too small for {val} thrust."}
            total_thrust += val
            total_mass += val * m_rule['mass_per_thrust']
            total_cost += val * m_rule['cost_per_thrust']
            total_idle_drain += val * m_rule['drain_per_thrust']
            
        elif m_type == 'comm':
            val = data.get('range', 0)
            if tiles < math.ceil(val / m_rule['max_range_per_tile']): return {"error": f"{name}: Comm {m_id} too small for {val} range."}
            total_mass += val * m_rule['mass_per_range']
            total_cost += val * m_rule['cost_per_range']
            total_idle_drain += m_rule['idle_drain']
            has_comms = True
            
        elif m_type == 'logic_core':
            total_mass += m_rule['mass']
            total_cost += m_rule['cost']
            total_idle_drain += m_rule['idle_drain']
        elif m_type == 'drill':
            total_mass += m_rule['mass']
            total_cost += m_rule['cost']
            has_drill = True
        elif m_type == 'fabricator':
            total_mass += m_rule['mass']
            total_cost += m_rule['cost']
            has_fab = True

    # Fusion fuel cargo capacity constraint
    if any(m['type'] == 'fusion_reactor' for m in modules.values()) and total_matter_cap == 0:
        return {"error": f"{name}: Fusion reactor built, but has no Cargo (volume=0) to carry its matter fuel!"}

    # Final Stats
    speed = round((total_thrust / total_mass) * g['base_speed'], 2) if total_thrust > 0 else 0
    cost_per_dist = g['base_travel_cost'] * (1 + (total_mass / g['mass_efficiency_divisor']))
    
    # Precise active Warp active travel drain integration (Steel-man Fix 1)
    net_drain = max(0.0, total_idle_drain - total_regen)
    effective_cost_per_dist = cost_per_dist + (net_drain / speed if speed > 0 else 0)
    max_range = int(total_energy_cap / effective_cost_per_dist) if effective_cost_per_dist > 0 else 0
    
    build_time = math.ceil(total_cost / g['shipyard_rate'])

    return {
        "mass": int(total_mass), "cost": int(total_cost), "speed": speed, "range": max_range,
        "cargo": total_matter_cap, "regen": total_regen, "drain": round(total_idle_drain, 1),
        "build": build_time, "m/b/c": f"{'Y' if has_drill else '-'}/{'Y' if has_fab else '-'}/{'Y' if has_comms else '-'}"
    }

def run_sim():
    with open('src/sim_engine/config/balancing_rules.json', 'r') as f: rules = json.load(f)
    
    # Components Helper
    LOG = {"type": "logic_core"}
    ENG_S = {"id": "e_s", "type": "engine", "thrust": 500}
    ENG_L = {"id": "e_l", "type": "engine", "thrust": 2000} # needs 4 tiles
    BAT_S = {"id": "b_s", "type": "battery", "energy": 5000}
    BAT_L = {"id": "b_l", "type": "battery", "energy": 20000} # needs 4 tiles
    CAR_S = {"id": "c_s", "type": "cargo", "volume": 2500}
    CAR_L = {"id": "c_l", "type": "cargo", "volume": 10000} # needs 4 tiles
    SOL_S = {"id": "s_s", "type": "solar", "regen": 25}
    COM_S = {"id": "com_s", "type": "comm", "range": 10000}
    FUS_S = {"id": "fus_s", "type": "fusion_reactor", "regen": 150}
    WRP_S = {"id": "wrp_s", "type": "warp_drive", "thrust": 3000}
    DRILL = {"type": "drill"}
    FAB   = {"type": "fabricator"}

    # --- 22 ARCHE TYPES ---
    fleet = [
        ("Drone", [[LOG, ENG_S]]),
        ("Scout", [[ENG_S, LOG], [BAT_S, COM_S]]),
        ("Galactic Scout", [[WRP_S, LOG], [BAT_S, FUS_S], [CAR_S, None]]),
        ("Void Crusader", [
            [WRP_S, LOG, BAT_S, BAT_S],
            [WRP_S, FUS_S, BAT_S, BAT_S],
            [CAR_S, CAR_S, FUS_S, FUS_S]
        ]),
        ("Deep Space Probe", [[LOG, COM_S], [BAT_L, BAT_L], [BAT_L, BAT_L]]),
        ("Fighter", [[{"type":"engine","thrust":1000}]*2, [LOG, BAT_S]]),
        ("Courier", [[ENG_S, LOG], [CAR_S, BAT_S]]),
        ("Hauler", [[LOG, BAT_S], [CAR_L, CAR_L], [CAR_L, CAR_L], [ENG_S, ENG_S]]),
        ("Heavy Miner", [[DRILL, LOG], [CAR_L, CAR_L], [CAR_L, CAR_L], [ENG_S, ENG_S], [SOL_S, SOL_S]]),
        ("Constructor", [[FAB, LOG], [CAR_S, BAT_S], [ENG_S, ENG_S]]),
        ("Solar Array", [[LOG, SOL_S], [SOL_S, SOL_S], [BAT_L, BAT_L], [BAT_L, BAT_L]]),
        ("Goliath", [
            [ENG_L, ENG_L, LOG, BAT_L],
            [ENG_L, ENG_L, BAT_L, BAT_L],
            [CAR_L, CAR_L, CAR_L, CAR_L],
            [CAR_L, CAR_L, CAR_L, CAR_L]
        ]),
        ("Speedster", [[ENG_L, ENG_L], [ENG_L, ENG_L], [LOG, BAT_S]]),
        ("Junk Box", [[None, None], [None, LOG]]),
        ("Fueler", [[LOG, BAT_L], [BAT_L, BAT_L], [BAT_L, BAT_L], [ENG_S, ENG_S]]),
        ("Mobile Lab", [[LOG, COM_S], [BAT_S, SOL_S]]),
        ("Interstellar Base", [
            [LOG, FAB, DRILL, COM_S],
            [BAT_L, BAT_L, BAT_L, BAT_L],
            [ENG_L, ENG_L, ENG_L, ENG_L],
            [CAR_L, CAR_L, CAR_L, CAR_L]
        ]),
        # Edge Cases
        ("The Brick", [[CAR_L, CAR_L], [CAR_L, CAR_L]]),
        ("Engine Core", [[ENG_L, ENG_L], [ENG_L, ENG_L]]),
        ("Tiny Drill", [[LOG, DRILL], [ENG_S, BAT_S]]),
        ("Comms Relay", [[LOG, COM_S], [SOL_S, BAT_S]]),
        ("Max Cargo", [[CAR_L, CAR_L, CAR_L, CAR_L]] * 4)
    ]

    print(f"{'SHIP NAME':<20} | {'MASS':<6} | {'COST':<6} | {'SPEED':<6} | {'RANGE':<7} | {'M/B/C':<5} | {'BUILD'}")
    print("-" * 80)
    for name, matrix in fleet:
        res = simulate_ship(name, matrix, rules)
        if "error" in res:
            print(f"{name:<20} | ERROR: {res['error']}")
        else:
            print(f"{name:<20} | {res['mass']:<6} | {res['cost']:<6} | {res['speed']:<6} | {res['range']:<7} | {res['m/b/c']:<5} | {res['build']} T")

run_sim()
