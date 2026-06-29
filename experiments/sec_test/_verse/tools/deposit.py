import sys
import sqlite3
from core.lib.db_config import get_connection
from core.lib import agent_service, config_service, system_service

def deposit(agent_id, target_type, resource_type, amount):
    rules = config_service.get_economy_rules()
    tool_cost = rules.get('tool_costs', {}).get('deposit', {}).get('energy', 5)
    
    amount = int(amount)
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

    sys_name = agent['location']
    system = system_service.get_system_or_fail(cursor, sys_name)
    if not system:
        conn.close()
        return

    if resource_type == 'matter':
        if agent['matter'] < amount:
            print(f"[ERROR] Insufficient matter. Has {agent['matter']}, tried to deposit {amount}.")
            conn.close()
            return
        
        if system['matter_stored'] + amount > system['matter_cap']:
            print(f"[ERROR] Silo full. Max capacity: {system['matter_cap']}.")
            conn.close()
            return
        
        cursor.execute("UPDATE agents SET matter = matter - ?, energy = energy - ? WHERE id = ?", (amount, tool_cost, agent['id']))
        system_service.update_system_resources(cursor, sys_name, matter_change=amount)
        print(f"[SUCCESS] {amount} matter transferred to silo. Energy -{tool_cost}.")

    else:
        print(f"[ERROR] Agents cannot deposit {resource_type} directly into the system depot.")
        conn.close()
        return

    conn.commit()
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('deposit', {}).get('energy', 5)
        print("Usage: python3 tools/deposit.py <agent_id> <target_type> <resource_type> <amount>")
        print(f"Beschreibung: Überträgt Ressourcen von deinem Inventar in ein System-Depot oder an einen anderen Agenten im gleichen System. Kostet {cost} Energie.")
        sys.exit(0)
    if len(sys.argv) != 5:
        print("Usage: python3 tools/deposit.py <agent_id> <target_type> <resource_type> <amount>")
        sys.exit(1)
    deposit(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
