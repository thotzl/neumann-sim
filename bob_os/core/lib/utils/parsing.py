import json

def safe_int(val, param_name, default=None):
    """
    Konvertiert einen Parameter sicher in ein Int mit deskriptivem NameError bei Fehlschlag.
    """
    if val is None or val == '': 
        return default
    try: 
        return int(val)
    except ValueError: 
        raise ValueError(f"Parameter '{param_name}' erwartet eine Ganzzahl, erhielt aber '{val}'.")

def parse_json_matrix(matrix_json):
    """
    Parst Gitter-Matrizen flexibel (akzeptiert rohe Listen oder JSON-Strings).
    """
    if not matrix_json:
        return []
    try:
        if isinstance(matrix_json, str):
            return json.loads(matrix_json)
        return matrix_json
    except Exception as e:
        raise ValueError(f"Ungültiges Gitter-JSON Format: {str(e)}")
