const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');

class DJIAdapter extends TelemetrySource {
    constructor(platformId = 'DJI-UAV-01') {
        super(platformId);
        this.udpSocket = null;
    }

    connect(config = { port: 8000, host: '0.0.0.0' }) {
        if (this.isConnected) this.disconnect();
        
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            try {
                // Parse the DJI SDK JSON format provided by the client's mobile app relay
                const data = JSON.parse(msg.toString());
                
                if (data.position && data.position.latitude && data.position.longitude) {
                    this.emitTelemetry({
                        position: {
                            latitude: data.position.latitude,
                            longitude: data.position.longitude,
                            altitudeMSL: data.position.altitude_m || 0
                        },
                        attitude: {
                            yaw: data.attitude?.yaw_deg || 0,
                            pitch: data.attitude?.pitch_deg || 0,
                            roll: data.attitude?.roll_deg || 0
                        },
                        velocity: {
                            speed: data.velocity?.speed_mps || 0
                        },
                        status: {
                            battery: data.status?.battery_percent || 100,
                            mode: data.status?.flight_mode || 'UNKNOWN',
                            satellites: data.status?.gps_satellites || 0
                        },
                        platformId: data.drone_id || this.platformId,
                        timestamp: data.timestamp || Date.now()
                    });
                }
            } catch (err) {
                console.error("DJI Adapter Error parsing payload:", err.message);
            }
        });

        this.udpSocket.on('listening', () => {
            console.log(`DJI Adapter listening on UDP ${config.port}`);
            this.isConnected = true;
            this.emitStatus('DJI_CONNECTED');
        });

        this.udpSocket.on('error', (err) => {
            console.error(`DJI Adapter Socket Error: ${err.message}`);
            this.disconnect();
        });

        this.udpSocket.bind(config.port, config.host);
    }

    disconnect() {
        if (!this.isConnected) return;
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
