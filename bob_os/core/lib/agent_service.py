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
    cursor.execute("SELECT * FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    row = cursor.fetchone()
    if not row:
        print(f"[ERROR] Agent '{agent_id}' nicht gefunden.")
        return None
    agent_dict = dict(row)
    if 'host_id' in agent_dict or 'host_type' in agent_dict:
        agent_dict['location'] = resolve_agent_location(cursor, agent_dict.get('host_type'), agent_dict.get('host_id'), agent_dict.get('status'))
    return agent_dict

def require_active_status(agent, tool_name):
    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Engines active. {tool_name} impossible in interstellar space.")
        return False
    return True

def consume_resources(cursor, agent_id, energy=0, matter=0):
    """Zieht Ressourcen ab. Erwartet positive Werte. Nutzt Floor-Guard (0)."""
    updates = []
    params = []
    
    if energy > 0:
        updates.append("energy_inventory = MAX(0, energy_inventory - ?)")
        params.append(energy)
    
    if matter > 0:
        updates.append("raw_matter_inventory = MAX(0, raw_matter_inventory - ?)")
        params.append(matter)
    
    if updates:
        params.append(agent_id)
        cursor.execute(f"UPDATE agents SET {', '.join(updates)} WHERE id = ?", tuple(params))

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
