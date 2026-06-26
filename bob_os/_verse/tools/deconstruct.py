import sqlite3
import sys
from db_config import get_connection

def deconstruct(agent_id, infra_id):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/deconstruct.py <deine_id> <infra_id>")
        print("Beschreibung: Baut ein Infrastruktur-Objekt ab und erstattet 50% der Materie-Kosten in das System-Silo zurück.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Standort des Agenten prüfen
    cursor.execute("SELECT location FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        conn.close()
        return

    # 2. Infrastruktur-Objekt laden
    cursor.execute("SELECT * FROM infrastructure WHERE id = ? AND system_name = ?", (infra_id, agent['location']))
    infra = cursor.fetchone()
    if not infra:
        print(f"[FEHLER] Infrastruktur-Objekt {infra_id} nicht an deinem Standort gefunden.")
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
        print(f"[ERFOLG] {infra['type']} (ID: {infra_id}) abgebaut. {refund} Materie an das Silo erstattet.")
    except Exception as e:
        print(f"[FEHLER] Rückbau fehlgeschlagen: {e}")
    
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        deconstruct(sys.argv[1], sys.argv[2])
    else:
        print("[VERWEIGERT] Syntax: python3 tools/deconstruct.py <agent_id> <infra_id>")
