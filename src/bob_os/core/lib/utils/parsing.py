import json

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