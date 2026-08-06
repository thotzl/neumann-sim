-- Ground Zero: Starting schema baseline for Bob-OS (v10.5)

-- 1. Systems
CREATE TABLE IF NOT EXISTS systems (
    name TEXT PRIMARY KEY, 
    display_name TEXT DEFAULT NULL,
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    extractable_matter_in_core INTEGER, 
    max_extractable_matter INTEGER DEFAULT 10000,
    raw_matter_depot INTEGER DEFAULT 0,
    depot_matter_capacity INTEGER DEFAULT 0,
    energy_depot INTEGER DEFAULT 0,
    depot_energy_capacity INTEGER DEFAULT 0,
    matter_generation_per_cycle INTEGER DEFAULT 0,
    energy_generation_per_cycle INTEGER DEFAULT 0,
    refined_matter_depot INTEGER DEFAULT 0,
    mass REAL DEFAULT 1.0,
    is_inspected INTEGER DEFAULT 1
);

-- 2. Agents
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    chosen_name TEXT,
    host_id TEXT DEFAULT NULL,
    host_type TEXT DEFAULT NULL,
    status TEXT,
    birth_cycle INTEGER DEFAULT 0,
    target_system TEXT DEFAULT NULL,
    origin_x INTEGER DEFAULT 0,
    origin_y INTEGER DEFAULT 0,
    target_x INTEGER DEFAULT 0,
    target_y INTEGER DEFAULT 0,
    transit_ticks_total INTEGER DEFAULT 0,
    transit_ticks_passed INTEGER DEFAULT 0,
    current_x REAL DEFAULT 0,
    current_y REAL DEFAULT 0,
    active_ship_id INTEGER DEFAULT NULL,
    last_seen_event_id INTEGER DEFAULT 0,
    sleep_state INTEGER DEFAULT 0,
    sleep_until_round INTEGER DEFAULT 0
);

-- 3. Ships (Epic 2)
CREATE TABLE IF NOT EXISTS ships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    chassis TEXT,
    pilot_id TEXT DEFAULT NULL,
    system_name TEXT,
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    raw_matter_inventory INTEGER DEFAULT 0,
    refined_matter_inventory INTEGER DEFAULT 0,
    energy_inventory INTEGER DEFAULT 100,
    matter_storage_capacity INTEGER DEFAULT 300,
    energy_capacity INTEGER DEFAULT 500,
    max_speed REAL DEFAULT 300,
    thrust INTEGER DEFAULT 500,
    mass INTEGER DEFAULT 100,
    blueprint_name TEXT DEFAULT 'unclassified',
    has_drill INTEGER DEFAULT 0,
    has_fabricator INTEGER DEFAULT 0,
    has_logic_core INTEGER DEFAULT 0,
    progress_matter INTEGER DEFAULT 0,
    required_matter INTEGER DEFAULT 0
);

-- 4. Blueprints
CREATE TABLE IF NOT EXISTS blueprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    author_id TEXT,
    matrix_json TEXT,
    stats_json TEXT
);

-- 5. Infrastructure
CREATE TABLE IF NOT EXISTS infrastructure (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_name TEXT, 
    type TEXT, 
    status TEXT DEFAULT 'construction',
    progress_matter INTEGER DEFAULT 0,
    required_matter INTEGER DEFAULT 0,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    level INTEGER DEFAULT 1,
    maintenance_cooldown INTEGER DEFAULT 0,
    linked_system TEXT DEFAULT NULL
);

-- 6. Core Tables
CREATE TABLE IF NOT EXISTS messages (
    sender TEXT, 
    receiver TEXT, 
    content TEXT, 
    priority INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS knowledge_base (
    topic TEXT PRIMARY KEY, 
    content TEXT, 
    author TEXT
);

CREATE TABLE IF NOT EXISTS visual_events (
    cycle INTEGER, 
    location TEXT, 
    actor_id TEXT, 
    event_type TEXT, 
    description TEXT
);

CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    content TEXT,
    status TEXT DEFAULT 'open',
    created_cycle INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id TEXT,
    system_name TEXT,
    title TEXT,
    content TEXT,
    created_cycle INTEGER DEFAULT 0
);
