import unittest
import os
import shutil
import sys
import tempfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'bob_os')))
from core.bin import init_db
from core.lib import bob_sdk, db_config

class TestTransfer(unittest.TestCase):
    def setUp(self):
        self._tmp_dir = tempfile.mkdtemp(prefix='bob_test_')
        self.addCleanup(shutil.rmtree, self._tmp_dir, ignore_errors=True)
        self.test_db = os.path.join(self._tmp_dir, "transfer_test.db")
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'

        # Current schema (migrations); resources live on the piloted ships (host decoupling).
        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 0, 0, 10000)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 50, 100, 300)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'Ship-2', 'Scout', 'Instance-2', 'SYS_A', 0, 50, 100)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Instance-1', '1', 'ship', 'active', 0, 0, 1)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-2', 'Instance-2', '2', 'ship', 'active', 0, 0, 2)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']
        if 'TEST_DB_PATH' in os.environ: del os.environ['TEST_DB_PATH']

    def _ship(self, ship_id):
        conn = db_config.get_connection()
        row = conn.execute("SELECT raw_matter_inventory, energy_inventory FROM ships WHERE id = ?", (ship_id,)).fetchone()
        conn.close()
        return row

    def test_p2p_transfer_matter(self):
        # Instance-1 sends 50 matter to Instance-2
        success = self.agent.logistics.transfer('Instance-2', 'matter', 50)
        self.assertTrue(success)
        self.assertEqual(self._ship(1)['raw_matter_inventory'], 0)
        self.assertEqual(self._ship(2)['raw_matter_inventory'], 50)

    def test_p2p_transfer_energy(self):
        # Instance-1 sends 50 energy to Instance-2
        success = self.agent.logistics.transfer('Instance-2', 'energy', 50)
        self.assertTrue(success)
        self.assertEqual(self._ship(1)['energy_inventory'], 50)
        self.assertEqual(self._ship(2)['energy_inventory'], 100) # 50 + 50

    def test_transfer_insufficient_matter_is_denied(self):
        success = self.agent.logistics.transfer('Instance-2', 'matter', 500)
        self.assertFalse(success)
        self.assertEqual(self._ship(1)['raw_matter_inventory'], 50)
        self.assertEqual(self._ship(2)['raw_matter_inventory'], 0)

if __name__ == '__main__':
    unittest.main()
