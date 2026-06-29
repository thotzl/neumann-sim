import sqlite3
import sys
from system_libs.db_config import get_connection

def scut(sender, receiver, msg):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print("Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (sender, receiver, msg))
    conn.commit()
    conn.close()
    print(f"[SCUT] Transmission sent to.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print("Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais.")
    elif len(sys.argv) > 3:
        scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("[DENIED] Syntax: python3 tools/scut.py <sender> <receiver> <msg>")
