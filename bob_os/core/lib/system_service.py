import sqlite3

def get_system_or_fail(cursor, system_name):
    """
    Lädt Systemdaten oder gibt None zurück.
    """
    cursor.execute("SELECT * FROM systems WHERE name = ?", (system_name,))
    return cursor.fetchone()

def get_infrastructure_at_location(cursor, system_name):
    cursor.execute("SELECT * FROM infrastructure WHERE system_name = ?", (system_name,))
    return cursor.fetchall()

def update_system_resources(cursor, system_name, matter_change=0, energy_change=0):
    updates = []
    params = []
    
    if matter_change != 0:
        updates.append("raw_matter_depot = raw_matter_depot + ?")
        params.append(matter_change)
    if energy_change != 0:
        updates.append("energy_depot = energy_depot + ?")
        params.append(energy_change)
        
    if updates:
        params.append(system_name)
        cursor.execute(f"UPDATE systems SET {', '.join(updates)} WHERE name = ?", tuple(params))

def has_active_infrastructure(cursor, system_name, infra_types):
    """
    Checks if there is active infrastructure of the specified type(s) at the system.
    `infra_types` can be a string or a list/tuple of strings.
    """
    if isinstance(infra_types, str):
        infra_types = [infra_types]
        
    placeholders = ", ".join(["?"] * len(infra_types))
    query = f"SELECT id FROM infrastructure WHERE system_name = ? AND type IN ({placeholders}) AND status = 'active'"
    params = [system_name] + list(infra_types)
    cursor.execute(query, params)
    return cursor.fetchone() is not None
