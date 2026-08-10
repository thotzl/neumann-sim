import os
import sqlite3

def get_db_path():
    # 1. Check for test environment
    if 'TEST_DB_PATH' in os.environ:
        return os.environ['TEST_DB_PATH']
    
    # 2. Path logic for new structure:
    # This file is located in <exp_root>/core/lib/db_config.py
    # The DB is located in <exp_root>/_verse/universe.db
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, '_verse', 'universe.db')

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    # Enable WAL, normal synchronous writes, and a 30s busy timeout for concurrent safety
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except sqlite3.OperationalError:
        # Fail-silent if read-only or in restricted test situations
        pass
    return conn
