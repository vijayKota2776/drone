const db = require('../index');

class MissionRepository {
    createMission(mission) {
        const stmt = db.prepare(`
            INSERT INTO missions (id, name, description, created_at, started_at, ended_at, status)
            VALUES (@id, @name, @description, @created_at, @started_at, @ended_at, @status)
        `);
        return stmt.run(mission);
    }

    getMission(id) {
        const stmt = db.prepare('SELECT * FROM missions WHERE id = ?');
        return stmt.get(id);
    }

    getAllMissions() {
        const stmt = db.prepare('SELECT * FROM missions ORDER BY created_at DESC');
        return stmt.all();
    }

    updateMissionStatus(id, status, endedAt = null) {
        if (endedAt) {
            const stmt = db.prepare('UPDATE missions SET status = ?, ended_at = ? WHERE id = ?');
            return stmt.run(status, endedAt, id);
        } else {
            const stmt = db.prepare('UPDATE missions SET status = ? WHERE id = ?');
            return stmt.run(status, id);
        }
    }
}

module.exports = new MissionRepository();
