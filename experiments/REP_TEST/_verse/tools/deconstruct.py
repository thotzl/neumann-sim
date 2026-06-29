import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service

def deconstruct(agent_id, infra_id):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/deconstruct.py <deine_id> <infra_id>")
        print("Beschreibung: Baut ein Infrastruktur-Objekt ab und erstattet 50% der Materie-Kosten in das System-Silo zurück.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    if not agent_service.require_active_status(agent, 'Rückbau'): return

    # 2. Infrastruktur-Objekt laden
    cursor.execute("SELECT * FROM infrastructure WHERE id = ? AND system_name = ?", (infra_id, agent['location']))
    infra = cursor.fetchone()
    if not infra:
        print(f"[ERROR] Infrastructure object not found at your location.")
        conn.close()
        return

    # 3. Erstattung berechnen (50% der required_matter)
    refund = int(infra['required_matter'] * 0.5)
    
    try:
        # Löschen des Objekts
        cursor.execute("DELETE FROM infrastructure WHERE id = ?", (infra_id,))
        # Gutschrift im Silo (Physik: Materie landet im Depot)
        cursor.execute("UPDATE systems SET matter_stored = matter_stored + ? WHERE name = ?", (refund, agent['location']))
        
        conn.commit()
        print(f"[SUCCESS] {infra['type']} (ID: {infra_id}) deconstructed. {refund} matter refunded to the silo.")
    except Exception as e:
        print(f"[ERROR] Deconstruction failed: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/deconstruct.py <deine_id> <infra_id>")
        print("Beschreibung: Baut ein Infrastruktur-Objekt ab und erstattet 50% der Materie-Kosten in das System-Silo zurück.")
        sys.exit(0)
    if len(sys.argv) > 2:
        deconstruct(sys.argv[1], sys.argv[2])
    else:
        print("[DENIED] Syntax: python3 tools/deconstruct.py <agent_id> <infra_id>")
