import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_memo_docs.db'

class TestV10MemoDocsSystem(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS_A) and distant system (SYS_B)
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 100, 100)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_B', 300, 400, 5000, 500, 500)")
        
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 0, 500, 300)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'Ship-2', 'Scout', 'Instance-2', 'SYS_A', 0, 500, 300)") # Both in SYS_A
        
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer-1', '1', 'ship', 'active', 0, 0, 1)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-2', 'Pioneer-2', '2', 'ship', 'active', 0, 0, 2)")
        conn.commit()
        conn.close()
        
        self.agent1 = bob_sdk.Agent('Instance-1')
        self.agent2 = bob_sdk.Agent('Instance-2')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_memo_crud_workflow(self):
        # 1. Test 'add' action
        long_memo_1 = "PLANUNG: Errichte solar_collector im Hauptsektor."
        long_memo_2 = "PROTOKOLL: Replikation abgeschlossen."
        
        self.assertTrue(self.agent1.memo('add', content=long_memo_1))
        self.assertTrue(self.agent1.memo('add', content=long_memo_2))
        
        # 2. Test 'list' action (All and Specific ID)
        memos = self.agent1.memo('list')
        self.assertEqual(len(memos), 2)
        self.assertEqual(memos[0]['content'], long_memo_1)
        
        single_memo = self.agent1.memo('list', id=memos[1]['id'])
        self.assertEqual(len(single_memo), 1)
        self.assertEqual(single_memo[0]['content'], long_memo_2)
        
        # 3. Test privacy: Agent 2 cannot read Agent 1's private memos!
        agent2_memos = self.agent2.memo('list')
        self.assertEqual(len(agent2_memos), 0) # Agent 2 has no memos of their own

    def test_docs_bulletin_board_workflow(self):
        # 1. Test 'add' action for public docs
        title = "Sektor-Bericht"
        content = "WICHTIG: Die Geologie dieses Sektors ist instabil. Vorsicht beim Bohren!"
        self.assertTrue(self.agent1.docs('add', title=title, content=content))
        
        # 2. Test 'list' action (Access is local-system bounded!)
        docs = self.agent1.docs('list')
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]['title'], title)
        
        # Agent 2 is also in SYS_A, so they can list/read it too!
        agent2_docs = self.agent2.docs('list')
        self.assertEqual(len(agent2_docs), 1)
        self.assertEqual(agent2_docs[0]['title'], title)
        
        # Let's inspect detail view by ID
        doc_id = docs[0]['id']
        detail = self.agent2.docs('list', id=doc_id)
        self.assertEqual(len(detail), 1)
        self.assertEqual(detail[0]['content'], content)
        
        # 3. Test 'find' action (searches both title and content)
        found1 = self.agent2.docs('find', query="Bericht") # Matches title
        self.assertEqual(len(found1), 1)
        
        found2 = self.agent2.docs('find', query="Geologie") # Matches content
        self.assertEqual(len(found2), 1)
        
        # 4. Test 'remove' action with creator security check
        # Agent 2 is NOT the creator, so remove should fail!
        success_remove_fail = self.agent2.docs('remove', id=doc_id)
        self.assertFalse(success_remove_fail)
        
        # Agent 1 IS the creator, so remove should succeed!
        success_remove_ok = self.agent1.docs('remove', id=doc_id)
        self.assertTrue(success_remove_ok)
        
        # Verify it is removed
        docs_after_remove = self.agent1.docs('list')
        self.assertEqual(len(docs_after_remove), 0)

if __name__ == '__main__':
    unittest.main()
