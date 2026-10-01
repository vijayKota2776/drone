const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cop_database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS flight_records (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    startTime INTEGER NOT NULL,
    endTime INTEGER
  );

  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id TEXT,
    timestamp INTEGER NOT NULL,
    platform_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude_m REAL NOT NULL,
    relative_altitude_m REAL,
    heading_deg REAL,
    yaw_deg REAL,
    pitch_deg REAL,
    roll_deg REAL,
    speed_mps REAL,
    velocity_x_mps REAL,
    velocity_y_mps REAL,
    velocity_z_mps REAL,
    gps_satellites INTEGER,
    battery_percent INTEGER,
    flight_state TEXT,
    flying INTEGER
  );

  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mission_waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    missionId TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    gridReference TEXT,
    FOREIGN KEY(missionId) REFERENCES missions(id) ON DELETE CASCADE
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
    notes TEXT
  );
`);

// Attempt to add columns to existing table if it was created before
const addCol = (col, type) => { try { db.exec(`ALTER TABLE telemetry ADD COLUMN ${col} ${type};`); } catch(e) {} };
addCol('flight_id', 'TEXT');
addCol('platform_id', 'TEXT');
addCol('altitude_m', 'REAL');
addCol('relative_altitude_m', 'REAL');
addCol('heading_deg', 'REAL');
addCol('yaw_deg', 'REAL');
addCol('pitch_deg', 'REAL');
addCol('roll_deg', 'REAL');
addCol('speed_mps', 'REAL');
addCol('velocity_x_mps', 'REAL');
addCol('velocity_y_mps', 'REAL');
addCol('velocity_z_mps', 'REAL');
addCol('gps_satellites', 'INTEGER');
addCol('battery_percent', 'INTEGER');
addCol('flight_state', 'TEXT');
addCol('flying', 'INTEGER');

module.exports = db;
