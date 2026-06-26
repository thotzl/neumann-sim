import sqlite3
import random
from db_config import get_connection

def scan():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM systems ORDER BY name DESC LIMIT 1")
    last = cursor.fetchone()
    
    if not last or not last[0].startswith("System_"):
        new_name = "System_B"
    else:
        last_char = last[0].split('_')[-1]
        new_name = f"System_{chr(ord(last_char) + 1)}"
        
    res = random.randint(1000, 5000)
    try:
        cursor.execute("INSERT INTO systems (name, resources) VALUES (?, ?)", (new_name, res))
        conn.commit()
        print(f"[SCAN] {new_name} entdeckt ({res} Ressourcen).")
    except:
        print("[INFO] Kein neues System in Reichweite.")
    conn.close()

if __name__ == "__main__": scan()
