-- Migration: Add emergency beacons table for TCK-120
CREATE TABLE IF NOT EXISTS emergency_beacons (
    ship_id INTEGER PRIMARY KEY,
    message TEXT,
    x REAL,
    y REAL,
    created_cycle INTEGER
);
