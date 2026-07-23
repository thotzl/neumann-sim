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
