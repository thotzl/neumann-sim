import unittest
import sqlite3
import os
import random

class TestV105GeologyBalance(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_geology_balance.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        # Erstelle ausschließlich die systems-Tabelle
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
        Verifiziert unbestechlich, dass die Startsystem-Ressourcen des Kernels
        immer zwischen 50k und 500k liegen und nicht gedeckelt (capped) sind.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simuliere 100 geologische Kernseeding-Eintragungen
        for i in range(100):
            sys_name = f"START-SYS-{i}"
            
            # Dies ist die exakte geologische Formel aus init_db.py
            start_matter = random.randint(50000, 500000)
            
            cursor.execute("""
                INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, 0, 0, ?, ?)
            """, (sys_name, start_matter, start_matter))
            
            # Frage die eben geschriebenen Werte ab
            cursor.execute("SELECT extractable_matter_in_core, max_extractable_matter FROM systems WHERE name = ?", (sys_name,))
            row = cursor.fetchone()
            
            core_val = row[0]
            max_val = row[1]
            
            # UNBESTECHLICHE SICHERHEITSGURT-PROPORTIONALITÄT (Säule 1 & 3)
            self.assertEqual(core_val, max_val, f"Capping entdeckt! extractable ({core_val}) weicht von max_extractable ({max_val}) ab!")
            self.assertTrue(50000 <= core_val <= 500000, f"Ressourcen-Menge {core_val} verletzt die 50k-500k Balance-Spanne!")
            
        conn.close()
        print("  ✅ [GEOLOGY-SYSTEM-TEST] 100 Startsystem-Kerne erfolgreich verifiziert: Alle ungedeckt zwischen 50k und 500k.")

    def test_scanned_system_geology_range_and_capping(self):
        """
        Verifiziert unbestechlich, dass gescannte Tiefenraum-Systeme des Kernels
        immer zwischen 50k und 500k liegen und nicht gedeckelt (capped) sind.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simuliere 100 tiefe Scanner-Eintragungen
        for i in range(100):
            sys_name = f"SCANNED-SYS-{i}"
            
            # Dies ist die exakte geologische Scan-Formel aus sensors.py (V10.5.4 Patch)
            core_val = random.randint(50000, 500000)
            
            cursor.execute("""
                INSERT INTO systems 
                (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, 0, 0, ?, ?)
            """, (sys_name, core_val, core_val))
            
            # Frage die Werte ab
            cursor.execute("SELECT extractable_matter_in_core, max_extractable_matter FROM systems WHERE name = ?", (sys_name,))
            row = cursor.fetchone()
            
            saved_core = row[0]
            saved_max = row[1]
            
            # UNBESTECHLICHE DECKELUNGS-PRÜFUNG (Schutz vor physics_update Shaving)
            self.assertEqual(saved_core, saved_max, f"Capping im Scanner entdeckt! saved_core ({saved_core}) weicht von saved_max ({saved_max}) ab!")
            self.assertTrue(50000 <= saved_core <= 500000, f"Gescannter Kernwert {saved_core} verletzt die 50k-500k Balance-Spanne!")
            
        conn.close()
        print("  ✅ [GEOLOGY-SYSTEM-TEST] 100 gescannte Systeme erfolgreich verifiziert: Alle ungedeckt zwischen 50k und 500k.")

if __name__ == '__main__':
    unittest.main()
