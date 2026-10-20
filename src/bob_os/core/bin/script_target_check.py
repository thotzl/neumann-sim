#!/usr/bin/env python3
"""
script_target_check.py <agent_id> <target>

Standalone modular system script for Bob-OS (TCK-145).
Proximity & hardware lockout check for target-bound script deployment
(target = 'ship::<id>' or 'system::<name>'). Prints '[SUCCESS]' or a
'[DENIED: ...]' line that is passed verbatim to the agent.
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


def check_target(cursor, agent_id, target):
    cursor.execute("SELECT location FROM v_agents WHERE id = ?", (agent_id,))
    agent = cursor.fetchone()
    agent_loc = agent['location'] if agent else 'Unknown'

    target_type, _ = target.lower().split('::')
    clean_target_id = target.split('::')[1]

    if target_type == 'ship':
        cursor.execute("SELECT system_name, has_logic_core FROM ships WHERE id = CAST(? AS INTEGER)", (clean_target_id,))
        ship = cursor.fetchone()
        if not ship:
            return '[DENIED: Target vessel ID ' + clean_target_id + ' not found in sector database.]'
        if ship['system_name'] != agent_loc:
            return ("[DENIED: Proximity Lockout. Direct localized flashing of Vessel 'Ship-" + clean_target_id
                    + "' failed. The target vessel is stationed in system '" + ship['system_name']
                    + "', but your consciousness is currently located in '" + agent_loc + "'.]")
        if ship['has_logic_core'] != 1:
            return ("[DENIED: Vessel 'Ship-" + clean_target_id
                    + "' lacks a physical 'logic_core' module. Onboard autonomous programming is impossible.]")
        return '[SUCCESS]'
    if target_type == 'system':
        if clean_target_id != agent_loc:
            return ("[DENIED: Proximity Lockout. Sektor-level automation deployment failed. You cannot deploy an active AMI routine to the '"
                    + clean_target_id + "' matrix hub while your own consciousness is stationed in '" + agent_loc + "'.]")
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'ami_hub' AND status = 'active'", (clean_target_id,))
        if not cursor.fetchone():
            return ("[DENIED: Sector '" + clean_target_id
                    + "' lacks an active 'ami_hub' (Artificial Machine Intelligence Hub). Sector-level background automation is impossible.]")
        return '[SUCCESS]'
    return '[SUCCESS]'


def main():
    if len(sys.argv) != 3:
        print("Usage: script_target_check.py <agent_id> <target>", file=sys.stderr)
        sys.exit(2)
    agent_id, target = sys.argv[1], sys.argv[2]
    conn = get_connection()
    try:
        print(check_target(conn.cursor(), agent_id, target))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
