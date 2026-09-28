const db = require('../../database');
const crypto = require('crypto');
const coordinateEngine = require('../coordinates/engine');

class MissionManager {
    saveMission(name, waypoints) {
        const missionId = `MISSION-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        try {
            db.prepare('BEGIN').run();
            
            // Insert mission record
            db.prepare(`
                INSERT INTO missions (id, name, createdAt) 
                VALUES (?, ?, ?)
            `).run(missionId, name || `Mission ${new Date().toLocaleTimeString()}`, Date.now());

            // Insert waypoints
            const insertWp = db.prepare(`
                INSERT INTO mission_waypoints (missionId, sequence, latitude, longitude, gridReference)
                VALUES (?, ?, ?, ?, ?)
            `);

            waypoints.forEach((wp, index) => {
                const mgrs = coordinateEngine.toMGRS(wp.lat, wp.lng);
                insertWp.run(missionId, index, wp.lat, wp.lng, mgrs);
            });

            db.prepare('COMMIT').run();
            console.log(`Mission ${missionId} saved with ${waypoints.length} waypoints.`);
            return missionId;
        } catch (error) {
            db.prepare('ROLLBACK').run();
            console.error('Failed to save mission:', error);
            throw error;
        }
    }

    getMissions() {
        return db.prepare('SELECT * FROM missions ORDER BY createdAt DESC').all();
    }

    getMissionWaypoints(missionId) {
        return db.prepare(`
            SELECT latitude as lat, longitude as lng, gridReference, sequence 
            FROM mission_waypoints 
            WHERE missionId = ? 
            ORDER BY sequence ASC
        `).all(missionId);
    }
}

module.exports = new MissionManager();
