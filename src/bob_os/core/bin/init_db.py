import sqlite3
import os
import sys

from core.lib.db_config import get_connection

def init():
    # Connect to the SQLite database
    conn = get_connection()
    cursor = conn.cursor()
    
    # Track migrations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Read and apply all SQL migrations in order
    # Relative path from core/bin/ to core/migrations/
    bin_dir = os.path.dirname(os.path.abspath(__file__))
    migrations_dir = os.path.abspath(os.path.join(bin_dir, '..', 'migrations'))
    
    if os.path.exists(migrations_dir):
        files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])
        for file in files:
            cursor.execute("SELECT version FROM schema_migrations WHERE version = ?", (file,))
            if not cursor.fetchone():
                print(f"[PY-MIGRATOR] Applying SQL migration: {file}")
                sql_path = os.path.join(migrations_dir, file)
                with open(sql_path, 'r', encoding='utf-8') as f:
                    sql_content = f.read()
                
                try:
                    cursor.executescript(sql_content)
                    cursor.execute("INSERT INTO schema_migrations (version) VALUES (?)", (file,))
                except Exception as e:
                    print(f"[PY-MIGRATOR ERROR] Migration '{file}' failed: {e}")
                    conn.rollback()
                    conn.close()
                    sys.exit(1)
    
    conn.commit()
    conn.close()
    print("Database initialized (Migrations).")

def seed():
    is_test_mode = os.environ.get('TEST_FORCE_GEOLOGY_MOCK') == 'true' or os.environ.get('TEST_DB_PATH') is not None
    if is_test_mode:
        from core.bin.seed_test_db import seed as seed_test_db_seed
        seed_test_db_seed()
    else:
        from core.bin.seed_db import seed as seed_db_seed
        seed_db_seed()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="store_true")
    args, unknown = parser.parse_known_args()
    if args.seed:
        seed()
    else:
        init()
