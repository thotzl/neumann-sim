import os
import json

_config_cache = None
_economy_cache = None

def get_config():
    global _config_cache
    if _config_cache: return _config_cache
    
    # Path logic for new structure:
    # This file is located in <exp_root>/core/lib/config_service.py
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, 'config.json')
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                _config_cache = json.load(f)
                return _config_cache
        except Exception:
            pass
            
    return {}

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
        "idle_drain": rules.get('agent_limits', {}).get('energy_drain_idle', 5),
        "scan_range_min": 500,
        "scan_range_max": 1500
    }
    
    if 'physics_constants' in conf:
        return conf['physics_constants']
    return defaults