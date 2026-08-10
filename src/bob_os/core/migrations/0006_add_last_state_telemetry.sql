-- Migration: 0006_add_last_state_telemetry.sql
-- Purpose: Add permanent last_x, last_y, and last_status tracking to agents for spatial and state cognition.
-- Clean up physical coordinate overrides from v_agents view (real coordinates always remain krumm).

-- 1. Add permanent columns to agents table
ALTER TABLE agents ADD COLUMN last_x REAL DEFAULT NULL;
ALTER TABLE agents ADD COLUMN last_y REAL DEFAULT NULL;
ALTER TABLE agents ADD COLUMN last_status TEXT DEFAULT NULL;

-- 2. Drop existing view to recreate it
DROP VIEW IF EXISTS v_agents;

-- 3. Recreate v_agents view with raw coordinates (no snapback) and new last-state columns
CREATE VIEW v_agents AS
SELECT 
    a.id, 
    a.chosen_name, 
    a.host_id, 
    a.host_type, 
    a.status, 
    a.birth_cycle,
    a.target_system, 
    a.origin_x, 
    a.origin_y, 
    a.target_x, 
    a.target_y,
    a.transit_ticks_total, 
    a.transit_ticks_passed, 
    a.current_x, -- Raw coordinates directly from agents table (no snapback)
    a.current_y, -- Raw coordinates directly from agents table (no snapback)
    a.active_ship_id, 
    a.last_seen_event_id,
    a.sleep_state,
    a.sleep_until_round,
    a.last_x,
    a.last_y,
    a.last_status,
    -- Unified Location Resolution (SSoT)
    CASE 
        WHEN a.status = 'traveling' THEN 'Interstellar'
        WHEN a.host_type = 'ship' THEN (SELECT s.system_name FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER))
        ELSE 'Unknown'
    END AS location,
    -- Unified Inventory Resolution from Host
    CASE 
        WHEN a.host_type = 'ship' THEN (SELECT s.raw_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN (SELECT sys.raw_matter_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
        ELSE 0
    END AS raw_matter_inventory,
    CASE 
        WHEN a.host_type = 'ship' THEN (SELECT s.refined_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN (SELECT sys.refined_matter_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
        ELSE 0
    END AS refined_matter_inventory,
    CASE 
        WHEN a.host_type = 'ship' THEN (SELECT s.energy_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN MAX(50, COALESCE((SELECT sys.energy_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER))), 0))
        ELSE 100
    END AS energy_inventory,
    CASE 
        WHEN a.host_type = 'ship' THEN (SELECT s.energy_capacity FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN (SELECT sys.depot_energy_capacity FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
        ELSE 500
    END AS energy_capacity,
    CASE 
        WHEN a.host_type = 'ship' THEN (SELECT s.matter_storage_capacity FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
        WHEN a.host_type = 'matrix' THEN (SELECT sys.depot_matter_capacity FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
        ELSE 100
    END AS matter_storage_capacity
FROM agents a;
