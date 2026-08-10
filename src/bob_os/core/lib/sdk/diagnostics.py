import os
import sys
import json

try:
    from .. import agent_service
except ImportError:
    from core.lib import agent_service

class Diagnostics:
    def __init__(self, agent):
        self.agent = agent
        # Fix: Check if already in _verse
        cwd = os.getcwd()
        if os.path.basename(cwd) == '_verse':
            self.base_dir = cwd
        else:
            self.base_dir = os.environ.get("VERSE_DIR", os.path.join(cwd, '_verse'))
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def routines(self, cursor, agent):
        # Relational SQL query from the SSoT scripts table
        cursor.execute("SELECT id, name, path, target, owner_id, created_cycle FROM scripts")
        rows = cursor.fetchall()
        
        found_files = []
        for r in rows:
            found_files.append({
                "id": r['id'],
                "routine": r['name'],
                "path": r['path'],
                "target": r['target'] if r['target'] else "none",
                "status": "active" if r['target'] else "idle",
                "owner": r['owner_id'],
                "created_cycle": r['created_cycle']
            })
            
        import yaml
        print(yaml.dump({"software_registry": found_files}, sort_keys=False, default_flow_style=False).strip())
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def list_files(self, cursor, agent):
        cursor.execute("SELECT id, name, path, target, owner_id, write_key, read_key, content FROM scripts")
        rows = cursor.fetchall()
        found_files = []
        for r in rows:
            found_files.append({
                "path": r['path'], "size": len(r['content'] or "") if r['content'] else 0,
                "owner": r['owner_id'],
                "write_locked": r['write_key'] is not None, "read_locked": r['read_key'] is not None
            })
        return found_files