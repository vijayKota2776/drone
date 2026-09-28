const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');

class RapheAdapter extends TelemetrySource {
    constructor(platformId = 'RAPHE-UAV-01') {
        super(platformId);
        this.udpSocket = null;
    }

    connect(config = { port: 7000, host: '0.0.0.0' }) {
        if (this.isConnected) this.disconnect();
        
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            // TODO: Parse Raphe proprietary packet structure here
        });

        this.udpSocket.on('listening', () => {
            console.log(`Raphe Adapter listening on UDP ${config.port}`);
            this.isConnected = true;
            this.emitStatus('RAPHE_CONNECTED');
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
        this.emitStatus('RAPHE_DISCONNECTED');
        console.log('Raphe Adapter Disconnected');
    }
}

module.exports = new RapheAdapter();
