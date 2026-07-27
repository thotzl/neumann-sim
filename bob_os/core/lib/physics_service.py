import math

def calc_distance(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    return math.sqrt(dx*dx + dy*dy)

def calc_travel_cost(dist, cost_factor):
    return int(dist * cost_factor)

def calc_eta(dist, speed):
    return max(1, math.ceil(dist / speed))

def linear_interpolate(start, end, progress):
    return start + (end - start) * progress

def calculate_scan_coordinates(origin_x, origin_y, distance, angle_degrees, grid_size=100):
    """
    Calculates the target coordinates of a scan and snaps them to the planetary grid.
    """
    raw_x = origin_x + distance * math.cos(math.radians(angle_degrees))
    raw_y = origin_y + distance * math.sin(math.radians(angle_degrees))
    
    snap_x = int(round(raw_x / float(grid_size)) * grid_size)
    snap_y = int(round(raw_y / float(grid_size)) * grid_size)
    
    return snap_x, snap_y

def calculate_upgrade_cost(base_cost, upgrade_multiplier):
    """
    Calculates the absolute matter cost for an infrastructure upgrade.
    """
    return int(base_cost * upgrade_multiplier)

def validate_module_connectivity(matrix):
    """
    Checks if all modules spanning multiple tiles are orthogonally connected (Pillar 3 Adjacency).
    """
    # 0. SSoT type validation (Pillar 3 robustness guarantee)
    if not isinstance(matrix, list) or len(matrix) == 0 or any(not isinstance(row, list) for row in matrix):
        return False, "Matrix must be a 2D list of lists (e.g., [['engine', 'cargo']]). Do not wrap in a dictionary."

    rows = len(matrix)
    cols = len(matrix[0]) if rows > 0 else 0
    
    module_coords = {}
    for r in range(rows):
        for c in range(cols):
            cell = matrix[r][c]
            if cell is None: continue
            if isinstance(cell, str):
                cell = {"type": cell}
            m_id = cell.get('id')
            if m_id:
                if m_id not in module_coords:
                    module_coords[m_id] = []
                module_coords[m_id].append((r, c))
                
    for m_id, coords in module_coords.items():
        if len(coords) <= 1: continue
        
        # Run BFS to check connectivity of coordinates
        visited = set()
        queue = [coords[0]]
        
        while queue:
            curr = queue.pop(0)
            if curr in visited: continue
            visited.add(curr)
            
            # Check orthogonal neighbors
            cr, cc = curr
            for nr, nc in [(cr-1, cc), (cr+1, cc), (cr, cc-1), (cr, cc+1)]:
                if (nr, nc) in coords and (nr, nc) not in visited:
                    queue.append((nr, nc))
                    
        if len(visited) != len(coords):
            return False, f"Module '{m_id}' is disconnected inside the matrix."
            
    return True, None

def evaluate_ship_matrix(name, matrix, rules):
    """
    Deterministic 2D grid evaluator for ships (Pillar 3 physics ruleset).
    """
    # 0. SSoT type validation (Pillar 3 robustness guarantee)
    if not isinstance(matrix, list) or len(matrix) == 0 or any(not isinstance(row, list) for row in matrix):
        return {"error": "Matrix must be a 2D list of lists (e.g., [['engine', 'cargo']]). Do not wrap in a dictionary."}

    p = rules.get('ship_physics') or rules.get('physics')
    
    # Adapt global rules (Pillar 3 schema unification)
    if 'global_settings' in rules:
        g = rules['global_settings'].get('ship_constants', {})
    else:
        g = rules.get('global', {})
    
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
            if isinstance(cell, str):
                cell = {"type": cell}
                
            m_id = cell.get('id', f"m_{r}_{c}")
            if m_id not in module_tiles:
                module_tiles[m_id] = 0
                modules[m_id] = cell
            module_tiles[m_id] += 1

    # 2. Check orthogonal adjacency
    ok, err_msg = validate_module_connectivity(matrix)
    if not ok:
        return {"error": err_msg}

    # --- DECLARATIVE METADATA LOCK & CAPABILITIES (Completely decoupled from the loop!) ---
    has_drill = any(d['type'] == 'drill' for d in modules.values())
    has_fab = any(d['type'] == 'fabricator' for d in modules.values())
    has_comms = any(d['type'] == 'comm' for d in modules.values())
    has_logic_core = any(d['type'] == 'logic_core' for d in modules.values())

    stats = {
        'mass': total_mass,
        'cost': total_cost,
        'thrust': 0,
        'battery': 0,
        'cargo': 0,
        'regen': 0,
        'drain': 0
    }

    total_comm_range = 0

    for m_id, data in modules.items():
        m_type = data['type']
        tiles = module_tiles[m_id]
        m_rule = p.get(m_type)
        
        if not m_rule: return {"error": f"Unknown module: {m_type}"}
        
        # A. Static fixed-price modules (logic_core, drill, fabricator)
        # If the module defines fixed static mass/cost in the JSON, we accumulate directly!
        if 'mass' in m_rule and 'cost' in m_rule:
            stats['mass'] += m_rule['mass']
            stats['cost'] += m_rule['cost']
            stats['drain'] += m_rule.get('idle_drain', 0)
            continue

        # B. Scalable modules (Automatic SSoT key detection!)
        # We dynamically find the metric (e.g., extracts 'thrust' from 'max_thrust_per_tile')
        val_key = next((k[4:-9] for k in m_rule if k.startswith('max_') and k.endswith('_per_tile')), None)
        if not val_key:
            return {"error": f"Invalid module rule for {m_type}: Missing scaling limit key."}
            
        limit_key = f"max_{val_key}_per_tile"
        max_per_tile = m_rule[limit_key]
        
        # Backward-compatible fallback (if the explicit value is missing from the dict!)
        val = data.get(val_key)
        if val is None:
            val = tiles * max_per_tile
            
        # Validation of size limitation
        if tiles < math.ceil(val / float(max_per_tile)): 
            return {"error": f"{name}: {m_type.capitalize()} {m_id} too small for {val} {val_key}. Needs at least {math.ceil(val / float(max_per_tile))} tiles."}

        # Dynamically accumulate mass, cost & performance (100% DRY!)
        stats['mass'] += val * m_rule.get(f'mass_per_{val_key}', 0)
        stats['cost'] += val * m_rule.get(f'cost_per_{val_key}', 0)
        
        # Map sector resources (with aliases for cargo/battery)
        ALIAS_MAP = {'volume': 'cargo', 'energy': 'battery'}
        stats_key = ALIAS_MAP.get(val_key, val_key)
        
        if stats_key in stats:
            stats[stats_key] += val
            
        # Accumulate antenna range (Pillar 3)
        if m_type == 'comm':
            total_comm_range += val
            
        # Calculate drain
        stats['drain'] += val * m_rule.get(f'drain_per_{val_key}', 0)
        if 'idle_drain' in m_rule:
            stats['drain'] += m_rule['idle_drain']

    # Final Stats
    speed = round((stats['thrust'] / float(stats['mass'])) * g['base_speed'], 2) if stats['thrust'] > 0 else 0
    cost_per_dist = g['base_travel_cost'] * (1 + (stats['mass'] / float(g['mass_efficiency_divisor'])))
    max_range = int(stats['battery'] / cost_per_dist) if cost_per_dist > 0 else 0
    build_time = math.ceil(stats['cost'] / float(g['shipyard_rate']))

    # Calculate net energy balance and drift lifetime (Pillar 3 physics formulas)
    net_energy_balance = round(stats['regen'] - stats['drain'], 1)
    
    if net_energy_balance >= 0:
        idle_lifetime = "unlimited"
    else:
        idle_lifetime = int(stats['battery'] / abs(net_energy_balance)) if stats['battery'] > 0 and net_energy_balance != 0 else 0

    # Calculate passive charging cycles (Solar)
    if stats['regen'] > 0:
        solar_recharge = math.ceil(stats['battery'] / float(stats['regen']))
    else:
        solar_recharge = "infinite"

    thrust_to_mass = round(stats['thrust'] / float(stats['mass']), 4) if stats['mass'] > 0 else 0.0
    cargo_to_mass = round(stats['cargo'] / float(stats['mass']), 4) if stats['mass'] > 0 else 0.0

    return {
        "mass": int(stats['mass']), 
        "cost": int(stats['cost']), 
        "speed": speed, 
        "range": max_range,
        "cargo": stats['cargo'], 
        "regen": stats['regen'], 
        "drain": round(stats['drain'], 1),
        "build": build_time, 
        "thrust": stats['thrust'],
        "battery": stats['battery'],
        "has_drill": 1 if has_drill else 0,
        "has_fabricator": 1 if has_fab else 0,
        "has_logic_core": 1 if has_logic_core else 0,
        "m/b/c": f"{'Y' if has_drill else '-'}/{'Y' if has_fab else '-'}/{'Y' if has_comms else '-'}",
        "diagnostics": {
            "can_move": stats['thrust'] > 0 and stats['battery'] > 0,
            "can_mine": True if (has_drill and stats['battery'] > 0) else False,
            "can_build": True if (has_fab and stats['battery'] > 0) else False,
            "has_energy_grid": stats['battery'] > 0,
            "travel_cost_per_unit": round(cost_per_dist, 4),
            "net_energy_balance": net_energy_balance,
            "idle_lifetime_cycles": idle_lifetime,
            "thrust_to_mass_ratio": thrust_to_mass,
            "is_self_sustainable": True if net_energy_balance >= 0 else False,
            "comm_range": total_comm_range,
            "solar_recharge_cycles": solar_recharge,
            "cargo_to_mass_ratio": cargo_to_mass
        }
    }