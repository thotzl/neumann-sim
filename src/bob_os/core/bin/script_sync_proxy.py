#!/usr/bin/env python3
"""
script_sync_proxy.py <target_type> <target_id> <proxy_id>

Standalone modular system script for Bob-OS (TCK-145).
Seeds/updates the virtual proxy agent (e.g. 'Ship-8', 'System-SYS_A') on whose
behalf a target-bound automation script runs. No output on success.
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


def sync_proxy(conn, target_type, target_id, proxy_id):
    cursor = conn.cursor()
    if target_type == 'ship':
        cursor.execute("SELECT name, x, y, system_name FROM ships WHERE id = CAST(? AS INTEGER)", (target_id,))
        ship = cursor.fetchone()
        if ship:
            cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y) VALUES (?, ?, 'ship', ?, ?, ?, ?)",
                           (proxy_id, ship[0], target_id, int(target_id), ship[1], ship[2]))
            cursor.execute("UPDATE agents SET current_x = ?, current_y = ? WHERE id = ?", (ship[1], ship[2], proxy_id))
    elif target_type == 'system':
        cursor.execute("SELECT x, y FROM systems WHERE name = ?", (target_id,))
        system = cursor.fetchone()
        if system:
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type IN ('sem_matrix', 'ami_hub') AND status = 'active'", (target_id,))
            infra = cursor.fetchone()
            host_id = str(infra[0]) if infra else '1'
            cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y) VALUES (?, ?, 'matrix', ?, NULL, ?, ?)",
                           (proxy_id, 'AMI-' + target_id, host_id, system[0], system[1]))
    conn.commit()


def main():
    if len(sys.argv) != 4:
        print("Usage: script_sync_proxy.py <target_type> <target_id> <proxy_id>", file=sys.stderr)
        sys.exit(2)
    conn = get_connection()
    try:
        sync_proxy(conn, sys.argv[1], sys.argv[2], sys.argv[3])
    finally:
        conn.close()


if __name__ == "__main__":
    main()
