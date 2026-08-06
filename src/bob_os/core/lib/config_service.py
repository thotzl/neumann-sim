import os
import json

def _load_env_from_root(env_name='.env'):
    """
    Dependency-free .env loader that walks up from this script's directory 
    to find the root .env file and load it into os.environ.
    Skips commented lines (#) and empty lines, and cleans quotes!
    """
    curr = os.path.abspath(os.path.dirname(__file__))
    for _ in range(6): # Prevent infinite loops, check up to 6 parents
        env_path = os.path.join(curr, env_name)
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if '=' in line:
                            parts = line.split('=', 1)
                            key = parts[0].strip()
                            val = parts[1].strip()
                            # Strip quotes
                            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                                val = val[1:-1]
                            os.environ[key] = val
            except Exception:
                pass
            break
        curr = os.path.dirname(curr)

_load_env_from_root()

_config_cache = None
_economy_cache = None

COSMIC_DEFAULTS = {
    "CELL_SIZE": 500,
    "MAX_JITTER": 75,
    "SUPER_CELL_SIZE": 120000,
    "GALAXY_CHANCE": 0.40,
    "MIN_GALAXY_RADIUS": 15000,
    "MAX_GALAXY_RADIUS": 50000,
    "MIN_PITCH_ANGLE": 6,
    "MAX_PITCH_ANGLE": 24,
    "MIN_STELLAR_MASS": 0.08,
    "MAX_STELLAR_MASS": 40.0,
    "STELLAR_MASS_IMF": 3.0,
    "REMNANT_CHANCE": 0.001,
    "REMNANT_PULSAR_LIMIT": 15.0,
    "PLANET_MIN_COUNT": 2,
    "PLANET_MAX_COUNT": 8,
    "PLANET_TB_OFFSET": 0.22,
    "PLANET_TB_SPACING": 1.45,
    "PLANET_ALBEDO_VULCAN": 0.12,
    "PLANET_ALBEDO_ROCKY": 0.20,
    "PLANET_ALBEDO_HAB": 0.30,
    "PLANET_ALBEDO_DESERT": 0.25,
    "PLANET_ALBEDO_GAS": 0.35,
    "PLANET_ALBEDO_ICE": 0.40,
    "SUPERNOVA_BUBBLE_SIZE": 64000,
    "SUPERNOVA_BUBBLE_CHANCE": 0.09,
    "GRAVITY_WELL_SIZE": 75000,
    "GRAVITY_WELL_CHANCE": 0.08,
    "GRAVITY_WELL_MULT": 2.0,
}

def deep_merge(target, source):
    """Recursively merges dictionary source into target."""
    if not isinstance(source, dict):
        return source
    output = target.copy()
    for key, value in source.items():
        if key in output and isinstance(output[key], dict) and isinstance(value, dict):
            output[key] = deep_merge(output[key], value)
        else:
            output[key] = value
    return output

def get_config():
    global _config_cache
    if _config_cache is not None: return _config_cache
    
    # Path logic for new structure:
    # This file is located in <exp_root>/core/lib/config_service.py
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, 'config.json')
    
    conf = {
        "cosmic_settings": COSMIC_DEFAULTS.copy(),
        "seed": "BobOS_V12"  # default deterministic seed for unittests
    }
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                experiment_conf = json.load(f)
                conf = deep_merge(conf, experiment_conf)
        except Exception:
            pass
            
    # Handle random seed if missing
    if "seed" not in conf or conf["seed"] is None:
        import random
        # Generates a stable random seed for the process run
        conf["seed"] = str(random.randint(100000, 99999999))
        
    _config_cache = conf
    return _config_cache

def get_economy_rules():
    global _economy_cache
    if _economy_cache: return _economy_cache
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Master path (during build) or Exp path (during run)
    rules_path = os.path.join(base_dir, 'core', 'lib', 'ECONOMY_RULES.json')
    
    if os.path.exists(rules_path):
        with open(rules_path, 'r') as f:
            _economy_cache = json.load(f)
            return _economy_cache
    return {}

def get_physics_constants():
    conf = get_config()
    rules = get_economy_rules()
    
    # Hard defaults from Economy-JSON if available, otherwise fallback
    defaults = {
        "travel_speed_per_tick": 300,
        "energy_cost_per_distance": rules.get('tool_costs', {}).get('move_per_unit', {}).get('energy', 0.1),
        "idle_drain": rules.get('agent_limits', {}).get('energy_drain_idle', 0), # Torsten Ref: Default idle drain is 0!
        "scan_range_min": 500,
        "scan_range_max": 1500
    }
    
    if 'physics_constants' in conf:
        return conf['physics_constants']
    return defaults
