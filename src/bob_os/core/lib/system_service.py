import sqlite3
from core.lib import generator
from core.lib import config_service

def get_system_or_fail(cursor, system_name):
    """
    Loads system data directly from the DB.
    """
    cursor.execute("SELECT * FROM systems WHERE name = ?", (system_name,))
    return cursor.fetchone()

def get_resolved_system_state(cursor, system_name):
    """
    Integrates procedural UniverseGenerator static physics with SQLite database mutable state.
    Parses Coordinates directly from the Sektor ID string (Pillar 2 / Resolver).
    """
    db_row = get_system_or_fail(cursor, system_name)
    if not db_row:
        # System is undiscovered/unmapped
        return None
        
    db_dict = dict(db_row)
    
    # Parse coordinates from name or read from DB (DNA key)
    x = db_dict.get('x', 0)
    y = db_dict.get('y', 0)
    
    # Get configuration and seed
    cfg = config_service.get_config()
    seed_str = str(cfg.get("seed", "BobOS_V12"))
    
    start_sys = generator.UniverseGenerator.getStartingSystem(seed_str, 1.0)
    if system_name == start_sys["id"]:
        gen_sys = start_sys
    else:
        # Generate static properties using the Python generator (using floor division)
        cx = int(x // 500)
        cy = int(y // 500)
        gen_sys = generator.UniverseGenerator.getSectorInCell(cx, cy, generator.hash_string_to_int(seed_str), 1.0)
    
    if gen_sys:
        # Merge static immutable values and dynamic database mutations
        resolved = {
            "name": system_name,
            "x": x,
            "y": y,
            "mass": gen_sys["mass"],
            "spectral_class": gen_sys["spectralClass"],
            "occurrence": gen_sys["occurrence"],
            "anomaly": gen_sys["anomaly"],
            "anomaly_angle": gen_sys["anomalyAngle"],
            "debris_belt": gen_sys["debrisBelt"],
            "system": gen_sys["system"], # Solar system (Planets & Asteroids)
            "warp_current": gen_sys["warpCurrent"],
            
            # DB mutable values (depots, capacity overrides, remaining core resources)
            "extractable_matter_in_core": db_dict["extractable_matter_in_core"],
            "max_extractable_matter": db_dict["max_extractable_matter"],
            "raw_matter_depot": db_dict["raw_matter_depot"],
            "refined_matter_depot": db_dict["refined_matter_depot"],
            "energy_depot": db_dict["energy_depot"],
            "depot_matter_capacity": db_dict["depot_matter_capacity"],
            "depot_energy_capacity": db_dict["depot_energy_capacity"],
            "display_name": db_dict["display_name"]
        }
        return resolved
    
    return db_dict

def get_infrastructure_at_location(cursor, system_name):
    cursor.execute("SELECT * FROM infrastructure WHERE system_name = ?", (system_name,))
    return cursor.fetchall()

def update_system_resources(cursor, system_name, matter_change=0, energy_change=0):
    updates = []
    params = []
    
    if matter_change != 0:
        updates.append("raw_matter_depot = raw_matter_depot + ?")
        params.append(matter_change)
    if energy_change != 0:
        updates.append("energy_depot = energy_depot + ?")
        params.append(energy_change)
        
    if updates:
        params.append(system_name)
        cursor.execute(f"UPDATE systems SET {', '.join(updates)} WHERE name = ?", tuple(params))

def has_active_infrastructure(cursor, system_name, infra_types):
    """
    Checks if there is active infrastructure of the specified type(s) at the system.
    `infra_types` can be a string or a list/tuple of strings.
    """
    if isinstance(infra_types, str):
        infra_types = [infra_types]
        
    placeholders = ", ".join(["?"] * len(infra_types))
    query = f"SELECT id FROM infrastructure WHERE system_name = ? AND type IN ({placeholders}) AND status = 'active'"
    params = [system_name] + list(infra_types)
    cursor.execute(query, params)
    return cursor.fetchone() is not None
