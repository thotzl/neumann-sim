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
    Berechnet die Zielkoordinaten eines Scans und snappt sie auf das planetare Grid.
    """
    raw_x = origin_x + distance * math.cos(math.radians(angle_degrees))
    raw_y = origin_y + distance * math.sin(math.radians(angle_degrees))
    
    snap_x = int(round(raw_x / float(grid_size)) * grid_size)
    snap_y = int(round(raw_y / float(grid_size)) * grid_size)
    
    return snap_x, snap_y

def calculate_upgrade_cost(base_cost, upgrade_multiplier):
    """
    Berechnet die absoluten Materie-Kosten für ein Infrastruktur-Upgrade.
    """
    return int(base_cost * upgrade_multiplier)

def validate_module_connectivity(matrix):
    """
    Checks if all modules spanning multiple tiles are orthogonally connected (Säule 3 Adjazenz).
    """
    # 0. SSoT-Typsicherung (Säule 3 Robustheits-Garantie)
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
    Deterministischer 2D-Gitter Evaluator für Schiffe (Säule 3 Physik-Regelwerk).
    """
    # 0. SSoT-Typsicherung (Säule 3 Robustheits-Garantie)
    if not isinstance(matrix, list) or len(matrix) == 0 or any(not isinstance(row, list) for row in matrix):
        return {"error": "Matrix must be a 2D list of lists (e.g., [['engine', 'cargo']]). Do not wrap in a dictionary."}

    p = rules.get('ship_physics') or rules.get('physics')
    
    # Adapt global rules (Säule 3 schema unification)
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

    # 2. Orthogonal Adjazenz prüfen
    ok, err_msg = validate_module_connectivity(matrix)
    if not ok:
        return {"error": err_msg}

    # 3. Physics Evaluation
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
            if tiles < math.ceil(val / float(m_rule['max_thrust_per_tile'])): 
                return {"error": f"{name}: Engine {m_id} too small for {val} thrust. Needs at least {math.ceil(val / float(m_rule['max_thrust_per_tile']))} tiles."}
            total_thrust += val
            total_mass += val * m_rule['mass_per_thrust']
            total_cost += val * m_rule['cost_per_thrust']
            total_idle_drain += val * m_rule['drain_per_thrust']
            
        elif m_type == 'cargo':
            val = data.get('volume', 0)
            if tiles < math.ceil(val / float(m_rule['max_volume_per_tile'])): 
                return {"error": f"{name}: Cargo {m_id} too small for {val} volume. Needs at least {math.ceil(val / float(m_rule['max_volume_per_tile']))} tiles."}
            total_matter_cap += val
            total_mass += val * m_rule['mass_per_volume']
            total_cost += val * m_rule['cost_per_volume']
            
        elif m_type == 'battery':
            val = data.get('energy', 0)
            if tiles < math.ceil(val / float(m_rule['max_energy_per_tile'])): 
                return {"error": f"{name}: Battery {m_id} too small for {val} energy. Needs at least {math.ceil(val / float(m_rule['max_energy_per_tile']))} tiles."}
            total_energy_cap += val
            total_mass += val * m_rule['mass_per_energy']
            total_cost += val * m_rule['cost_per_energy']
            
        elif m_type == 'solar':
            val = data.get('regen', 0)
            if tiles < math.ceil(val / float(m_rule['max_regen_per_tile'])): 
                return {"error": f"{name}: Solar {m_id} too small for {val} regen. Needs at least {math.ceil(val / float(m_rule['max_regen_per_tile']))} tiles."}
            total_regen += val
            total_mass += val * m_rule['mass_per_regen']
            total_cost += val * m_rule['cost_per_regen']
            
        elif m_type == 'comm':
            val = data.get('range', 0)
            if tiles < math.ceil(val / float(m_rule['max_range_per_tile'])): 
                return {"error": f"{name}: Comm {m_id} too small for {val} range. Needs at least {math.ceil(val / float(m_rule['max_range_per_tile']))} tiles."}
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

    # Final Stats
    speed = round((total_thrust / float(total_mass)) * g['base_speed'], 2) if total_thrust > 0 else 0
    cost_per_dist = g['base_travel_cost'] * (1 + (total_mass / float(g['mass_efficiency_divisor'])))
    max_range = int(total_energy_cap / cost_per_dist) if cost_per_dist > 0 else 0
    build_time = math.ceil(total_cost / float(g['shipyard_rate']))

    has_logic_core = any(data.get('type') == 'logic_core' for m_id, data in modules.items())

    return {
        "mass": int(total_mass), 
        "cost": int(total_cost), 
        "speed": speed, 
        "range": max_range,
        "cargo": total_matter_cap, 
        "regen": total_regen, 
        "drain": round(total_idle_drain, 1),
        "build": build_time, 
        "thrust": total_thrust,
        "battery": total_energy_cap,
        "has_drill": 1 if has_drill else 0,
        "has_fabricator": 1 if has_fab else 0,
        "has_logic_core": 1 if has_logic_core else 0,
        "m/b/c": f"{'Y' if has_drill else '-'}/{'Y' if has_fab else '-'}/{'Y' if has_comms else '-'}"
    }
