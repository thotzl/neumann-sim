#!/usr/bin/env python3
"""
script_list_active.py

Standalone modular system script for Bob-OS (TCK-145).
Lists all registered target-bound scripts whose target hardware is currently valid
(ship with logic_core, or system with active ami_hub) as a JSON array on stdout.
Database: core.lib.db_config (honors TEST_DB_PATH).
"""

import json
import os
import sqlite3
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


def list_active_scripts(cursor):
    try:
        cursor.execute("SELECT id, name, path, target, owner_id FROM scripts WHERE target IS NOT NULL AND target != ''")
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rows = []

    active_scripts = []
    for r in rows:
        target = r['target']
        target_type, target_id = target.split('::')

        is_valid = False
        location = 'Deep Space'

        if target_type == 'ship':
            cursor.execute("SELECT system_name, has_logic_core FROM ships WHERE id = CAST(? AS INTEGER)", (target_id,))
            ship = cursor.fetchone()
            if ship and ship['has_logic_core'] == 1:
                is_valid = True
                location = ship['system_name']
        elif target_type == 'system':
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'ami_hub' AND status = 'active'", (target_id,))
            if cursor.fetchone():
                is_valid = True
                location = target_id

        if is_valid:
            active_scripts.append({
                'id': r['id'],
                'name': r['name'],
                'path': r['path'],
                'target': target,
                'owner_id': r['owner_id'],
                'target_type': target_type,
                'target_id': target_id,
                'location': location
            })
    return active_scripts


def main():
    conn = get_connection()
    try:
        print(json.dumps(list_active_scripts(conn.cursor())))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
