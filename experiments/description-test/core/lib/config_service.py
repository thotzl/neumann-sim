import os
import json

_config_cache = None

def get_config():
    global _config_cache
    if _config_cache: return _config_cache

    # WICHTIG: Keine Fallbacks auf alte Strukturen.
    # Erwarte config.json im Experiment-Root oder via Umgebungsvariable.
    
    config_path = os.environ.get('BOB_CONFIG_PATH')
    
    if not config_path:
        # Pfad-Logik für neue Struktur:
        # Diese Datei liegt in <exp_root>/core/lib/config_service.py
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

def get_physics_constants():
    conf = get_config()
    # Harte Defaults im Code (kein Filesystem-Suchen mehr)
    defaults = {
        "travel_speed_per_tick": 300,
        "energy_cost_per_distance": 0.1,
        "idle_drain": 5,
        "scan_range_min": 500,
        "scan_range_max": 1500
    }
    
    if 'physics_constants' in conf:
        return conf['physics_constants']
    return defaults
