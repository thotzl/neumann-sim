import os
import json

_config_cache = None

def get_config():
    global _config_cache
    if _config_cache: return _config_cache

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    # Wir laden die Config direkt aus dem Experiment-Ordner (wenn wir in _verse/tools sind)
    # Da das Setup etwas tricky ist:
    # 1. runner.js führt die files in experiments/<exp>/_verse/tools aus
    # 2. Die config.json liegt in experiments/<exp>/config.json
    
    exp_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(exp_dir, 'config.json')
    
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            _config_cache = json.load(f)
            return _config_cache
    
    # Fallback für Tests (Laden aus sim_engine/core-config.json)
    fallback_path = os.path.join(base_dir, 'sim_engine', 'core-config.json')
    if os.path.exists(fallback_path):
        with open(fallback_path, 'r') as f:
            return json.load(f)
            
    return {}

def get_physics_constants():
    conf = get_config()
    defaults = {
        "travel_speed_per_tick": 300,
        "energy_cost_per_distance": 0.1,
        "idle_drain": 5,
        "scan_range_min": 500,
        "scan_range_max": 1500
    }
    return conf.get('physics_constants', defaults)
