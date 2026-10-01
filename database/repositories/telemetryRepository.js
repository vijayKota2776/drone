const db = require('../index');

class TelemetryRepository {
    insertTelemetry(telemetry) {
        const stmt = db.prepare(`
            INSERT INTO telemetry (
                flight_id, platform_id, timestamp, 
                latitude, longitude, altitude_m, relative_altitude_m,
                roll_deg, pitch_deg, yaw_deg, heading_deg, speed_mps,
                velocity_x_mps, velocity_y_mps, velocity_z_mps,
                gps_satellites, battery_percent, flight_state, flying
            ) VALUES (
                @flight_id, @platform_id, @timestamp, 
                @latitude, @longitude, @altitude_m, @relative_altitude_m,
                @roll_deg, @pitch_deg, @yaw_deg, @heading_deg, @speed_mps,
                @velocity_x_mps, @velocity_y_mps, @velocity_z_mps,
                @gps_satellites, @battery_percent, @flight_state, @flying
            )
        `);
        return stmt.run(telemetry);
    }

    getTelemetryForFlight(flightId) {
        const stmt = db.prepare('SELECT * FROM telemetry WHERE flight_id = ? ORDER BY timestamp ASC');
        return stmt.all(flightId);
    }

    getClosestTelemetry(flightId, targetTimestamp) {
        // Find the telemetry record with the timestamp closest to the target timestamp
        const stmt = db.prepare(`
            SELECT * FROM telemetry 
            WHERE flight_id = ? 
            ORDER BY ABS(timestamp - ?) ASC 
            LIMIT 1
        `);
        return stmt.get(flightId, targetTimestamp);
    }
}

module.exports = new TelemetryRepository();
