#!/usr/bin/env python3
"""
script_register.py <file_path> <agent_id> <read_key> <write_key> <target> <name> <created_cycle>

Standalone modular system script for Bob-OS (TCK-145).
Registers (insert or update by path) an agent-written script in the 'scripts'
registry and links it as active_script_id of the target ship/system.
Script content is read from stdin (UTF-8); empty read_key/write_key mean NULL,
empty target means no hardware binding. Prints the script id.
Schema: migrations 0005/0007 (no runtime DDL).
Database: core.lib.db_config (honors TEST_DB_PATH).
"""

import os
import sys

# Ensure PYTHONPATH is correctly set if run stand-alone
try:
    import core
except ImportError:
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

from core.lib.db_config import get_connection


def register_script(conn, content, file_path, agent_id, read_key, write_key, target, name, created_cycle):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM scripts WHERE path = ?", (file_path,))
    row = cursor.fetchone()

    if row:
        script_id = row[0]
        cursor.execute("UPDATE scripts SET content = ?, owner_id = ?, read_key = ?, write_key = ?, target = ? WHERE id = ?",
                       (content, agent_id, read_key, write_key, target, script_id))
    else:
        cursor.execute("INSERT INTO scripts (name, content, path, target, owner_id, read_key, write_key, created_cycle) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                       (name, content, file_path, target, agent_id, read_key, write_key, created_cycle))
        script_id = cursor.lastrowid

    if target.startswith('ship::'):
        cursor.execute("UPDATE ships SET active_script_id = ? WHERE id = CAST(? AS INTEGER)", (script_id, target.split('::')[1]))
    elif target.startswith('system::'):
        cursor.execute("UPDATE systems SET active_script_id = ? WHERE name = ?", (script_id, target.split('::')[1]))

    conn.commit()
    return script_id


def main():
    if len(sys.argv) != 8:
        print("Usage: script_register.py <file_path> <agent_id> <read_key> <write_key> <target> <name> <created_cycle> < content", file=sys.stderr)
        sys.exit(2)
    file_path, agent_id = sys.argv[1], sys.argv[2]
    read_key, write_key = sys.argv[3] or None, sys.argv[4] or None
    target, name, created_cycle = sys.argv[5], sys.argv[6], int(sys.argv[7])
    content = sys.stdin.buffer.read().decode('utf-8')

    conn = get_connection()
    try:
        print(register_script(conn, content, file_path, agent_id, read_key, write_key, target, name, created_cycle))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
