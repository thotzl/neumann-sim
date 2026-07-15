import sqlite3
import os

db_path = 'experiments/move-sandbox/_verse/universe.db'
if not os.path.exists(db_path): exit(1)
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("INSERT OR REPLACE INTO systems (name, x, y, extractable_matter_in_core, depot_energy_capacity) VALUES ('SYS-X-1200-Y-1200', -1200, -1200, 0, 0)")
cursor.execute("UPDATE agents SET energy_inventory = 1000 WHERE id = 'Instance-1'")
conn.commit()
conn.close()
