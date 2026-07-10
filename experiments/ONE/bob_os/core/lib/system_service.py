import sqlite3

def get_system_or_fail(cursor, system_name):
    """
    Lädt Systemdaten oder gibt None zurück.
    """
    cursor.execute("SELECT * FROM systems WHERE name = ?", (system_name,))
    system = cursor.fetchone()
    if not system:
        print(f"[ERROR] System {system_name} not found.")
        return None
    return system

def get_infrastructure_at_location(cursor, system_name, infra_type=None, status=None):
    """
    Sucht Infrastruktur an einem Standort. Optional gefiltert nach Typ/Status.
    """
    query = "SELECT * FROM infrastructure WHERE system_name = ?"
    params = [system_name]
    
    if infra_type:
        query += " AND type = ?"
        params.append(infra_type)
    if status:
        query += " AND status = ?"
        params.append(status)
        
    cursor.execute(query, tuple(params))
    return cursor.fetchall()

def update_system_resources(cursor, system_name, matter_change=0, energy_change=0):
    """
    Ändert Depot-Bestände eines Systems.
    """
    if matter_change != 0:
        cursor.execute("UPDATE systems SET matter_stored = matter_stored + ? WHERE name = ?", (matter_change, system_name))
    if energy_change != 0:
        cursor.execute("UPDATE systems SET energy_stored = energy_stored + ? WHERE name = ?", (energy_change, system_name))
