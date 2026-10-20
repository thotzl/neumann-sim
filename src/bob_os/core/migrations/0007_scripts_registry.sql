-- Migration: 0007_scripts_registry.sql (TCK-145)
-- Purpose: The scripts registry is owned by the migration system only. The engine no longer
-- creates 'scripts' / 'active_script_id' at runtime (former inline Python in environment.js).
-- Table and columns are introduced by 0005_hardware_autonomy.sql; this migration only contains
-- idempotent statements, so it applies on fresh DBs and on experiments where the old runtime
-- DDL already created the table.
-- Old experiments where the runtime DDL ran before 0005 was applied: both migrators
-- (scripts/migrate.js, core/bin/init_db.py) skip 'ALTER TABLE ... ADD COLUMN' statements
-- whose column already exists, so 0005 no longer fails with "duplicate column name".

-- 1. Canonical registry table (no-op if 0005 or the old runtime DDL created it)
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT,
    path TEXT NOT NULL,
    target TEXT DEFAULT NULL,
    owner_id TEXT NOT NULL,
    read_key TEXT DEFAULT NULL,
    write_key TEXT DEFAULT NULL,
    created_cycle INTEGER DEFAULT 0
);

-- 2. Registration looks scripts up by path on every [WRITE]
CREATE INDEX IF NOT EXISTS idx_scripts_path ON scripts(path);
