import sqlite3
import random
from db_config import get_connection

def scan():
    conn = get_connection()
    cursor = conn.cursor()
    new_sys = f"System_{random.randint(100,999)}"
    res = random.randint(1000, 3000)
    try:
        cursor.execute("INSERT INTO systems (name, resources) VALUES (?, ?)", (new_sys, res))
        conn.commit()
        print(f"[SCAN] Neues System '{new_sys}' (Res: {res}) in Datenbank kartografiert.")
    except: pass
    conn.close()

if __name__ == "__main__": scan()
