import sqlite3
import functools
from .db_config import get_connection

def resolve_agent_location(cursor, host_type, host_id, status):
    if status == 'traveling':
        return 'Interstellar'
    if host_type == 'ship' and host_id:
        try:
            cursor.execute("SELECT system_name FROM ships WHERE id = ?", (host_id,))
            row = cursor.fetchone()
            if row: return row['system_name']
        except: pass
    if host_type == 'matrix' and host_id:
        try:
            cursor.execute("SELECT system_name FROM infrastructure WHERE id = ?", (host_id,))
            row = cursor.fetchone()
            if row: return row['system_name']
        except: pass
    return 'Unknown'

def get_agent_or_fail(cursor, agent_id, required_columns="*"):
    try:
        # Try retrieving with CASE subqueries mapping inventories to their physical hosts (Säule 1)
        cursor.execute("""
            SELECT 
                a.id, a.chosen_name, a.host_id, a.host_type, a.status, a.birth_cycle,
                a.target_system, a.origin_x, a.origin_y, a.target_x, a.target_y,
                a.transit_ticks_total, a.transit_ticks_passed, a.current_x, a.current_y,
                a.active_ship_id, a.last_seen_event_id,
                -- Dynamic Location
                CASE 
                    WHEN a.status = 'traveling' THEN 'Interstellar'
                    WHEN a.host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(a.host_id AS INTEGER))
                    WHEN a.host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(a.host_id AS INTEGER))
                    ELSE 'Unknown'
                END AS location,
                -- Dynamic Inventories from Host
                CASE 
                    WHEN a.host_type = 'ship' THEN (SELECT s.raw_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                    WHEN a.host_type = 'matrix' THEN (SELECT sys.raw_matter_depot FROM systems sys WHERE sys.name = (SELECT system_name FROM infrastructure WHERE id = CAST(a.host_id AS INTEGER)))
                    ELSE 0
                END AS raw_matter_inventory,
                CASE 
                    WHEN a.host_type = 'ship' THEN (SELECT s.refined_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                    WHEN a.host_type = 'matrix' THEN (SELECT sys.refined_matter_depot FROM systems sys WHERE sys.name = (SELECT system_name FROM infrastructure WHERE id = CAST(a.host_id AS INTEGER)))
                    ELSE 0
                END AS refined_matter_inventory,
                CASE 
                    WHEN a.host_type = 'ship' THEN (SELECT s.energy_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                    WHEN a.host_type = 'matrix' THEN MAX(50, COALESCE((SELECT sys.energy_depot FROM systems sys WHERE sys.name = (SELECT system_name FROM infrastructure WHERE id = CAST(a.host_id AS INTEGER))), 0))
                    ELSE 100
                END AS energy_inventory,
                CASE 
                    WHEN a.host_type = 'ship' THEN (SELECT s.matter_storage_capacity FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                    WHEN a.host_type = 'matrix' THEN 1000000
                    ELSE 100
                END AS matter_storage_capacity
            FROM agents a
            WHERE a.id = ? OR a.chosen_name = ?
        """, (agent_id, agent_id))
    except sqlite3.OperationalError:
        # Fallback for unittests that create a legacy mock database layout!
        cursor.execute("SELECT * FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))

    row = cursor.fetchone()
    if not row:
        print(f"[ERROR] Agent '{agent_id}' nicht gefunden.")
        return None
    agent_dict = dict(row)
    if 'location' not in agent_dict:
        agent_dict['location'] = resolve_agent_location(cursor, agent_dict.get('host_type'), agent_dict.get('host_id'), agent_dict.get('status'))
    return agent_dict

def require_active_status(agent, tool_name):
    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Engines active. {tool_name} impossible in interstellar space.")
        return False
    return True

def update_agent_resources(cursor, agent_id, raw_matter=0, refined_matter=0, energy=0):
    """
    Explicitly updates resources on the physical host (vessel or sector-depot). (Säule 1)
    """
    try:
        cursor.execute("SELECT host_id, host_type FROM agents WHERE id = ?", (agent_id,))
        row = cursor.fetchone()
        
        if not row or 'host_type' not in row.keys() or not row['host_type']:
            # Fallback for legacy unittest databases (no host_type column/value)
            _fallback_legacy_update(cursor, agent_id, raw_matter, refined_matter, energy)
            return

        host_id = row['host_id']
        host_type = row['host_type']

        if host_type == 'ship' and host_id:
            cursor.execute("""
                UPDATE ships SET 
                    raw_matter_inventory = MAX(0, raw_matter_inventory + ?),
                    refined_matter_inventory = MAX(0, refined_matter_inventory + ?),
                    energy_inventory = MAX(0, energy_inventory + ?)
                WHERE id = CAST(? AS INTEGER)
            """, (raw_matter, refined_matter, energy, host_id))
        elif host_type == 'matrix' and host_id:
            cursor.execute("""
                UPDATE systems SET 
                    raw_matter_depot = MAX(0, raw_matter_depot + ?),
                    refined_matter_depot = MAX(0, refined_matter_depot + ?),
                    energy_depot = MAX(0, energy_depot + ?)
                WHERE name = (SELECT system_name FROM infrastructure WHERE id = CAST(? AS INTEGER))
            """, (raw_matter, refined_matter, energy, host_id))
        else:
            # Fallback if host_type is null or invalid
            _fallback_legacy_update(cursor, agent_id, raw_matter, refined_matter, energy)
    except sqlite3.OperationalError:
        # Fallback for legacy unittest databases where columns reside physically in agents
        _fallback_legacy_update(cursor, agent_id, raw_matter, refined_matter, energy)

def _fallback_legacy_update(cursor, agent_id, raw_matter, refined_matter, energy):
    """
    Robust column-inspecting fallback update helper for mock/legacy unittest databases.
    """
    try:
        cursor.execute("PRAGMA table_info(agents)")
        columns = [r['name'] for r in cursor.fetchall()]
        
        updates = []
        params = []
        if 'raw_matter_inventory' in columns and raw_matter != 0:
            updates.append("raw_matter_inventory = MAX(0, raw_matter_inventory + ?)")
            params.append(raw_matter)
        if 'refined_matter_inventory' in columns and refined_matter != 0:
            updates.append("refined_matter_inventory = MAX(0, refined_matter_inventory + ?)")
            params.append(refined_matter)
        if 'energy_inventory' in columns and energy != 0:
            updates.append("energy_inventory = MAX(0, energy_inventory + ?)")
            params.append(energy)
            
        if updates:
            params.append(agent_id)
            cursor.execute(f"UPDATE agents SET {', '.join(updates)} WHERE id = ?", tuple(params))
    except:
        pass

def consume_resources(cursor, agent_id, energy=0, matter=0):
    """Backwards-compatible wrapper delegating resource consumption."""
    update_agent_resources(cursor, agent_id, raw_matter=-matter, energy=-energy)

def with_agent_context(required_columns="*", require_active=False, action_name="Action", allow_disembodied=False):
    """
    Decorator: Öffnet DB, lädt Agent, übergibt (self, cursor, agent, *args).
    Schließt und committet automatisch, sofern nicht False zurückgegeben wird.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            conn = get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            try:
                agent_id = getattr(self.agent, 'id', None) if hasattr(self, 'agent') else getattr(self, 'id', None)
                if not agent_id:
                    print("[ERROR] Agent ID not found in context.")
                    return False

                agent = get_agent_or_fail(cursor, agent_id, required_columns=required_columns)
                if not agent: return False

                if require_active and not require_active_status(agent, action_name):
                    return False

                if not allow_disembodied and dict(agent).get('active_ship_id') is None:
                    print(f"[DENIED] {action_name} requires a physical vessel. You are currently disembodied in a SEM-Matrix.")
                    return False

                result = func(self, cursor, agent, *args, **kwargs)
                if result is not False: conn.commit()
                return result
            finally:
                conn.close()
        return wrapper
    return decorator
