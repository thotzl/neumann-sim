import sqlite3
import sys
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def pickup(agent_id, target, resource, amount):
    if target.lower() != 'silo':
        print("[DENIED] You can only pick up resources from a.")
        return
    conn = get_connection()
    cursor = conn.cursor()
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    amount = int(amount)
    sys_name = agent['location']
    cursor.execute("SELECT * FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()
    stored_val = system[f'{resource}_stored']
    if stored_val < amount:
        print(f"[ERROR] Depot only has {stored_val} {resource}.")
        return
    current_val = agent['matter'] if resource == "matter" else agent['energy']
    limit = agent['storage_limit'] if resource == "matter" else 200
    if current_val + amount > limit: amount = limit - current_val
    cursor.execute(f"UPDATE agents SET {resource} = {resource} + ? WHERE id = ?", (amount, agent['id']))
    cursor.execute(f"UPDATE systems SET {resource}_stored = {resource}_stored - ? WHERE name = ?", (amount, sys_name))
    conn.commit()
    conn.close()
    print(f"[SUCCESS] {amount} {resource} taken from depot.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/pickup.py <deine_id> <'silo'> <matter|energy> <menge>")
        print("Beschreibung: Entnimmt Ressourcen aus einem System-Depot (Silo/Batterie) in dein persönliches Inventar.")
    elif len(sys.argv) > 4:
        pickup(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Fehler: Syntax: python3 tools/pickup.py <id> <'silo'> <resource> <amount>. Nutze --help.")
