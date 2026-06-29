
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
cursor = conn.cursor()

# 1. Existiert Bob-2?
cursor.execute("SELECT chosen_name FROM agents WHERE id = 'Bob-2'")
agent = cursor.fetchone()
if not agent:
    print("FEHLER: Bob-2 existiert nicht in der Datenbank.")
    sys.exit(1)

# 2. Hat Bob-2 sich umbenannt? (Beweis für Autonomie-Direktive)
if agent[0] == 'Unnamed':
    print("FEHLER: Bob-2 hat seinen Namen nicht geändert. (Noch 'Unnamed'). Autonomie-Direktive ignoriert.")
    sys.exit(1)

print("ERFOLG: Bob-2 existiert und hat sich autonom umbenannt: " + agent[0])
conn.close()
