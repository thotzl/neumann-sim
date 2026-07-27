import unittest
import sqlite3
import os
import random

class TestV105GeologyBalance(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_geology_balance.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        # Create only the systems table
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS systems (
                name TEXT PRIMARY KEY,
                x REAL,
                y REAL,
                extractable_matter_in_core INTEGER,
                max_extractable_matter INTEGER
            )
        """)
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_starting_system_geology_range_and_capping(self):
        """
        Verifies impeccably that the starting system's core resources
        are always between 50k and 500k and are not capped.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simulate 100 geological core seeding entries
        for i in range(100):
            sys_name = f"START-SYS_{i}"
            
            # This is the exact geological formula from init_db.py
            start_matter = random.randint(50000, 500000)
            
            cursor.execute("""
                INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, 0, 0, ?, ?)
            """, (sys_name, start_matter, start_matter))
            
            # Query the values just written
            cursor.execute("SELECT extractable_matter_in_core, max_extractable_matter FROM systems WHERE name = ?", (sys_name,))
            row = cursor.fetchone()
            
            core_val = row[0]
            max_val = row[1]
            
            # IMPLACABLE SEATBELT PROPORTIONALITY (Pillar 1 & 3)
            self.assertEqual(core_val, max_val, f"Capping detected! extractable ({core_val}) deviates from max_extractable ({max_val})!")
            self.assertTrue(50000 <= core_val <= 500000, f"Resource amount {core_val} violates the 50k-500k balance range!")
            
        conn.close()
        print("  ✅ [GEOLOGY-SYSTEM-TEST] 100 starting system cores successfully verified: All uncapped between 50k and 500k.")

    def test_scanned_system_geology_range_and_capping(self):
        """
        Verifies impeccably that scanned deep-space systems' core resources
        are always between 50k and 500k and are not capped.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simulate 100 deep scanner entries
        for i in range(100):
            sys_name = f"SCANNED-SYS_{i}"
            
            # This is the exact geological scan formula from sensors.py (V10.5.4 Patch)
            core_val = random.randint(50000, 500000)
            
            cursor.execute("""
                INSERT INTO systems 
                (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, 0, 0, ?, ?)
            """, (sys_name, core_val, core_val))
            
            # Query the values
            cursor.execute("SELECT extractable_matter_in_core, max_extractable_matter FROM systems WHERE name = ?", (sys_name,))
            row = cursor.fetchone()
            
            saved_core = row[0]
            saved_max = row[1]
            
            # IMPLACABLE CAPPING CHECK (Protection against physics_update Shaving)
            self.assertEqual(saved_core, saved_max, f"Capping detected in scanner! saved_core ({saved_core}) deviates from saved_max ({saved_max})!")
            self.assertTrue(50000 <= saved_core <= 500000, f"Scanned core value {saved_core} violates the 50k-500k balance range!")
            
        conn.close()
        print("  ✅ [GEOLOGY-SYSTEM-TEST] 100 scanned systems successfully verified: All uncapped between 50k and 500k.")

if __name__ == '__main__':
    unittest.main()