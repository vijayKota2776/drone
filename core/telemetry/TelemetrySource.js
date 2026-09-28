const EventEmitter = require('events');
const mgrs = require('mgrs');
/**
 * Base class for all telemetry sources (Simulator, MAVLink, etc)
 * Enforces a normalized telemetry object format.
 */
class TelemetrySource extends EventEmitter {
    constructor(platformId) {
        super();
        this.platformId = platformId;
        this.isConnected = false;
    }

    connect() {
        throw new Error('connect() must be implemented by subclass');
    }

    disconnect() {
        throw new Error('disconnect() must be implemented by subclass');
    }

    /**
     * Subclasses must call this to emit normalized telemetry
     */
    emitTelemetry(data) {
        // Enforce normalized structure
        const normalized = {
            timestamp: data.timestamp || Date.now(),
            platformId: this.platformId,
            position: {
                latitude: data.position?.latitude || 0,
                longitude: data.position?.longitude || 0,
                altitudeMSL: data.position?.altitudeMSL || 0,
                gridReference: data.position?.gridReference || (data.position?.latitude && data.position?.longitude ? mgrs.forward([data.position.longitude, data.position.latitude]) : null)
            },
            attitude: {
                roll: data.attitude?.roll || 0,
                pitch: data.attitude?.pitch || 0,
                yaw: data.attitude?.yaw || 0
            },
            velocity: {
                groundSpeed: data.velocity?.groundSpeed || 0
            },
            status: {
                connected: this.isConnected,
                armed: data.status?.armed || false,
                flightMode: data.status?.flightMode || 'UNKNOWN'
            }
        };

        this.emit('telemetry', normalized);
    }

    emitStatus(statusStr) {
        this.emit('status', statusStr);
    }
}

module.exports = TelemetrySource;
