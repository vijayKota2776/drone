const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const coordinateEngine = require('../../core/coordinates/engine');

class SimulatorAdapter extends TelemetrySource {
    constructor() {
        super('Rdr 1');
        this.isRunning = false;
        this.interval = null;
        this.updateRateMs = 1000; // 1Hz default
        
        // Waypoints for Drone 1: Rdr 1 (DJI Matrice 300 RTK - Bikaner Nal AFS Sector Alpha)
        this.waypoints = [
            { lat: 28.0708, lon: 73.2056 }, // Nal Air Force Station
            { lat: 28.0820, lon: 73.2200 }, // North Approach
            { lat: 28.0650, lon: 73.2350 }, // East Perimeter
            { lat: 28.0550, lon: 73.2100 }, // South Corridor
        ];
        this.currentWaypointIndex = 0;
        this.currentPos = { ...this.waypoints[0] };

        // Waypoints for Drone 2: Rdr 2 (DJI Air 2S - Suratgarh Air Station Sector Bravo)
        this.waypoints2 = [
            { lat: 29.3236, lon: 73.9039 }, // Suratgarh Military Station
            { lat: 29.3350, lon: 73.9180 }, // Forward Observation Point
            { lat: 29.3180, lon: 73.9250 }, // East Patrol
            { lat: 29.3100, lon: 73.9000 }, // Base Approach
        ];
        this.currentWaypointIndex2 = 0;
        this.currentPos2 = { ...this.waypoints2[0] };

        // Waypoints for Drone 3: Rdr 3 (Army Indigenous Tactical UAV - Anupgarh Border Sector Charlie)
        this.waypoints3 = [
            { lat: 29.1911, lon: 73.2106 }, // Anupgarh Tactical Base
            { lat: 29.2050, lon: 73.2300 }, // Border Surveillance Line
            { lat: 29.1800, lon: 73.2450 }, // South Sector
            { lat: 29.1750, lon: 73.2000 }, // Return Corridor
        ];
        this.currentWaypointIndex3 = 0;
        this.currentPos3 = { ...this.waypoints3[0] };

        this.speedMultiplier = 1.0;
        this.stepSize = 0.0001; // Approx 10 meters per update
        this.battery1 = 88;
        this.battery2 = 76;
        this.battery3 = 94;
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
        console.log('Multi-UAV Simulator started (Rdr 1: DJI Matrice 300 RTK | Rdr 2: DJI Air 2S | Rdr 3: Army Tactical UAV)');
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
        this.currentWaypointIndex3 = 0;
        this.currentPos3 = { ...this.waypoints3[0] };
        this.battery1 = 88;
        this.battery2 = 76;
        this.battery3 = 94;
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
        // Step Drone 1 (Rdr 1 - DJI Matrice)
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

        // Step Drone 2 (Rdr 2 - DJI Air 2S)
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

        // Step Drone 3 (Rdr 3 - Army Made Drone)
        const target3 = this.waypoints3[(this.currentWaypointIndex3 + 1) % this.waypoints3.length];
        const dLat3 = target3.lat - this.currentPos3.lat;
        const dLon3 = target3.lon - this.currentPos3.lon;
        const dist3 = Math.sqrt(dLat3 * dLat3 + dLon3 * dLon3);

        if (dist3 < this.stepSize * 1.2) {
            this.currentWaypointIndex3 = (this.currentWaypointIndex3 + 1) % this.waypoints3.length;
        } else {
            const ratio3 = (this.stepSize * 1.2) / dist3;
            this.currentPos3.lat += dLat3 * ratio3;
            this.currentPos3.lon += dLon3 * ratio3;
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

        // 3. Telemetry for Feed 3 / Drone 3: Rdr 3 (Army Made Drone - Indigenous Mil-UAV)
        this.emitTelemetry({
            timestamp: now,
            platformId: 'Rdr 3',
            model: 'Army Indigenous Tactical UAV',
            position: {
                latitude: this.currentPos3.lat,
                longitude: this.currentPos3.lon,
                altitudeMSL: 155.0,
                relativeAltitude: 155.0,
                altitudeReference: 'takeoff',
                valid: true,
                gridReference: coordinateEngine.toMGRS(this.currentPos3.lat, this.currentPos3.lon)
            },
            attitude: {
                roll: 0.8,
                pitch: -1.0,
                yaw: 220
            },
            velocity: {
                groundSpeed: 21.0
            },
            status: {
                armed: this.isRunning,
                flightMode: 'TACTICAL_SURVEILLANCE',
                battery: this.battery3,
                satellites: 22,
                positionValid: true,
                synthetic: false,
                model: 'Army Indigenous Tactical UAV'
            }
        });
    }
}

module.exports = new SimulatorAdapter();
