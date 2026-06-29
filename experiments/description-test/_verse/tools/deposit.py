import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service

def deposit(agent_id, target, resource, amount):
    conn = get_connection()
    cursor = conn.cursor()
    initiator = agent_service.get_agent_or_fail(cursor, agent_id)
    if not initiator: return
    amount = int(amount)
    sys_name = initiator['location']

    if target.lower() == 'silo':
        cursor.execute("SELECT * FROM systems WHERE name = ?", (sys_name,))
        target_obj = cursor.fetchone()
        is_agent = False
    else:
        cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents WHERE (id = ? OR chosen_name = ?) AND location = ?", (target, target, sys_name))
        target_obj = cursor.fetchone()
        is_agent = True
        if not target_obj:
            print(f"[ERROR] Target not found in.")
            return

    init_val = initiator['matter'] if resource == "matter" else initiator['energy']
    if init_val < amount:
        print(f"[ERROR] You only have {init_val} {resource}. (Attempt: {amount})")
        return

    if not is_agent:
        current_stored = target_obj[f'{resource}_stored']
        max_cap = target_obj[f'{resource}_cap']
        if resource == "matter" and current_stored + amount > max_cap:
            print(f"[ERROR] Depot full ({current_stored}/{max_cap}).")
            return
        cursor.execute(f"UPDATE systems SET {resource}_stored = {resource}_stored + ? WHERE name = ?", (amount, sys_name))
    else:
        limit = target_obj['storage_limit'] if resource == "matter" else 200
        current = target_obj['matter'] if resource == "matter" else target_obj['energy']
        if current + amount > limit: amount = limit - current
        cursor.execute(f"UPDATE agents SET {resource} = {resource} + ? WHERE id = ?", (amount, target_obj['id']))

    cursor.execute(f"UPDATE agents SET {resource} = {resource} - ? WHERE id = ?", (amount, initiator['id']))
    conn.commit()
    conn.close()
    print(f"[SUCCESS] {amount} {resource} an {target} transferred.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/deposit.py <deine_id> <ziel_id|'silo'> <matter|energy> <menge>")
        print("Beschreibung: Überträgt Ressourcen von deinem Inventar in ein System-Depot oder an einen anderen Agenten im gleichen System.")
    elif len(sys.argv) > 4:
        deposit(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Fehler: Syntax: python3 tools/deposit.py <id> <target|'silo'> <resource> <amount>. Nutze --help.")
