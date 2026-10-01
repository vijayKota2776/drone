const EventEmitter = require('events');
const repo = require('./ReplayRepository');

class ReplayEngine extends EventEmitter {
    constructor() {
        super();
        this.flightId = null;
        this.telemetryData = [];
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        
        this.currentIndex = 0;
        this.startTime = 0;
        this.interval = null;
    }

    loadFlight(flightId) {
        this.stop();
        this.flightId = flightId;
        this.telemetryData = repo.getTelemetry(flightId);
        if (this.telemetryData.length === 0) {
            throw new Error('No telemetry found for this flight.');
        }
        this.currentIndex = 0;
        this.startTime = this.telemetryData[0].timestamp;
        console.log(`Replay Engine: Loaded flight ${flightId} with ${this.telemetryData.length} records.`);
        this._emitTelemetry();
    }

    play() {
        if (this.isPlaying || !this.flightId || this.currentIndex >= this.telemetryData.length - 1) return;
        this.isPlaying = true;
        this.emit('status', 'REPLAY_PLAYING');
        
        this._scheduleNext();
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearTimeout(this.interval);
        this.emit('status', 'REPLAY_PAUSED');
    }

    stop() {
        this.pause();
        this.currentIndex = 0;
        if (this.telemetryData.length > 0) {
            this._emitTelemetry();
        }
        this.emit('status', 'REPLAY_STOPPED');
    }

    seek(timestamp) {
        // Find closest index
        this.currentIndex = this.telemetryData.findIndex(t => t.timestamp >= timestamp);
        if (this.currentIndex === -1) this.currentIndex = this.telemetryData.length - 1;
        this._emitTelemetry();
    }

    setSpeed(speed) {
        this.playbackSpeed = speed;
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    _scheduleNext() {
        if (!this.isPlaying || this.currentIndex >= this.telemetryData.length - 1) {
            this.pause();
            return;
        }

        const current = this.telemetryData[this.currentIndex];
        const next = this.telemetryData[this.currentIndex + 1];
        
        const dt = (next.timestamp - current.timestamp) / this.playbackSpeed;
        
        this.interval = setTimeout(() => {
            this.currentIndex++;
            this._emitTelemetry();
            this._scheduleNext();
        }, Math.max(10, dt)); // Ensure we don't spam event loop if dt is very small
    }

    _emitTelemetry() {
        if (this.telemetryData.length === 0) return;
        const raw = this.telemetryData[this.currentIndex];
        
        // Re-construct the normalized telemetry object
        const telemetry = {
            timestamp: raw.timestamp,
            platformId: raw.platformId,
            position: {
                latitude: raw.latitude,
                longitude: raw.longitude,
                altitudeMSL: raw.altitude,
                relativeAltitude: raw.relativeAltitude !== null ? raw.relativeAltitude : undefined,
                gridReference: raw.gridReference
            },
            attitude: {
                roll: raw.roll,
                pitch: raw.pitch,
                yaw: raw.yaw
            },
            velocity: {
                groundSpeed: raw.groundSpeed,
                velocityX: raw.velocityX !== null ? raw.velocityX : undefined,
                velocityY: raw.velocityY !== null ? raw.velocityY : undefined,
                velocityZ: raw.velocityZ !== null ? raw.velocityZ : undefined
            },
            status: {
                satellites: raw.satellites !== null ? raw.satellites : undefined,
                battery: raw.battery !== null ? raw.battery : undefined,
                flightMode: raw.flightState !== null ? raw.flightState : undefined,
                flying: raw.flying !== null ? (raw.flying === 1) : undefined
            },
            sensor: {
                azimuth: 0,
                elevation: -45,
                hfov: 30,
                vfov: 20
            }
        };

        this.emit('telemetry', telemetry);
    }
}

module.exports = new ReplayEngine();
