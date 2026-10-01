const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');

class DJIAdapter extends TelemetrySource {
    constructor(platformId = 'DJI-UAV-01') {
        super(platformId);
        this.udpSocket = null;
        this.timeoutTimer = null;
        this.timeoutMs = 3000;
    }

    connect(config = { port: 8000, host: '0.0.0.0', timeout: 3000 }) {
        if (this.isConnected) this.disconnect();
        
        this.timeoutMs = config.timeout || 3000;
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            try {
                // Log raw received JSON for debugging as requested by client
                const rawJson = msg.toString();
                // console.log(`DJI Raw JSON: ${rawJson}`); 

                const data = JSON.parse(rawJson);
                
                // Validate schema version
                if (data.schema_version !== 1) {
                    console.warn(`Unsupported schema version: ${data.schema_version}`);
                    return;
                }

                // Validate latitude/longitude range
                if (!isFinite(data.latitude) || data.latitude < -90 || data.latitude > 90 ||
                    !isFinite(data.longitude) || data.longitude < -180 || data.longitude > 180) {
                    return; // Ignore invalid packets silently without crashing
                }

                // If this is the first packet or recovering from lost telemetry
                if (this.status !== 'TELEMETRY_RECEIVED') {
                    this.status = 'TELEMETRY_RECEIVED';
                    this.emitStatus('TELEMETRY_RECEIVED');
                }
                
                // Calculate ground speed from velocityX and velocityY if available
                let groundSpeed = 0;
                let velX = data.velocity_x_mps !== undefined ? data.velocity_x_mps : (data.velocityX || 0);
                let velY = data.velocity_y_mps !== undefined ? data.velocity_y_mps : (data.velocityY || 0);
                let velZ = data.velocity_z_mps !== undefined ? data.velocity_z_mps : (data.velocityZ || 0);
                
                if (velX !== 0 || velY !== 0) {
                    groundSpeed = Math.sqrt(velX**2 + velY**2);
                }

                this.emitTelemetry({
                    position: {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        altitudeMSL: data.altitude_m !== undefined ? data.altitude_m : (data.altitude || 0),
                        relativeAltitude: data.relative_altitude_m !== undefined ? data.relative_altitude_m : (data.relativeAltitude || 0)
                    },
                    attitude: {
                        yaw: data.yaw_deg !== undefined ? data.yaw_deg : (data.heading_deg || data.heading || 0),
                        pitch: data.pitch_deg || 0,
                        roll: data.roll_deg || 0
                    },
                    velocity: {
                        groundSpeed: data.speed_mps !== undefined ? data.speed_mps : groundSpeed,
                        velocityX: velX,
                        velocityY: velY,
                        velocityZ: velZ
                    },
                    status: {
                        battery: data.battery_percent !== undefined ? data.battery_percent : (data.battery || 100),
                        flightMode: data.flight_state || data.flightState || 'UNKNOWN',
                        satellites: data.gps_satellites !== undefined ? data.gps_satellites : (data.gpsSatellites || 0)
                    },
                    platformId: data.drone_id || this.platformId,
                    timestamp: data.timestamp || Date.now()
                });

                this.resetTimeout();

            } catch (err) {
                // Reject malformed JSON and log the error without crashing
                console.error("DJI Adapter Error parsing payload:", err.message);
            }
        });

        this.udpSocket.on('listening', () => {
            console.log(`DJI Adapter listening on UDP ${config.host || '0.0.0.0'}:${config.port}`);
            this.isConnected = true;
            this.status = 'UDP_LISTENER_ACTIVE';
            this.emitStatus('UDP_LISTENER_ACTIVE');
            this.resetTimeout();
        });

        this.udpSocket.on('error', (err) => {
            console.error(`DJI Adapter Socket Error: ${err.message}`);
            this.disconnect();
        });

        this.udpSocket.bind(config.port, config.host || '0.0.0.0');
    }

    resetTimeout() {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
        }
        this.timeoutTimer = setTimeout(() => {
            if (this.isConnected) {
                this.status = 'TELEMETRY_LOST';
                this.emitStatus('TELEMETRY_LOST');
                console.log('DJI Telemetry Lost - no packets received');
            }
        }, this.timeoutMs);
    }

    disconnect() {
        if (!this.isConnected) return;
        
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }

        if (this.udpSocket) {
            this.udpSocket.close();
            this.udpSocket = null;
        }
        this.isConnected = false;
        this.status = 'DISCONNECTED';
        this.emitStatus('DISCONNECTED');
        console.log('DJI Adapter Disconnected');
    }
}

module.exports = new DJIAdapter();
