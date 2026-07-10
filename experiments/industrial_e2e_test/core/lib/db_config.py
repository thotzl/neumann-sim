import os
import sqlite3

def get_db_path():
    # 1. Check für Test-Umgebung
    if 'TEST_DB_PATH' in os.environ:
        return os.environ['TEST_DB_PATH']
    
    # 2. Pfad-Logik für neue Struktur:
    # Diese Datei liegt in <exp_root>/core/lib/db_config.py
    # Die DB liegt in <exp_root>/_verse/universe.db
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, '_verse', 'universe.db')

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn
