import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service, config_service, system_service

def withdraw(agent_id, target, resource, amount):
    rules = config_service.get_economy_rules()
    tool_cost = rules.get('tool_costs', {}).get('withdraw', {}).get('energy', 5)
    
    if target.lower() != 'silo':
        print("[DENIED] Du kannst Ressourcen nur aus einem 'silo' abholen.")
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return

    if agent['energy'] < tool_cost:
        print(f"[DENIED] Insufficient energy ({agent['energy']}/{tool_cost}E).")
        conn.close()
        return
        
    amount = int(amount)
    sys_name = agent['location']
    system = system_service.get_system_or_fail(cursor, sys_name)
    if not system:
        conn.close()
        return

    key = f"{resource.lower()}_stored"
    try:
        stored_val = system[key]
    except (KeyError, TypeError):
        print(f"[ERROR] Ressource '{resource}' im System-Depot nicht verfügbar.")
        conn.close()
        return

    if stored_val < amount:
        print(f"[ERROR] Depot only has {stored_val} {resource}.")
        amount = stored_val
        
    if amount <= 0:
        conn.close()
        return

    current_val = agent['matter'] if resource == "matter" else agent['energy']
    # Dynamisches Limit aus Economy Rules beziehen (Default 500 für Energie)
    limit = agent['storage_limit'] if resource == "matter" else rules.get('agent_limits', {}).get('energy', 500)
    
    if current_val + amount > limit:
        amount = limit - current_val
        
    if amount <= 0:
        print(f"[INFO] Dein {resource}-Speicher ist bereits am Limit.")
        conn.close()
        return

    # Bestände & Energie aktualisieren
    if resource == 'matter':
        cursor.execute("UPDATE agents SET matter = matter + ?, energy = energy - ? WHERE id = ?", (amount, tool_cost, agent['id']))
        system_service.update_system_resources(cursor, sys_name, matter_change=-amount)
    else:
        # Ein einziges UPDATE für energy, um Spalten-Kollision in SQLite zu vermeiden
        cursor.execute("UPDATE agents SET energy = energy + ? - ? WHERE id = ?", (amount, tool_cost, agent['id']))
        system_service.update_system_resources(cursor, sys_name, energy_change=-amount)
    
    conn.commit()
    conn.close()
    print(f"[SUCCESS] {amount} {resource} taken from depot. Energy -{tool_cost}.")
if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('withdraw', {}).get('energy', 5)
        print("Syntax: python3 tools/withdraw.py <agent_id> <'silo'> <matter|energy> <amount>")
        print(f"Beschreibung: Entnimmt Ressourcen aus einem System-Depot (Silo) in dein persönliches Inventar. Kostet {cost} Energie.")
        sys.exit(0)
    elif len(sys.argv) > 4:
        withdraw(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Syntax: python3 tools/withdraw.py <agent_id> <'silo'> <matter|energy> <amount>. Nutze --help.")
