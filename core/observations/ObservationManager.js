const db = require('../../database');
const crypto = require('crypto');

class ObservationManager {
    saveObservation(data) {
        const stmt = db.prepare(`
            INSERT INTO observations 
            (id, mission_id, platform_id, timestamp, source, latitude, longitude, grid_reference, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const id = data.id || crypto.randomUUID();
        stmt.run(
            id,
            data.missionId || 'N/A',
            data.platformId || 'SIM-1',
            data.timestamp || Date.now(),
            data.source || 'MANUAL',
            data.latitude,
            data.longitude,
            data.gridReference,
            data.status || 'OBSERVED',
            data.notes || ''
        );
        return id;
    }

    getObservations() {
        return db.prepare('SELECT * FROM observations ORDER BY timestamp DESC').all();
    }
}

module.exports = new ObservationManager();
