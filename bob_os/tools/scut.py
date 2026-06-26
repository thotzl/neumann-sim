import sqlite3
import sys
from db_config import get_connection

def scut(sender, receiver, msg):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (sender, receiver, msg))
        conn.commit()
        print(f"[SCUT] Nachricht von {sender} an {receiver} im Subraum-Netzwerk abgesetzt.")
    except Exception as e:
        print(f"[SCUT FEHLER] {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 tools/scut.py <Sender_ID> <Receiver_ID/'ALL'> <Nachricht>")
    elif len(sys.argv) == 2:
        # Falls nur eine Nachricht in Anführungszeichen kommt
        print("[SCUT FEHLER] Sender-ID und Empfänger-ID fehlen.")
    elif len(sys.argv) == 3:
        # Falls Sender-ID und Nachricht kommen
        print("[SCUT FEHLER] Empfänger-ID fehlt.")
    else:
        scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
