import unittest
import sqlite3
import os
import sys
import subprocess

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import db_config
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_me_py.db'
TEST_ME_SCRIPT = 'test_me_py_execution.py'

class TestV105DynamicMePy(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_ME_SCRIPT): os.remove(TEST_ME_SCRIPT)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed SYS_A and piloted ship (Ship 1) with specific inventories
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 150, 250)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 40, 120, 300)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Bob-1', '1', 'ship', 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        
        # We write the identical me.py to the local directory for testing.
        self._write_local_me_py()
        
        # Write sitecustomize.py directly beside me.py to simulate the active sandbox environment
        site_content = """import builtins
import me
builtins.me = me
"""
        with open('sitecustomize.py', 'w') as f:
            f.write(site_content)

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_ME_SCRIPT): os.remove(TEST_ME_SCRIPT)
        if os.path.exists('me.py'): os.remove('me.py')
        if os.path.exists('sitecustomize.py'): os.remove('sitecustomize.py')
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def _write_local_me_py(self):
        me_content = """import os
import sys
from bob_os.core.lib.bob_sdk import Agent

class ResourceDict(dict):
    def __getattr__(self, name): return self.get(name, 0)

class HostObject:
    def __init__(self, agent_dict):
        self.type = agent_dict.get('host_type')
        self.id = agent_dict.get('host_id')
        inv = agent_dict.get('inventory', {})
        self.inventory = ResourceDict({
            'raw_matter': inv.get('raw_matter', 0),
            'refined_matter': inv.get('refined_matter', 0),
            'energy': inv.get('energy', 0)
        })
        self.storage_capacity = agent_dict.get('storage_capacity', 300)

class DepotsObject:
    def __init__(self, sys_dict):
        depots = sys_dict.get('depots', {})
        self.raw_matter = depots.get('raw_matter', 0)
        self.refined_matter = depots.get('refined_matter', 0)
        self.energy = depots.get('energy', 0)

class StatusWrapper:
    def __init__(self, dash):
        self.host = HostObject(dash.get('your_status', {}))
        self.depots = DepotsObject(dash.get('local_system', {}))

class MeAgent(Agent):
    def __init__(self, agent_id):
        super().__init__(agent_id)
        
    def status(self):
        dash = self.dashboard()
        return StatusWrapper(dash)
        
    def log(self, message):
        sys.stderr.write(f"# [LOG] {message}\\n")
        sys.stderr.flush()

_agent = MeAgent(os.environ.get('BOB_ID', 'Bob'))

# Dynamically export only public, callable methods of MeAgent to the module namespace (100% DRY & secure!)
for _name in dir(_agent):
    if not _name.startswith('_'):
        _attr = getattr(_agent, _name)
        if callable(_attr):
            globals()[_name] = _attr
"""
        with open('me.py', 'w') as f:
            f.write(me_content)

    def test_dynamic_me_py_execution(self):
        # 1. Create a test script simulating Bob's automated background script (IMPORTLESS!)
        script_content = """# NO 'import me' STATEMENT NEEDED! sitecustomize.py bootstraps it as a builtin global!
# 1. Test status retrieval
status = me.status()
print(f"HOST_TYPE:{status.host.type}")
print(f"ENERGY:{status.host.inventory.energy}")
print(f"RAW_MATTER:{status.host.inventory.raw_matter}")
print(f"DEPOT_ENERGY:{status.depots.energy}")

# 2. Test actuator running natively (inherited from Agent)
me.wait()

# 3. Test dynamic binding of previously missing methods (e.g. scan)
me.scan()
"""
        with open(TEST_ME_SCRIPT, 'w') as f:
            f.write(script_content)

        # 2. Execute the python script in a separate sub-process
        env = { **os.environ, "PYTHONPATH": os.getcwd() }
        res = subprocess.run([sys.executable, TEST_ME_SCRIPT], capture_output=True, text=True, env=env)
        
        # Verify output matches expected results!
        out = res.stdout
        err = res.stderr
        if res.returncode != 0:
            self.fail(f"Subprocess failed with exit code {res.returncode}. Stderr: {err}")
            
        self.assertIn("HOST_TYPE:ship", out)
        self.assertIn("ENERGY:120", out)
        self.assertIn("RAW_MATTER:40", out)
        self.assertIn("DEPOT_ENERGY:250", out)
        self.assertIn("[SUCCESS] Waiting...", out) # Natively printed by inherited bob_sdk.Agent!
        self.assertIn("[SCAN] Detected:", out) # Natively printed by me.scan()!

if __name__ == '__main__':
    unittest.main()