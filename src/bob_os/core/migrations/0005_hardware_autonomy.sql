-- Migration: Add relational software registry and hardware-bound script bindings for TCK-125
-- Enables direct database tracking of scripts, owners, credentials (ACL), and execution targets

-- 1. Create the scripts table
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT,
    path TEXT NOT NULL,               -- Relative to _verse/ (e.g., 'scripts/active/ships/8/auto.py')
    target TEXT DEFAULT NULL,         -- e.g., 'ship::8' or 'system::SYS_X107_Y132'
    owner_id TEXT NOT NULL,
    read_key TEXT DEFAULT NULL,
    write_key TEXT DEFAULT NULL,
    created_cycle INTEGER DEFAULT 0
);

-- 2. Add active_script_id column to ships table (onboard drone autonomy)
ALTER TABLE ships ADD COLUMN active_script_id INTEGER DEFAULT NULL;

-- 3. Add active_script_id column to systems table (sector-level AMI autonomy)
ALTER TABLE systems ADD COLUMN active_script_id INTEGER DEFAULT NULL;
