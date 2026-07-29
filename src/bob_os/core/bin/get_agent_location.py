#!/usr/bin/env python3
"""
get_agent_location.py

Standalone modular system script for Bob-OS.
Resolves and retrieves actual locations, sleep state, and sleep rounds of all agents
from the database specified in the TEST_DB_PATH environment variable, returning
the structured information as JSON to stdout.
"""

import sys
import os
import sqlite3
import json

# Ensure PYTHONPATH is correctly set if run stand-alone
try:
    import core
except ImportError:
    # Walk up to find 'core' parent directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = current_dir
    while True:
        if os.path.exists(os.path.join(candidate, 'core')):
            sys.path.insert(0, candidate)
            break
        parent = os.path.dirname(candidate)
        if parent == candidate:
            break
        candidate = parent

from core.lib.agent_service import resolve_agent_location

def main():
    db_path = os.environ.get('TEST_DB_PATH')
    if not db_path:
        print("Error: TEST_DB_PATH environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(db_path):
        print(f"Error: Database file does not exist at {db_path}", file=sys.stderr)
        sys.exit(1)

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c_outer = conn.cursor()
        c_inner = conn.cursor()
        
        res = {}
        for r in c_outer.execute('SELECT * FROM agents'):
            loc = resolve_agent_location(c_inner, r['host_type'], r['host_id'], r['status'])
            res[r['id']] = {
                "location": loc,
                "sleep_state": r['sleep_state'] if 'sleep_state' in r.keys() else 0,
                "sleep_until_round": r['sleep_until_round'] if 'sleep_until_round' in r.keys() else 0
            }
        
        conn.close()
        print(json.dumps(res))
        
    except Exception as e:
        print(f"Error resolving agent locations: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
