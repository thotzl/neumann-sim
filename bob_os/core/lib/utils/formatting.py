import yaml

def clean_dict(d):
    """
    Bereinigt verschachtelte Dictionaries für die Token-Schonung.
    Ersetzt None, [] und {} durch leere Strings "".
    """
    if not isinstance(d, dict): 
        return d
    clean = {}
    for k, v in d.items():
        if v is None or v == [] or v == {}: 
            clean[k] = ""
        elif isinstance(v, dict): 
            clean[k] = clean_dict(v)
        elif isinstance(v, list): 
            clean[k] = [clean_dict(i) if isinstance(i, dict) else i for i in v]
        else: 
            clean[k] = v
    return clean

def format_yaml(obj, clean=False):
    """
    Zentralisiert die standardisierte YAML-Generierung für den Simulator.
    Wendet optional die clean_dict-Bereinigung vor dem Dump an.
    """
    target = clean_dict(obj) if clean else obj
    return yaml.dump(target, sort_keys=False, default_flow_style=False).strip()

def get_display_name(agent_data):
    """
    Gibt den reinen Anzeigenamen des Agenten zurück (chosen_name oder 'Unnamed').
    Ausschließlich für read-only Präsentationszwecke nutzen! Niemals in die DB schreiben.
    """
    if not agent_data:
        return "Unnamed"
    try:
        name = agent_data['chosen_name']
    except (KeyError, TypeError, IndexError):
        name = None
    return name if name else "Unnamed"

def get_display_name_with_id(agent_data, agent_id=None):
    """
    Gibt den Anzeigenamen kombiniert mit der ID zurück (z.B. 'Alice (ID: X0Y0-C0-K9A2)').
    """
    name = get_display_name(agent_data)
    if not agent_id:
        try:
            agent_id = agent_data['id']
        except (KeyError, TypeError):
            agent_id = "Unknown"
    return f"{name} (ID: {agent_id})"

def aggregate_ship_telemetry(ship_row, blueprint_stats=None):
    """
    Zentraler, SSoT-konformer Helfer, der die physischen Spezifikationen, Capabilities
    und Diagnosen eines Schiffes zu einem standardisierten Telemetrie-HUD aggregiert.
    Niemals für Schreibvorgänge verwenden.
    """
    if not ship_row:
        return {}
        
    if not isinstance(ship_row, dict):
        ship_row = dict(ship_row)
        
    blueprint_name = ship_row.get('blueprint_name') or ship_row.get('chassis') or 'unclassified'
    
    stats_dict = {
        "mass": int(ship_row.get('mass', 100)),
        "max_speed": float(ship_row.get('max_speed', 300)),
        "thrust": int(ship_row.get('thrust', 500)),
        "energy_capacity": int(ship_row.get('energy_capacity', 500)),
        "storage_capacity": int(ship_row.get('matter_storage_capacity', 300)),
        "cargo": int(ship_row.get('matter_storage_capacity', 300)),
        "battery": int(ship_row.get('energy_capacity', 500))
    }

    # Falls der Blueprint exakte Daten wie regen/drain enthält (SSoT)
    if blueprint_stats:
        stats_dict['drain'] = float(blueprint_stats.get('drain', 0.0))
        stats_dict['regen'] = float(blueprint_stats.get('regen', 0.0))
        stats_dict['build'] = int(blueprint_stats.get('build', 1))

    capabilities_dict = {
        "drill": "active" if ship_row.get('has_drill') else "inactive",
        "fabricator": "active" if ship_row.get('has_fabricator') else "inactive",
        "logic_core": "active" if ship_row.get('has_logic_core') else "inactive"
    }

    # Diagnostics laden oder Fallback berechnen
    if blueprint_stats and 'diagnostics' in blueprint_stats:
        diagnostics_dict = blueprint_stats['diagnostics']
    else:
        # Robustes mathematisches Fallback für Legacy-Mocks ohne hinterlegte Blaupause
        has_drill = ship_row.get('has_drill', 0)
        has_fab = ship_row.get('has_fabricator', 0)
        diagnostics_dict = {
            "can_move": stats_dict['thrust'] > 0 and stats_dict['battery'] > 0,
            "can_mine": True if (has_drill and stats_dict['battery'] > 0) else False,
            "can_build": True if (has_fab and stats_dict['battery'] > 0) else False,
            "has_energy_grid": stats_dict['battery'] > 0,
            "travel_cost_per_unit": 0.05,
            "net_energy_balance": 0.0,
            "idle_lifetime_cycles": "unlimited",
            "thrust_to_mass_ratio": round(stats_dict['thrust'] / float(stats_dict['mass']), 4) if stats_dict['mass'] > 0 else 0.0,
            "is_self_sustainable": True,
            "comm_range": 0,
            "solar_recharge_cycles": "infinite",
            "cargo_to_mass_ratio": round(stats_dict['storage_capacity'] / float(stats_dict['mass']), 4) if stats_dict['mass'] > 0 else 0.0
        }

    return {
        "id": ship_row.get('id'),
        "name": ship_row.get('name') or "Unnamed",
        "blueprint": blueprint_name,
        "pilot_id": ship_row.get('pilot_id'),
        "health": ship_row.get('health', 100),
        "max_health": ship_row.get('max_health', 100),
        "inventory": {
            "raw_matter": ship_row.get('raw_matter_inventory', 0),
            "refined_matter": ship_row.get('refined_matter_inventory', 0),
            "energy": ship_row.get('energy_inventory', 0)
        },
        "stats": stats_dict,
        "capabilities": capabilities_dict,
        "diagnostics": diagnostics_dict
    }

def get_ship_display_name(ship_row):
    """
    Formatiert den Schiffsnamen kollisionsfrei für alle Text-Ausgaben (z.B. "'Sovereign' (ID: 1)").
    """
    if not ship_row:
        return "Unknown Ship"
    if not isinstance(ship_row, dict):
        ship_row = dict(ship_row)
    name = ship_row.get('name') or "Unnamed"
    ship_id = ship_row.get('id', "Unknown")
    return f"'{name}' (ID: {ship_id})"

def get_system_display_name(system_row):
    """
    Formatiert den Sektornamen kollisionsfrei (z.B. "'HomeBase' (ID: SYS_X0_Y0)" oder einfach "SYS_X0_Y0").
    """
    if not system_row:
        return "Unknown Sector"
    if not isinstance(system_row, dict):
        system_row = dict(system_row)
    name = system_row.get('name', "Unknown")
    display_name = system_row.get('display_name')
    if display_name and display_name != name:
        return f"'{display_name}' (ID: {name})"
    return name
