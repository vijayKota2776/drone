const db = require('../index');

class TelemetryRepository {
    insertTelemetry(telemetry) {
        const stmt = db.prepare(`
            INSERT INTO telemetry (
                mission_id, platform_id, timestamp, 
                latitude, longitude, altitude_msl, 
                roll, pitch, yaw, ground_speed, 
                azimuth, elevation, hfov, vfov
            ) VALUES (
                @mission_id, @platform_id, @timestamp, 
                @latitude, @longitude, @altitude_msl, 
                @roll, @pitch, @yaw, @ground_speed, 
                @azimuth, @elevation, @hfov, @vfov
            )
        `);
        return stmt.run(telemetry);
    }

    getTelemetryForMission(missionId) {
        const stmt = db.prepare('SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp ASC');
        return stmt.all(missionId);
    }

    getClosestTelemetry(missionId, targetTimestamp) {
        // Find the telemetry record with the timestamp closest to the target timestamp
        const stmt = db.prepare(`
            SELECT * FROM telemetry 
            WHERE mission_id = ? 
            ORDER BY ABS(timestamp - ?) ASC 
            LIMIT 1
        `);
        return stmt.get(missionId, targetTimestamp);
    }
}

module.exports = new TelemetryRepository();
