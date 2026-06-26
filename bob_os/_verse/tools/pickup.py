import sqlite3
import sys
from db_config import get_connection

def pickup(agent_id, target, resource, amount):
    if target.lower() != 'silo':
        print("[VERWEIGERT] Du kannst Ressourcen nur aus einem 'silo' abholen.")
        return
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent: return
    amount = int(amount)
    sys_name = agent['location']
    cursor.execute("SELECT * FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()
    stored_val = system[f'{resource}_stored']
    if stored_val < amount:
        print(f"[FEHLER] Depot hat nur {stored_val} {resource}.")
        return
    current_val = agent['matter'] if resource == "matter" else agent['energy']
    limit = agent['storage_limit'] if resource == "matter" else 200
    if current_val + amount > limit: amount = limit - current_val
    cursor.execute(f"UPDATE agents SET {resource} = {resource} + ? WHERE id = ?", (amount, agent['id']))
    cursor.execute(f"UPDATE systems SET {resource}_stored = {resource}_stored - ? WHERE name = ?", (amount, sys_name))
    conn.commit()
    conn.close()
    print(f"[ERFOLG] {amount} {resource} aus Depot entnommen.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/pickup.py <deine_id> <'silo'> <matter|energy> <menge>")
        print("Beschreibung: Entnimmt Ressourcen aus einem System-Depot (Silo/Batterie) in dein persönliches Inventar.")
    elif len(sys.argv) > 4:
        pickup(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Fehler: Syntax: python3 tools/pickup.py <id> <'silo'> <resource> <amount>. Nutze --help.")
