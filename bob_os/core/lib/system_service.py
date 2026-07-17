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
