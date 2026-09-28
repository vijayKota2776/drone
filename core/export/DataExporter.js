const db = require('../../database');
const fs = require('fs');

class DataExporter {
    
    async exportMissionJSON(missionId, filePath) {
        const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(missionId);
        if (!mission) throw new Error('Mission not found');

        const waypoints = db.prepare('SELECT * FROM mission_waypoints WHERE missionId = ? ORDER BY sequence ASC').all(missionId);
        const telemetry = db.prepare('SELECT * FROM telemetry WHERE flightId = ? ORDER BY timestamp ASC').all(missionId);
        const observations = db.prepare('SELECT * FROM observations WHERE mission_id = ? ORDER BY timestamp ASC').all(missionId);

        const data = {
            mission,
            waypoints,
            telemetry,
            observations
        };

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    }

    async exportMissionCSV(missionId, exportDir) {
        const telemetry = db.prepare('SELECT * FROM telemetry WHERE flightId = ? ORDER BY timestamp ASC').all(missionId);
        const observations = db.prepare('SELECT * FROM observations WHERE mission_id = ? ORDER BY timestamp ASC').all(missionId);

        // Export Telemetry CSV
        if (telemetry.length > 0) {
            const telemetryHeaders = Object.keys(telemetry[0]).join(',') + '\n';
            const telemetryRows = telemetry.map(t => Object.values(t).join(',')).join('\n');
            fs.writeFileSync(`${exportDir}/mission_${missionId}_telemetry.csv`, telemetryHeaders + telemetryRows);
        }

        // Export Observations CSV
        if (observations.length > 0) {
            const obsHeaders = Object.keys(observations[0]).join(',') + '\n';
            const obsRows = observations.map(o => Object.values(o).join(',')).join('\n');
            fs.writeFileSync(`${exportDir}/mission_${missionId}_observations.csv`, obsHeaders + obsRows);
        }

        return true;
    }
}

module.exports = new DataExporter();
