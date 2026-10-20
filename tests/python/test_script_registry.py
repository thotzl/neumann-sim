"""
TCK-145: Kernel scripts extracted from inline Python (environment.js / automation.js)
and the scripts registry migration (0007 + ADD COLUMN guard in init_db.py).
The bin scripts are exercised through their CLI contract (argv + stdin) like the engine calls them.
"""
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BOB_OS = os.path.join(PROJECT_ROOT, 'src', 'bob_os')
BIN_DIR = os.path.join(BOB_OS, 'core', 'bin')
MIGRATIONS_DIR = os.path.join(BOB_OS, 'core', 'migrations')
sys.path.insert(0, BOB_OS)
from core.bin import init_db


class ScriptRegistryBase(unittest.TestCase):
    def setUp(self):
        self._tmp_dir = tempfile.mkdtemp(prefix='bob_test_registry_')
        self.addCleanup(shutil.rmtree, self._tmp_dir, ignore_errors=True)
        self.test_db = os.path.join(self._tmp_dir, 'universe.db')
        self._old_db = os.environ.get('TEST_DB_PATH')
        os.environ['TEST_DB_PATH'] = self.test_db
        self.addCleanup(self._restore_env)

    def _restore_env(self):
        if self._old_db is None:
            os.environ.pop('TEST_DB_PATH', None)
        else:
            os.environ['TEST_DB_PATH'] = self._old_db

    def run_bin(self, script, *args, stdin=''):
        env = {**os.environ, 'TEST_DB_PATH': self.test_db, 'PYTHONPATH': BOB_OS}
        res = subprocess.run([sys.executable, os.path.join(BIN_DIR, script), *args],
                             input=stdin.encode('utf-8'), env=env, capture_output=True, cwd=self._tmp_dir)
        self.assertEqual(res.returncode, 0, res.stderr.decode('utf-8', 'replace'))
        return res.stdout.decode('utf-8').strip()

    def query(self, sql, params=()):
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        try:
            return conn.execute(sql, params).fetchall()
        finally:
            conn.close()


class TestScriptRegistryScripts(ScriptRegistryBase):
    def setUp(self):
        super().setUp()
        init_db.init()
        conn = sqlite3.connect(self.test_db)
        conn.executescript("""
            INSERT INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 100, 100, 500000);
            INSERT INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 9000, 9000, 500000);
            INSERT INTO ships (id, name, system_name, x, y, has_logic_core) VALUES (8, 'Drone-8', 'SYS_A', 100, 100, 1);
            INSERT INTO ships (id, name, system_name, x, y, has_logic_core) VALUES (9, 'Drone-9', 'SYS_A', 100, 100, 0);
            INSERT INTO ships (id, name, system_name, x, y, has_logic_core) VALUES (10, 'Drone-10', 'SYS_B', 9000, 9000, 1);
            INSERT INTO infrastructure (id, system_name, type, status) VALUES (1, 'SYS_A', 'sem_matrix', 'active');
            INSERT INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y)
                VALUES ('Instance-1', 'Robert', 'matrix', '1', NULL, 100, 100);
        """)
        conn.commit()
        conn.close()

    def add_ami_hub(self, system='SYS_A'):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES (?, 'ami_hub', 'active')", (system,))
        conn.commit()
        conn.close()

    def register(self, path, agent='Instance-1', read_key='', write_key='', target='', name='auto.py', cycle='12', content='print(1)'):
        return int(self.run_bin('script_register.py', path, agent, read_key, write_key, target, name, cycle, stdin=content))

    # --- script_register.py ---
    def test_register_new_script(self):
        content = 'print("it\'s $(id) `x`")\n# Ünïcödé\n' + 'x = 1\n' * 5000
        script_id = self.register('scripts/ok.py', read_key='k1', name='ok.py', content=content)
        row = self.query("SELECT * FROM scripts WHERE id = ?", (script_id,))[0]
        self.assertEqual(row['content'], content)
        self.assertEqual(row['path'], 'scripts/ok.py')
        self.assertEqual(row['name'], 'ok.py')
        self.assertEqual(row['owner_id'], 'Instance-1')
        self.assertEqual(row['read_key'], 'k1')
        self.assertIsNone(row['write_key'])
        self.assertEqual(row['target'], '')
        self.assertEqual(row['created_cycle'], 12)

    def test_register_updates_existing_script_by_path(self):
        first = self.register('scripts/auto.py', content='print("first")')
        second = self.register('scripts/auto.py', agent='Instance-2', write_key='w', cycle='99', content='print("second")')
        self.assertEqual(first, second)
        rows = self.query("SELECT * FROM scripts WHERE path = 'scripts/auto.py'")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['content'], 'print("second")')
        self.assertEqual(rows[0]['owner_id'], 'Instance-2')
        self.assertEqual(rows[0]['write_key'], 'w')
        self.assertEqual(rows[0]['created_cycle'], 12, "created_cycle must keep the first registration round")

    def test_register_links_ship_target(self):
        script_id = self.register('scripts/active/ships/8/auto.py', target='ship::8')
        self.assertEqual(self.query("SELECT active_script_id FROM ships WHERE id = 8")[0][0], script_id)
        self.assertIsNone(self.query("SELECT active_script_id FROM ships WHERE id = 9")[0][0])

    def test_register_links_system_target(self):
        script_id = self.register('scripts/active/systems/SYS_A/auto.py', target='system::SYS_A')
        self.assertEqual(self.query("SELECT active_script_id FROM systems WHERE name = 'SYS_A'")[0][0], script_id)
        self.assertIsNone(self.query("SELECT active_script_id FROM systems WHERE name = 'SYS_B'")[0][0])

    # --- script_target_check.py (agent-facing strings must stay byte-identical) ---
    def check(self, target, agent='Instance-1'):
        return self.run_bin('script_target_check.py', agent, target)

    def test_target_check_ship_success(self):
        self.assertEqual(self.check('ship::8'), '[SUCCESS]')

    def test_target_check_ship_proximity_denied(self):
        self.assertEqual(self.check('ship::10'),
                         "[DENIED: Proximity Lockout. Direct localized flashing of Vessel 'Ship-10' failed. The target vessel is "
                         "stationed in system 'SYS_B', but your consciousness is currently located in 'SYS_A'.]")

    def test_target_check_ship_without_logic_core_denied(self):
        self.assertEqual(self.check('ship::9'),
                         "[DENIED: Vessel 'Ship-9' lacks a physical 'logic_core' module. Onboard autonomous programming is impossible.]")

    def test_target_check_ship_not_found_denied(self):
        self.assertEqual(self.check('ship::404'), '[DENIED: Target vessel ID 404 not found in sector database.]')

    def test_target_check_system_proximity_denied(self):
        self.assertEqual(self.check('system::SYS_B'),
                         "[DENIED: Proximity Lockout. Sektor-level automation deployment failed. You cannot deploy an active AMI "
                         "routine to the 'SYS_B' matrix hub while your own consciousness is stationed in 'SYS_A'.]")

    def test_target_check_system_without_ami_hub_denied(self):
        self.assertEqual(self.check('system::SYS_A'),
                         "[DENIED: Sector 'SYS_A' lacks an active 'ami_hub' (Artificial Machine Intelligence Hub). "
                         "Sector-level background automation is impossible.]")

    def test_target_check_system_success(self):
        self.add_ami_hub()
        self.assertEqual(self.check('system::SYS_A'), '[SUCCESS]')

    def test_target_check_injection_is_inert(self):
        # argv + parameterized SQL: quotes in the target are plain data
        self.assertEqual(self.check("ship::x'; DROP TABLE ships;--"),
                         "[DENIED: Target vessel ID x'; DROP TABLE ships;-- not found in sector database.]")
        self.assertEqual(self.query("SELECT COUNT(*) FROM ships")[0][0], 3)

    # --- script_list_active.py ---
    def test_list_active_scripts(self):
        self.add_ami_hub()
        self.register('scripts/active/ships/8/a.py', target='ship::8', name='a.py')
        self.register('scripts/active/ships/9/b.py', target='ship::9', name='b.py')       # no logic_core -> skipped
        self.register('scripts/active/systems/SYS_A/c.py', target='system::SYS_A', name='c.py')
        self.register('scripts/manual.py', name='manual.py')                               # no target -> skipped
        active = json.loads(self.run_bin('script_list_active.py'))
        self.assertEqual([a['name'] for a in active], ['a.py', 'c.py'])
        self.assertEqual(active[0]['target_type'], 'ship')
        self.assertEqual(active[0]['target_id'], '8')
        self.assertEqual(active[0]['location'], 'SYS_A')
        self.assertEqual(active[0]['owner_id'], 'Instance-1')
        self.assertEqual(active[1]['target_type'], 'system')
        self.assertEqual(active[1]['location'], 'SYS_A')

    def test_list_active_scripts_empty(self):
        self.assertEqual(json.loads(self.run_bin('script_list_active.py')), [])

    # --- script_sync_proxy.py ---
    def test_sync_proxy_ship(self):
        self.assertEqual(self.run_bin('script_sync_proxy.py', 'ship', '8', 'Ship-8'), '')
        row = self.query("SELECT * FROM agents WHERE id = 'Ship-8'")[0]
        self.assertEqual((row['chosen_name'], row['host_type'], row['host_id'], row['active_ship_id']), ('Drone-8', 'ship', '8', 8))
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE ships SET x = 150, y = 160 WHERE id = 8")
        conn.commit()
        conn.close()
        self.run_bin('script_sync_proxy.py', 'ship', '8', 'Ship-8')
        row = self.query("SELECT current_x, current_y FROM agents WHERE id = 'Ship-8'")[0]
        self.assertEqual((row[0], row[1]), (150, 160))

    def test_sync_proxy_system(self):
        self.add_ami_hub()
        self.run_bin('script_sync_proxy.py', 'system', 'SYS_A', 'System-SYS_A')
        row = self.query("SELECT * FROM agents WHERE id = 'System-SYS_A'")[0]
        self.assertEqual((row['chosen_name'], row['host_type'], row['host_id']), ('AMI-SYS_A', 'matrix', '1'))
        self.assertIsNone(row['active_ship_id'])

    def test_sync_proxy_unknown_target_is_noop(self):
        self.run_bin('script_sync_proxy.py', 'ship', '404', 'Ship-404')
        self.assertEqual(self.query("SELECT COUNT(*) FROM agents WHERE id = 'Ship-404'")[0][0], 0)


class TestScriptsRegistryMigration(ScriptRegistryBase):
    def test_fresh_db_has_registry_schema(self):
        init_db.init()
        self.assertTrue(self.query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_scripts_path'"))
        for table in ('ships', 'systems'):
            cols = [r[1] for r in self.query(f"PRAGMA table_info({table})")]
            self.assertIn('active_script_id', cols)

    def test_old_experiment_with_runtime_ddl_migrates(self):
        # Experiment migrated up to 0004, then the pre-TCK-145 runtime DDL created table + columns
        conn = sqlite3.connect(self.test_db)
        conn.execute("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        for f in sorted(os.listdir(MIGRATIONS_DIR)):
            if f.endswith('.sql') and f < '0005':
                with open(os.path.join(MIGRATIONS_DIR, f), encoding='utf-8') as fh:
                    conn.executescript(fh.read())
                conn.execute("INSERT INTO schema_migrations (version) VALUES (?)", (f,))
        conn.execute("CREATE TABLE IF NOT EXISTS scripts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, content TEXT, "
                     "path TEXT NOT NULL, target TEXT DEFAULT NULL, owner_id TEXT NOT NULL, read_key TEXT DEFAULT NULL, "
                     "write_key TEXT DEFAULT NULL, created_cycle INTEGER DEFAULT 0)")
        conn.execute("ALTER TABLE ships ADD COLUMN active_script_id INTEGER DEFAULT NULL")
        conn.execute("ALTER TABLE systems ADD COLUMN active_script_id INTEGER DEFAULT NULL")
        conn.execute("INSERT INTO scripts (name, path, owner_id) VALUES ('old.py', 'scripts/old.py', 'Instance-1')")
        conn.commit()
        conn.close()

        init_db.init()  # sys.exit(1) on a failing migration

        versions = [r[0] for r in self.query("SELECT version FROM schema_migrations")]
        for f in sorted(os.listdir(MIGRATIONS_DIR)):
            if f.endswith('.sql'):
                self.assertIn(f, versions)
        self.assertEqual([r[1] for r in self.query("PRAGMA table_info(ships)")].count('active_script_id'), 1)
        self.assertEqual(self.query("SELECT name FROM scripts")[0][0], 'old.py')
        self.assertTrue(self.query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_scripts_path'"))


if __name__ == '__main__':
    unittest.main()
