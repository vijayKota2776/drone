const db = require('../index');

class ObservationRepository {
    createObservation(observation) {
        const stmt = db.prepare(`
            INSERT INTO observations (
                id, mission_id, platform_id, timestamp, 
                source, latitude, longitude, 
                grid_reference, status, notes
            ) VALUES (
                @id, @mission_id, @platform_id, @timestamp, 
                @source, @latitude, @longitude, 
                @grid_reference, @status, @notes
            )
        `);
        return stmt.run(observation);
    }

    getObservationsForMission(missionId) {
        const stmt = db.prepare('SELECT * FROM observations WHERE mission_id = ? ORDER BY timestamp DESC');
        return stmt.all(missionId);
    }
}

module.exports = new ObservationRepository();
