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
