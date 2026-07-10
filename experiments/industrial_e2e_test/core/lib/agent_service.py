def get_agent_or_fail(cursor, agent_id, required_columns="*"):
    cursor.execute(f"SELECT {required_columns} FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} not found.")
    return agent

def require_active_status(agent, tool_name):
    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Engines active. {tool_name} impossible in interstellar space.")
        return False
    return True
