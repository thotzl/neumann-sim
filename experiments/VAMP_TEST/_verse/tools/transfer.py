import sys
import sqlite3
import math
from core.lib.db_config import get_connection
from core.lib import agent_service, config_service, physics_service

def transfer(agent_id, target_agent_id, resource_type, amount):
    rules = config_service.get_economy_rules()
    tool_cost = rules.get('tool_costs', {}).get('transfer', {}).get('energy', 5)
    
    amount = int(amount)
    if amount <= 0:
        print("[DENIED] Menge muss größer als 0 sein.")
        return

    resource_type = resource_type.lower()
    if resource_type not in ['matter', 'energy']:
        print(f"[DENIED] Unbekannter Ressourcentyp: {resource_type}. Erlaubt: matter, energy.")
        return

    if agent_id == target_agent_id:
        print("[DENIED] Du kannst keine Ressourcen an dich selbst transferieren.")
        return

    conn = get_connection()
    cursor = conn.cursor()

    # 1. Initiator (Sender) laden
    sender = agent_service.get_agent_or_fail(cursor, agent_id)
    if not sender:
        conn.close()
        return

    # 2. Empfänger laden
    receiver = agent_service.get_agent_or_fail(cursor, target_agent_id)
    if not receiver:
        conn.close()
        return

    # 3. Energie-Check für Tool-Nutzung
    # Die Tool-Kosten (5E) fallen zusätzlich zur transferierten Menge an!
    total_energy_needed = tool_cost
    if resource_type == 'energy':
        total_energy_needed += amount

    if sender['energy'] < total_energy_needed:
        print(f"[DENIED] Nicht genügend Energie. Du hast {sender['energy']}E. Benötigt: {total_energy_needed}E (Menge + {tool_cost}E Transfergebühr).")
        conn.close()
        return

    if resource_type == 'matter' and sender['matter'] < amount:
        print(f"[DENIED] Nicht genügend Materie. Du hast {sender['matter']}M. Benötigt: {amount}M.")
        conn.close()
        return

    # 4. Proximity Check (Rendezvous Radius <= 5 Einheiten)
    dist = physics_service.calc_distance(sender['current_x'], sender['current_y'], receiver['current_x'], receiver['current_y'])
    if dist > 5.0:
        print(f"[DENIED] Ziel zu weit entfernt (Distanz: {dist:.1f}). Transfer erfordert physische Nähe (Radius <= 5.0). Nutze move.py!")
        conn.close()
        return

    # 5. Kapazitäts-Check beim Empfänger
    current_val_recv = receiver['matter'] if resource_type == 'matter' else receiver['energy']
    limit_recv = receiver['storage_limit'] if resource_type == 'matter' else rules.get('agent_limits', {}).get('energy', 500)
    
    actual_transfer = amount
    if current_val_recv + actual_transfer > limit_recv:
        actual_transfer = limit_recv - current_val_recv
        
    if actual_transfer <= 0:
        print(f"[INFO] Speicher von {target_agent_id} für {resource_type} ist voll.")
        conn.close()
        return

    # 6. Transaktion ausführen
    try:
        if resource_type == 'matter':
            cursor.execute("UPDATE agents SET matter = matter - ?, energy = energy - ? WHERE id = ?", (actual_transfer, tool_cost, sender['id']))
            cursor.execute("UPDATE agents SET matter = matter + ? WHERE id = ?", (actual_transfer, receiver['id']))
        else: # energy
            # Wir ziehen beides ab (Transfermenge + Tool-Kosten)
            cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (actual_transfer + tool_cost, sender['id']))
            cursor.execute("UPDATE agents SET energy = energy + ? WHERE id = ?", (actual_transfer, receiver['id']))

        conn.commit()
        print(f"[SUCCESS] {actual_transfer} {resource_type} an {target_agent_id} transferiert. Energie -{tool_cost} (Gebühr).")
    except Exception as e:
        print(f"[ERROR] Transfer fehlgeschlagen: {e}")

    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('transfer', {}).get('energy', 5)
        print("Syntax: python3 tools/transfer.py <agent_id> <target_agent_id> <matter|energy> <amount>")
        print(f"Beschreibung: P2P-Transfer. Überträgt Ressourcen direkt an einen anderen Agenten. Beide müssen sich am selben Ort befinden (Distanz <= 5). Kostet {cost} Energie Gebühr.")
        sys.exit(0)
    if len(sys.argv) != 5:
        print("Syntax: python3 tools/transfer.py <agent_id> <target_agent_id> <matter|energy> <amount>. Nutze --help.")
        sys.exit(1)
    transfer(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
