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
                
                // Validate latitude/longitude before accepting packet
                if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number' || 
                    data.latitude === 0 || data.longitude === 0) {
                    return;
                }

                // If this is the first packet or recovering from lost telemetry
                if (this.status === 'TELEMETRY_LOST' || this.status === 'DJI_CONNECTED') {
                    this.emitStatus('TELEMETRY_RESTORED');
                }
                
                // Calculate ground speed from velocityX and velocityY if available
                let groundSpeed = 0;
                if (typeof data.velocityX === 'number' && typeof data.velocityY === 'number') {
                    groundSpeed = Math.sqrt(data.velocityX**2 + data.velocityY**2);
                }

                this.emitTelemetry({
                    position: {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        altitudeMSL: data.altitude || 0
                    },
                    attitude: {
                        yaw: data.heading || 0,
                        pitch: 0,
                        roll: 0
                    },
                    velocity: {
                        speed: groundSpeed
                    },
                    status: {
                        battery: data.battery || 100,
                        mode: data.flightState || 'UNKNOWN',
                        satellites: data.gpsSatellites || 0
                    },
                    platformId: this.platformId,
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
            this.emitStatus('DJI_CONNECTED');
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
        this.emitStatus('DJI_DISCONNECTED');
        console.log('DJI Adapter Disconnected');
    }
}

module.exports = new DJIAdapter();
