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
    def list_files(self, cursor, agent):
        acl_data = json.loads(os.environ.get('BOB_ACL', '{}'))
        scripts_dir = os.path.join(self.base_dir, 'scripts')
        if not os.path.exists(scripts_dir): return []
        found_files = []
        for root, dirs, files in os.walk(scripts_dir):
            for f in files:
                if f.endswith('.py') or f.endswith('.txt') or f.endswith('.md'):
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, self.base_dir).replace('\\', '/')
                    acl = acl_data.get(rel_path, {})
                    found_files.append({
                        "path": rel_path, "size": os.path.getsize(full_path),
                        "owner": acl.get("owner", "Unknown"),
                        "write_locked": "write_key" in acl, "read_locked": "read_key" in acl
                    })
        return found_files