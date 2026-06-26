import os
import sqlite3

def get_db_path():
    # 1. Check für Test-Umgebung
    if 'TEST_DB_PATH' in os.environ:
        return os.environ['TEST_DB_PATH']
    
    # 2. Suche DB im aktuellen Verzeichnis oder eine Ebene höher
    curr_dir = os.getcwd()
    db_name = 'universe.db'
    
    if os.path.exists(os.path.join(curr_dir, db_name)):
        return os.path.join(curr_dir, db_name)
    
    # Tools liegen in tools/, DB liegt eine Ebene höher im Root des Universums (x/)
    parent_db = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', db_name))
    return parent_db

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn
