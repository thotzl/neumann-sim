import sqlite3
import sys
from db_config import get_connection

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
    if len(sys.argv) > 3: scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
