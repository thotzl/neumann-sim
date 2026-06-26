import sqlite3
import sys
from db_config import get_connection

def poll_radio(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT rowid, sender, content FROM messages WHERE receiver = ? OR receiver = 'ALL'", (agent_id,))
    rows = cursor.fetchall()
    
    if rows:
        output = ""
        delete_ids = []
        for r in rows:
            output += f"Von {r['sender']}: {r['content']}\n"
            delete_ids.append(str(r['rowid']))
            
        placeholders = ','.join('?' * len(delete_ids))
        cursor.execute(f"DELETE FROM messages WHERE rowid IN ({placeholders}) AND receiver = ?", (*delete_ids, agent_id))
        conn.commit()
        print(output.strip())
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1: poll_radio(sys.argv[1])
