import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service

def pickup(agent_id, target, resource, amount):
    if target.lower() != 'silo':
        print("[DENIED] Du kannst Ressourcen nur aus einem 'silo' abholen.")
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return
        
    amount = int(amount)
    sys_name = agent['location']
    
    cursor.execute("SELECT * FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()
    
    if not system:
        print(f"[ERROR] System {sys_name} nicht gefunden.")
        conn.close()
        return

    # Dynamische Key-Ermittlung (matter_stored oder energy_stored)
    key = f"{resource.lower()}_stored"
    
    # Sicherstellen, dass der Key in der Row existiert (Verteidigung gegen Schema-Melt)
    try:
        stored_val = system[key]
    except (KeyError, TypeError):
        print(f"[ERROR] Ressource '{resource}' im System-Depot nicht verfügbar.")
        conn.close()
        return

    if stored_val < amount:
        print(f"[ERROR] Depot hat nur {stored_val} {resource}.")
        amount = stored_val # Nehme was da ist
        
    if amount <= 0:
        conn.close()
        return

    current_val = agent['matter'] if resource == "matter" else agent['energy']
    limit = agent['storage_limit'] if resource == "matter" else 200
    
    if current_val + amount > limit:
        amount = limit - current_val
        
    if amount <= 0:
        print(f"[INFO] Dein {resource}-Speicher ist bereits am Limit.")
        conn.close()
        return

    # Bestände aktualisieren
    cursor.execute(f"UPDATE agents SET {resource} = {resource} + ? WHERE id = ?", (amount, agent['id']))
    cursor.execute(f"UPDATE systems SET {key} = {key} - ? WHERE name = ?", (amount, sys_name))
    
    conn.commit()
    conn.close()
    print(f"[SUCCESS] {amount} {resource} aus Depot entnommen.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/pickup.py <deine_id> <'silo'> <matter|energy> <menge>")
        print("Beschreibung: Entnimmt Ressourcen aus einem System-Depot (Silo/Batterie) in dein persönliches Inventar.")
    elif len(sys.argv) > 4:
        pickup(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Syntax: python3 tools/ python3 tools/pickup.py <id> <'silo'> <resource> <amount>. Nutze --help.")
