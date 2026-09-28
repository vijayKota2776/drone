const db = require('../../database');
const crypto = require('crypto');

class TelemetryLogger {
    constructor() {
        this.isRecording = false;
        this.currentFlightId = null;
        
        this.insertFlightStmt = db.prepare(`
            INSERT INTO flight_records (id, name, startTime) VALUES (@id, @name, @startTime)
        `);
        
        this.updateFlightEndStmt = db.prepare(`
            UPDATE flight_records SET endTime = @endTime WHERE id = @id
        `);

        // Pre-compile the insert statement for max performance
        this.insertStmt = db.prepare(`
            INSERT INTO telemetry (
                flightId, timestamp, platformId, latitude, longitude, altitude, gridReference, yaw, pitch, roll, groundSpeed
            ) VALUES (
                @flightId, @timestamp, @platformId, @latitude, @longitude, @altitude, @gridReference, @yaw, @pitch, @roll, @groundSpeed
            )
        `);
    }

    startRecording() {
        if (this.isRecording) return;
        this.currentFlightId = `FLIGHT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        try {
            this.insertFlightStmt.run({
                id: this.currentFlightId,
                name: `Recorded Flight ${new Date().toISOString()}`,
                startTime: Date.now()
            });
            this.isRecording = true;
            console.log(`Telemetry Logger: Recording STARTED (Flight ID: ${this.currentFlightId})`);
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    }

    stopRecording() {
        if (!this.isRecording) return;
        try {
            this.updateFlightEndStmt.run({
                id: this.currentFlightId,
                endTime: Date.now()
            });
        } catch (err) {
            console.error('Failed to update flight end time:', err);
        }
        this.isRecording = false;
        this.currentFlightId = null;
        console.log('Telemetry Logger: Recording STOPPED');
    }

    logTelemetry(data) {
        if (!this.isRecording || !data || !this.currentFlightId) return;

        try {
            this.insertStmt.run({
                flightId: this.currentFlightId,
                timestamp: data.timestamp,
                platformId: data.platformId,
                latitude: data.position.latitude,
                longitude: data.position.longitude,
                altitude: data.position.altitudeMSL,
                gridReference: data.position.gridReference || null,
                yaw: data.attitude.yaw,
                pitch: data.attitude.pitch,
                roll: data.attitude.roll,
                groundSpeed: data.velocity.groundSpeed
            });
        } catch (err) {
            console.error('Failed to log telemetry to DB:', err);
        }
    }
}

module.exports = new TelemetryLogger();
