const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');

class AsteriaAdapter extends TelemetrySource {
    constructor(platformId = 'ASTERIA-UAV-01') {
        super(platformId);
        this.udpSocket = null;
    }

    connect(config = { port: 5000, host: '0.0.0.0' }) {
        if (this.isConnected) this.disconnect();
        
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            // TODO: Parse Asteria proprietary packet structure here
            // Example:
            // const decoded = parseAsteriaPacket(msg);
            // this.emitTelemetry({
            //     position: { latitude: decoded.lat, longitude: decoded.lon, altitudeMSL: decoded.alt },
            //     ...
            // });
        });

        this.udpSocket.on('listening', () => {
            console.log(`Asteria Adapter listening on UDP ${config.port}`);
            this.isConnected = true;
            this.emitStatus('ASTERIA_CONNECTED');
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
        this.emitStatus('ASTERIA_DISCONNECTED');
        console.log('Asteria Adapter Disconnected');
    }
}

module.exports = new AsteriaAdapter();
