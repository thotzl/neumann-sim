import sqlite3

db_path = 'experiments/foobar/_verse/universe.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
# Bob-2 einfügen (falls noch nicht da)
cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, status, matter, energy, storage_limit) VALUES ('Bob-2', 'Clone', 'SYS-X0-Y0', 'active', 0, 100, 300)")
# Nachricht einfügen
cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES ('Bob-2', 'Bob-1', 'Hey Bob-1, hoerst du mich? (Test)')")
conn.commit()
conn.close()

print("Test-Setup abgeschlossen.")
