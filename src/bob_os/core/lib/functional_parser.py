import re

# Definition of methods and their parameter structure
# 'greedy' defines which parameter consumes the rest of the string (usually the last one)
METHOD_META = {
    "mine": {"params": ["times"], "greedy": None},
    "build": {"params": ["building_type", "matter_to_invest"], "greedy": None},
    "refine": {"params": ["raw_matter_to_refine"], "greedy": None},
    "repair": {"params": ["structure_id", "hp_to_restore"], "greedy": None},
    "deconstruct": {"params": ["structure_id"], "greedy": None},
    "move": {"params": ["target_x", "target_y", "system_id", "ship_id", "instance_id"], "greedy": None},
    "replicate": {"params": [], "greedy": None},
    "set_name": {"params": ["name"], "greedy": "name"},
    "rename_system": {"params": ["new_name"], "greedy": "new_name"},
    "link_gate": {"params": ["target_sector"], "greedy": "target_sector"},
    "scan": {"params": [], "greedy": None},
    "deposit": {"params": ["quantity", "resource_type"], "greedy": None},
    "withdraw": {"params": ["resource_type", "quantity"], "greedy": None},
    "transfer": {"params": ["receiver_id", "resource_type", "quantity"], "greedy": None},
    "scut": {"params": ["receiver_id", "message", "priority"], "greedy": "message"},
    "ping_sos": {"params": ["message"], "greedy": "message"},
    "reclaim_sos": {"params": [], "greedy": None},
    "talk": {"params": ["target_id", "message"], "greedy": "message"},
    "memo": {"params": ["action", "content", "id", "query", "status"], "greedy": "content"},
    "docs": {"params": ["action", "title", "content", "id", "query"], "greedy": "content"},
    "sleep": {"params": ["duration", "ignore_scut"], "greedy": None},
    "storage": {"params": [], "greedy": None},
    "dashboard": {"params": [], "greedy": None, "internal": True},
    "entities": {"params": [], "greedy": None},
    "fs": {"params": [], "greedy": None},
    "board": {"params": ["ship_id"], "greedy": None},
    "exit_ship": {"params": [], "greedy": None},
    "inspect": {"params": ["ship_id", "structure_id", "system_name", "blueprint_name"], "greedy": None},
    "map": {"params": ["range", "query", "system_id"], "greedy": "query"},
    "route": {"params": ["target_x", "target_y"], "greedy": None},
    "eta": {"params": ["target_x", "target_y"], "greedy": None},
    "network": {"params": [], "greedy": None},
    "design_blueprint": {"params": ["name", "matrix_json"], "greedy": "matrix_json"},
    "save_blueprint": {"params": ["name", "matrix_json"], "greedy": "matrix_json"},
    "view_blueprint": {"params": ["name"], "greedy": None},
    "list_blueprints": {"params": [], "greedy": None},
    "delete_blueprint": {"params": ["name"], "greedy": None},
    "build_ship": {"params": ["blueprint_name", "matter_to_invest"], "greedy": None},
    "deconstruct_ship": {"params": ["ship_id"], "greedy": None},
    "rename_ship": {"params": ["ship_id", "new_name"], "greedy": "new_name"}
}

def parse_functional_string(s):
    """
    Parses a functional string like method(key=val, ...) or just method.
    Returns a dict {'method': str, 'params': dict}.
    """
    s = s.strip()
    match = re.match(r"^(\w+)(?:\s*\((.*)\))?$", s)
    if not match:
        return None
    
    method = match.group(1).lower()
    raw_args = match.group(2)
    
    params = {}
    if not raw_args or raw_args.strip() == "":
        return {"method": method, "params": params}
    
    raw_args = raw_args.strip()
    
    meta = METHOD_META.get(method)
    if not meta:
        # Unknown method, we still try to parse
        meta = {"params": [], "greedy": None}

    # We parse key-value pairs
    # Strategy: We look for key= patterns from the meta-info
    # If no key is found, we assume it's positional (optional support)
    
    current_str = raw_args
    
    # 1. Find all keys that are actually in the string
    found_keys = []
    for key in meta["params"]:
        # Regex searches for key, optional whitespace, and the equals sign
        # We must pay attention to word boundaries, so that e.g. "to=" is not found in "photo="
        pattern = rf"\b{key}\s*="
        matches = list(re.finditer(pattern, current_str))
        if matches:
            # We only take the first match per key (LLMs should not name keys twice)
            found_keys.append({"key": key, "start": matches[0].start(), "end": matches[0].end()})
            
    if found_keys:
        # Sort by position in the string
        found_keys.sort(key=lambda x: x["start"])
        
        for i, k_info in enumerate(found_keys):
            key = k_info["key"]
            val_start = k_info["end"]
            
            # Where does the value end? At the start of the NEXT found key, or at the end of the string.
            if i + 1 < len(found_keys):
                val_end = found_keys[i+1]["start"]
            else:
                val_end = len(current_str)
                
            val_raw = current_str[val_start:val_end].strip()
            
            if meta.get("greedy") != key:
                # If the value is in quotes, extract exactly that
                if val_raw.startswith('"'):
                    val_clean = val_raw[1:].split('"')[0]
                elif val_raw.startswith("'"):
                    val_clean = val_raw[1:].split("'")[0]
                else:
                    # Otherwise, read only up to the first comma
                    val_clean = val_raw.split(',')[0].strip()
            else:
                # Greedy mode: take everything, just trim edges
                val_clean = val_raw.rstrip(",")
                if (val_clean.startswith('"') and val_clean.endswith('"')) or (val_clean.startswith("'") and val_clean.endswith("'")):
                    val_clean = val_clean[1:-1]
            
            params[key] = val_clean.strip()
            
    # Fallback: Positional parsing, if NO keys were found at all
    elif raw_args:
        # We only split by commas
        parts = [p.strip().strip("\"' ") for p in raw_args.split(",")]
        for i, p_name in enumerate(meta["params"]):
            if i < len(parts):
                params[p_name] = parts[i]

    return {"method": method, "params": params}