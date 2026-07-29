#!/usr/bin/env python3
"""
fetch_messages.py

Standalone modular system script for Bob-OS.
Retrieves all buffered sub-etheric radio messages (SCUT) and registered agent names
from the database specified in the TEST_DB_PATH environment variable, clears
the temporary messages table, and outputs the result as a structured JSON object.
"""

import sqlite3
import json
import os
import sys

def main():
    db_path = os.environ.get('TEST_DB_PATH')
    if not db_path:
        print("Error: TEST_DB_PATH environment variable is not set.", file=sys.stderr)
        sys.exit(1)
        
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # 1. Fetch all messages
        c.execute("SELECT sender, receiver, content FROM messages")
        msgs = [dict(r) for r in c.fetchall()]
        
        # 2. Clear messages
        c.execute("DELETE FROM messages")
        
        # 3. Fetch agent names
        c.execute("SELECT id, chosen_name FROM agents")
        names = {r['id']: r['chosen_name'] for r in c.fetchall()}
        
        conn.commit()
        conn.close()
        
        # 4. Output the exact JSON structure required by the runner
        print(json.dumps({"messages": msgs, "names": names}))
        
    except Exception as e:
        print(f"Error fetching messages: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
