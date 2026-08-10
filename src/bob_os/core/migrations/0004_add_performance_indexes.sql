-- Migration: Add non-unique index coverage for high-frequency queries and views.
-- These are standard non-unique indexes, meaning they will NEVER cause insert/update rejections.

-- 1. Infrastructure indexing (Highly frequent in views and state exporter)
CREATE INDEX IF NOT EXISTS idx_infrastructure_system_name ON infrastructure(system_name);

-- 2. Ship indexing (Speeds up pilot tracking and location joins)
CREATE INDEX IF NOT EXISTS idx_ships_system_name ON ships(system_name);
CREATE INDEX IF NOT EXISTS idx_ships_pilot_id ON ships(pilot_id);

-- 3. Messages indexing (Critical for high-frequency polling/mailbox delivery)
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

-- 4. Agent Host indexing (Speeds up unified view lookups and status checks)
CREATE INDEX IF NOT EXISTS idx_agents_host ON agents(host_type, host_id);

-- 5. Memos & Docs indexing (Optimizes sector wiki rendering and diary lookups)
CREATE INDEX IF NOT EXISTS idx_memos_agent_id ON memos(agent_id);
CREATE INDEX IF NOT EXISTS idx_docs_system_name ON docs(system_name);
