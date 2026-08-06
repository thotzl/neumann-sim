import json
import re
import string
import random

def safe_int(val, param_name, default=None):
    """
    Safely converts a parameter to an int with a descriptive ValueError on failure.
    """
    if val is None or val == '': 
        return default
    try: 
        return int(val)
    except ValueError: 
        raise ValueError(f"Parameter '{param_name}' expects an integer, but received '{val}'.")

def safe_float(val, param_name, default=None):
    """
    Safely converts a parameter to a float with a descriptive ValueError on failure.
    """
    if val is None or val == '':
        return default
    try:
        return float(val)
    except ValueError:
        raise ValueError(f"Parameter '{param_name}' expects a float, but received '{val}'.")

def parse_json_matrix(matrix_json):
    """
    Flexibly parses grid matrices (accepts raw lists or JSON strings).
    """
    if not matrix_json:
        return []
    try:
        if isinstance(matrix_json, str):
            return json.loads(matrix_json)
        return matrix_json
    except Exception as e:
        raise ValueError(f"Invalid grid JSON format: {str(e)}")

def parse_coords_from_name(name: str):
    """
    Extracts the precise integer coordinates (x, y) from a Sektor ID string (e.g. 'SYS_X2400_Y-1600').
    Returns (x, y) as a tuple of ints, or None if the format is invalid.
    """
    if not name or not isinstance(name, str):
        return None
    match = re.match(r"^SYS_X(-?\d+)_Y(-?\d+)$", name)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None

def format_system_id(x: float, y: float) -> str:
    """
    Snaps raw coordinates to the nearest 100-grid and formats them into a standard Sektor ID.
    (e.g., 2381.4, -1621.8 -> 'SYS_X2400_Y-1600')
    """
    snapped_x = int(round(float(x) / 100.0) * 100.0)
    snapped_y = int(round(float(y) / 100.0) * 100.0)
    return f"SYS_X{snapped_x}_Y{snapped_y}"

def generate_replicant_id(x: float, y: float, cycle: int, suffix: str = None) -> str:
    """
    Symmetrically generates a unique Replicant ID following the RSNS standard:
    Format: X{x_code}Y{y_code}-C{cycle}-{suffix}
    Example: 2200, -20300, 0, 'ROBERT' -> 'X22Y-203-C0-ROBERT'
    """
    x_code = int(float(x) / 100.0)
    y_code = int(float(y) / 100.0)
    loc_seg = f"X{x_code}Y{y_code}"
    cycle_seg = f"C{int(cycle)}"
    
    # If no suffix provided, generate a unique 6-digit alphanumeric string
    if not suffix:
        uniq_chars = string.ascii_uppercase + string.digits
        suffix = "".join(random.choices(uniq_chars, k=6))
        
    return f"{loc_seg}-{cycle_seg}-{suffix}"