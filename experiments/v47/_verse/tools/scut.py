import sqlite3
import sys
from db_config import get_connection
    if "--help" in sys.argv: print("Syntax: python3 tools/scut.py <deine_id> <ziel_id> <nachricht>\nBeschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais."); return

def scut(sender, receiver, msg):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (sender, receiver, msg))
        conn.commit()
        print(f"[SCUT] Nachricht an {receiver} gesendet.")
    except Exception as e:
        print(f"[SCUT FEHLER] {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 3: scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
