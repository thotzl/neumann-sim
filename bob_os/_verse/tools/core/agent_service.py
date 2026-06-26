def get_agent_or_fail(cursor, agent_id, required_columns="*"):
    cursor.execute(f"SELECT {required_columns} FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
    return agent

def require_active_status(agent, tool_name):
    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Triebwerke aktiv. {tool_name} im interstellaren Raum unmöglich.")
        return False
    return True
