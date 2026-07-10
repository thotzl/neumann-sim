import re

# Definition der Methoden und ihrer Parameter-Struktur
# 'greedy' definiert, welcher Parameter den Rest des Strings schluckt (meist der letzte)
METHOD_META = {
    "mine": {"params": [], "greedy": None},
    "build": {"params": ["type", "amount"], "greedy": None},
    "deconstruct": {"params": ["infra_id"], "greedy": None},
    "move": {"params": ["target_sys"], "greedy": None},
    "replicate": {"params": ["new_id"], "greedy": None},
    "refine": {"params": ["amount"], "greedy": None},
    "repair": {"params": ["infra_id", "amount"], "greedy": None},
    "set_name": {"params": ["name"], "greedy": "name"},
    "rename_system": {"params": ["new_name"], "greedy": "new_name"},
    "scan": {"params": [], "greedy": None},
    "deposit": {"params": ["amount", "resource"], "greedy": None},
    "withdraw": {"params": ["resource", "amount"], "greedy": None},
    "transfer": {"params": ["to", "resource", "amount"], "greedy": None},
    "scut": {"params": ["to", "msg"], "greedy": "msg"},
    "poll": {"params": [], "greedy": None},
    "storage": {"params": [], "greedy": None},
    "dashboard": {"params": [], "greedy": None},
    "entities": {"params": [], "greedy": None},
    "fs": {"params": [], "greedy": None}
}

def parse_functional_string(s):
    """
    Parsiert einen funktionalen String wie method(key=val, ...) oder nur method
    Gibt ein Dict {'method': str, 'params': dict} zurück.
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
        # Unbekannte Methode, wir versuchen dennoch zu parsen
        meta = {"params": [], "greedy": None}

    # Wir parsen Key-Value Paare
    # Strategie: Wir suchen nach key= Mustern aus der Meta-Info
    # Falls kein Key gefunden wird, nehmen wir an es ist positional (optional Support)
    
    current_str = raw_args
    
    # 1. Finde alle Keys, die tatsächlich im String stehen
    found_keys = []
    for key in meta["params"]:
        # Regex sucht nach Key, eventuellen Leerzeichen und dem Gleichheitszeichen
        # Wir müssen auf Wortgrenzen achten, damit z.B. "to=" nicht in "photo=" gefunden wird
        pattern = rf"\b{key}\s*="
        matches = list(re.finditer(pattern, current_str))
        if matches:
            # Wir nehmen nur den ersten Match pro Key (LLMs sollten Keys nicht doppelt nennen)
            found_keys.append({"key": key, "start": matches[0].start(), "end": matches[0].end()})
            
    if found_keys:
        # Sortiere nach Position im String
        found_keys.sort(key=lambda x: x["start"])
        
        for i, k_info in enumerate(found_keys):
            key = k_info["key"]
            val_start = k_info["end"]
            
            # Wo endet der Wert? Am Start des NÄCHSTEN gefundenen Keys, oder am Ende des Strings.
            if i + 1 < len(found_keys):
                val_end = found_keys[i+1]["start"]
            else:
                val_end = len(current_str)
                
            val_raw = current_str[val_start:val_end]
            
            # Bereinigung: Wir entfernen führende/folgende Leerzeichen und das letzte Komma
            val_clean = val_raw.strip().rstrip(",")
            val_clean = val_clean.strip()
            # Quotes entfernen
            val_clean = val_clean.strip("\"' ")
            
            params[key] = val_clean
            
    # Fallback: Positional Parsing, falls GAR KEINE Keys gefunden wurden
    elif raw_args:
        # Wir splitten nur nach Kommata
        parts = [p.strip().strip("\"' ") for p in raw_args.split(",")]
        for i, p_name in enumerate(meta["params"]):
            if i < len(parts):
                params[p_name] = parts[i]

    return {"method": method, "params": params}
