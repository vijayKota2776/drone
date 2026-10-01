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
                flightId, timestamp, platformId, latitude, longitude, altitude, relativeAltitude, gridReference, yaw, pitch, roll, groundSpeed,
                velocityX, velocityY, velocityZ, satellites, battery, flightState, flying
            ) VALUES (
                @flightId, @timestamp, @platformId, @latitude, @longitude, @altitude, @relativeAltitude, @gridReference, @yaw, @pitch, @roll, @groundSpeed,
                @velocityX, @velocityY, @velocityZ, @satellites, @battery, @flightState, @flying
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
                relativeAltitude: data.position.relativeAltitude !== undefined ? data.position.relativeAltitude : null,
                gridReference: data.position.gridReference || null,
                yaw: data.attitude.yaw,
                pitch: data.attitude.pitch,
                roll: data.attitude.roll,
                groundSpeed: data.velocity.groundSpeed,
                velocityX: data.velocity.velocityX !== undefined ? data.velocity.velocityX : null,
                velocityY: data.velocity.velocityY !== undefined ? data.velocity.velocityY : null,
                velocityZ: data.velocity.velocityZ !== undefined ? data.velocity.velocityZ : null,
                satellites: data.status.satellites !== undefined ? data.status.satellites : null,
                battery: data.status.battery !== undefined ? data.status.battery : null,
                flightState: data.status.flightMode !== undefined ? data.status.flightMode : null,
                flying: data.status.flying !== undefined ? (data.status.flying ? 1 : 0) : null
            });
        } catch (err) {
            console.error('Failed to log telemetry to DB:', err);
        }
    }
}

module.exports = new TelemetryLogger();
