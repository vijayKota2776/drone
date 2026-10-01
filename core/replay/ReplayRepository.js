const db = require('../../database');

class ReplayRepository {
    getFlights() {
        return db.prepare('SELECT * FROM flight_records ORDER BY startTime DESC').all();
    }

    getFlight(flightId) {
        return db.prepare('SELECT * FROM flight_records WHERE id = ?').get(flightId);
    }

    getTelemetry(flightId) {
        return db.prepare('SELECT * FROM telemetry WHERE flight_id = ? ORDER BY timestamp ASC').all(flightId);
    }
}

module.exports = new ReplayRepository();
