import os, glob, re
test_dir = 'bob_os/test_suite'
for root, dirs, files in os.walk(test_dir):
    for f in files:
        if f.endswith('.py') and f.startswith('test_v3_'):
            p = os.path.join(root, f)
            with open(p, 'r') as file:
                content = file.read()
            
            # The v3 tests were broken because we removed the default inserts from init_db.py
            # So they are calling init_db.init() and expecting Bob-1 and SYS-X0-Y0 to be there.
            # We need to insert them explicitly in these tests.
            
            replacement = """        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS-X0-Y0', 10000, 10000)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, raw_matter_inventory, energy_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id) VALUES ('Bob-1', 'Original-Bob', 'SYS-X0-Y0', 0, 500, 300, 'active', 0, 0, 1)")
        conn.commit()
        conn.close()"""
        
            content = content.replace("        init_db.init()", replacement)
            
            with open(p, 'w') as file:
                file.write(content)
print("V3 tests fixed.")
