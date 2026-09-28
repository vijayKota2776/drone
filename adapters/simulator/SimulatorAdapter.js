const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const coordinateEngine = require('../../core/coordinates/engine');

class SimulatorAdapter extends TelemetrySource {
    constructor() {
        super('SIM-UAV-01');
        this.isRunning = false;
        this.interval = null;
        this.updateRateMs = 1000; // 1Hz default
        
        // Waypoints for our deterministic path (A -> B -> C -> D)
        this.waypoints = [
            { lat: 18.9220, lon: 72.8347 }, // A
            { lat: 18.9230, lon: 72.8350 }, // B
            { lat: 18.9235, lon: 72.8335 }, // C
            { lat: 18.9225, lon: 72.8330 }, // D
        ];
        
        this.currentWaypointIndex = 0;
        this.currentPos = { ...this.waypoints[0] };
        this.speedMultiplier = 1.0;
        this.stepSize = 0.0001; // Approx 10 meters per update
    }

    loadWaypoints(newWaypoints) {
        if (!newWaypoints || newWaypoints.length === 0) return;
        // Normalize lng to lon because the simulator engine uses 'lon'
        this.waypoints = newWaypoints.map(wp => ({
            lat: wp.lat || wp.latitude,
            lon: wp.lon || wp.lng || wp.longitude
        }));
        
        // Only reset position if we're not currently running
        if (!this.isRunning) {
            this.currentWaypointIndex = 0;
            this.currentPos = { ...this.waypoints[0] };
        }
        console.log(`Simulator loaded ${this.waypoints.length} waypoints.`);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isConnected = true;
        this.interval = setInterval(() => this._tick(), this.updateRateMs / this.speedMultiplier);
        console.log('Simulator started');
        this.emitStatus('RUNNING');
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.interval);
        console.log('Simulator paused');
        this.emitStatus('PAUSED');
    }

    reset() {
        this.pause();
        this.currentWaypointIndex = 0;
        this.currentPos = { ...this.waypoints[0] };
        this.isConnected = false;
        console.log('Simulator reset');
        this.emitStatus('STOPPED');
        this._emitSimTelemetry(); // Emit initial state
    }

    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(0.1, Math.min(multiplier, 10.0));
        if (this.isRunning) {
            // Restart interval with new speed
            this.pause();
            this.start();
        }
    }

    _tick() {
        const target = this.waypoints[(this.currentWaypointIndex + 1) % this.waypoints.length];
        
        // Calculate distance to target
        const dLat = target.lat - this.currentPos.lat;
        const dLon = target.lon - this.currentPos.lon;
        const distance = Math.sqrt(dLat * dLat + dLon * dLon);

        if (distance < this.stepSize) {
            // Reached waypoint, move to next
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        } else {
            // Interpolate towards target
            const ratio = this.stepSize / distance;
            this.currentPos.lat += dLat * ratio;
            this.currentPos.lon += dLon * ratio;
        }

        this._emitSimTelemetry();
    }

    _emitSimTelemetry() {
        this.emitTelemetry({
            timestamp: Date.now(),
            position: {
                latitude: this.currentPos.lat,
                longitude: this.currentPos.lon,
                altitudeMSL: 100.0,
                gridReference: coordinateEngine.toMGRS(this.currentPos.lat, this.currentPos.lon)
            },
            attitude: {
                roll: 0,
                pitch: 0,
                yaw: 45
            },
            velocity: {
                groundSpeed: 15.0
            },
            status: {
                armed: this.isRunning,
                flightMode: 'SIMULATED'
            }
        });
    }
}

module.exports = new SimulatorAdapter();
