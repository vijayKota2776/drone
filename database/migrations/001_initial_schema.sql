-- 001_initial_schema.sql

CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    ended_at INTEGER,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    mission_id TEXT,
    name TEXT NOT NULL,
    type TEXT,
    FOREIGN KEY(mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    latitude REAL,
    longitude REAL,
    altitude_msl REAL,
    roll REAL,
    pitch REAL,
    yaw REAL,
    ground_speed REAL,
    azimuth REAL,
    elevation REAL,
    hfov REAL,
    vfov REAL,
    FOREIGN KEY(mission_id) REFERENCES missions(id),
    FOREIGN KEY(platform_id) REFERENCES platforms(id)
);

CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    platform_id TEXT,
    timestamp INTEGER NOT NULL,
    source TEXT,
    latitude REAL,
    longitude REAL,
    grid_reference TEXT,
    status TEXT,
    notes TEXT,
    FOREIGN KEY(mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS mission_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    FOREIGN KEY(mission_id) REFERENCES missions(id)
);
