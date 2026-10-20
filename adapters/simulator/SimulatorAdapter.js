const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const coordinateEngine = require('../../core/coordinates/engine');

class SimulatorAdapter extends TelemetrySource {
    constructor() {
        super('Rdr 1');
        this.isRunning = false;
        this.interval = null;
        this.updateRateMs = 1000; // 1Hz default
        
        // Waypoints for Drone 1: Rdr 1 (DJI Matrice 300 RTK - Harbour Patrol Sector Alpha)
        this.waypoints = [
            { lat: 18.9220, lon: 72.8347 }, // A
            { lat: 18.9230, lon: 72.8350 }, // B
            { lat: 18.9235, lon: 72.8335 }, // C
            { lat: 18.9225, lon: 72.8330 }, // D
        ];
        this.currentWaypointIndex = 0;
        this.currentPos = { ...this.waypoints[0] };

        // Waypoints for Drone 2: Rdr 2 (DJI Air 2S - Coastal Recon Sector Bravo)
        this.waypoints2 = [
            { lat: 18.9205, lon: 72.8360 }, // E
            { lat: 18.9218, lon: 72.8375 }, // F
            { lat: 18.9202, lon: 72.8385 }, // G
            { lat: 18.9190, lon: 72.8365 }, // H
        ];
        this.currentWaypointIndex2 = 0;
        this.currentPos2 = { ...this.waypoints2[0] };

        this.speedMultiplier = 1.0;
        this.stepSize = 0.0001; // Approx 10 meters per update
        this.battery1 = 88;
        this.battery2 = 76;
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
        console.log(`Simulator loaded ${this.waypoints.length} waypoints for Rdr 1.`);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isConnected = true;
        this.interval = setInterval(() => this._tick(), this.updateRateMs / this.speedMultiplier);
        console.log('Multi-UAV Simulator started (Rdr 1: DJI Matrice 300 RTK & Rdr 2: DJI Air 2S)');
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
        this.currentWaypointIndex2 = 0;
        this.currentPos2 = { ...this.waypoints2[0] };
        this.battery1 = 88;
        this.battery2 = 76;
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
        // Step Drone 1 (Rdr 1)
        const target1 = this.waypoints[(this.currentWaypointIndex + 1) % this.waypoints.length];
        const dLat1 = target1.lat - this.currentPos.lat;
        const dLon1 = target1.lon - this.currentPos.lon;
        const dist1 = Math.sqrt(dLat1 * dLat1 + dLon1 * dLon1);

        if (dist1 < this.stepSize) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        } else {
            const ratio1 = this.stepSize / dist1;
            this.currentPos.lat += dLat1 * ratio1;
            this.currentPos.lon += dLon1 * ratio1;
        }

        // Step Drone 2 (Rdr 2)
        const target2 = this.waypoints2[(this.currentWaypointIndex2 + 1) % this.waypoints2.length];
        const dLat2 = target2.lat - this.currentPos2.lat;
        const dLon2 = target2.lon - this.currentPos2.lon;
        const dist2 = Math.sqrt(dLat2 * dLat2 + dLon2 * dLon2);

        if (dist2 < this.stepSize * 1.1) {
            this.currentWaypointIndex2 = (this.currentWaypointIndex2 + 1) % this.waypoints2.length;
        } else {
            const ratio2 = (this.stepSize * 1.1) / dist2;
            this.currentPos2.lat += dLat2 * ratio2;
            this.currentPos2.lon += dLon2 * ratio2;
        }

        this._emitSimTelemetry();
    }

    _emitSimTelemetry() {
        const now = Date.now();

        // 1. Telemetry for Feed 1 / Drone 1: Rdr 1 (DJI Matrice 300 RTK)
        this.emitTelemetry({
            timestamp: now,
            platformId: 'Rdr 1',
            model: 'DJI Matrice 300 RTK',
            position: {
                latitude: this.currentPos.lat,
                longitude: this.currentPos.lon,
                altitudeMSL: 120.0,
                relativeAltitude: 120.0,
                altitudeReference: 'takeoff',
                valid: true,
                gridReference: coordinateEngine.toMGRS(this.currentPos.lat, this.currentPos.lon)
            },
            attitude: {
                roll: 1.2,
                pitch: -2.1,
                yaw: 45
            },
            velocity: {
                groundSpeed: 14.2
            },
            status: {
                armed: this.isRunning,
                flightMode: 'AUTO_MISSION',
                battery: this.battery1,
                satellites: 18,
                positionValid: true,
                synthetic: false,
                model: 'DJI Matrice 300 RTK'
            }
        });

        // 2. Telemetry for Feed 2 / Drone 2: Rdr 2 (DJI Air 2S)
        this.emitTelemetry({
            timestamp: now,
            platformId: 'Rdr 2',
            model: 'DJI Air 2S',
            position: {
                latitude: this.currentPos2.lat,
                longitude: this.currentPos2.lon,
                altitudeMSL: 85.0,
                relativeAltitude: 85.0,
                altitudeReference: 'takeoff',
                valid: true,
                gridReference: coordinateEngine.toMGRS(this.currentPos2.lat, this.currentPos2.lon)
            },
            attitude: {
                roll: -0.6,
                pitch: 1.5,
                yaw: 135
            },
            velocity: {
                groundSpeed: 17.5
            },
            status: {
                armed: this.isRunning,
                flightMode: 'RECON_PATROL',
                battery: this.battery2,
                satellites: 16,
                positionValid: true,
                synthetic: false,
                model: 'DJI Air 2S'
            }
        });
    }
}

module.exports = new SimulatorAdapter();
