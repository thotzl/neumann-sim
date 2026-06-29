import os
import sqlite3

def get_db_path():
    if 'TEST_DB_PATH' in os.environ:
        return os.environ['TEST_DB_PATH']
    # Suche DB im Root (zwei Ebenen über physics/ oder eine über tools/)
    # Wir standardisieren: DB liegt immer im Root des Universums (x/)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, 'universe.db')

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn
